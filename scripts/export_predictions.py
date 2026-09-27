"""
Backtest export: score every 2025-season test game with both trained models
and export a track-record dataset for the React Predictions page.

Trains on the FULL historical range (1999-2024) rather than just 2021-2024,
based on a validated comparison showing full history performs slightly better.
See scripts/compare_historical_window.py for that experiment.

Run from project root:
    python scripts/export_predictions.py
"""

import os
import json
import pandas as pd
from google.cloud import bigquery
from google.oauth2 import service_account
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier

PROJECT_ID = "nfl-analytics-505917"
BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
CREDENTIALS_PATH = os.path.join(BASE_DIR, "credentials.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "predictions-app", "public", "data")

FEATURES = [
    "home_trailing_off_epa",
    "home_trailing_def_epa_allowed",
    "home_trailing_off_success_rate",
    "away_trailing_off_epa",
    "away_trailing_def_epa_allowed",
    "away_trailing_off_success_rate",
]
TARGET = "home_team_won"


def get_client():
    credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
    return bigquery.Client(credentials=credentials, project=PROJECT_ID)


def run_query(client, sql):
    return client.query(sql).to_dataframe()


def build_team_week_stats(client):
    """Combines historical (1999-2020) and recent (2021+) raw play-by-play into
    one team-week table with offensive EPA, defensive EPA allowed, and success rate."""
    sql = f"""
    WITH all_pbp AS (
        SELECT season, week, season_type, posteam, defteam, epa, success, play_type
        FROM `{PROJECT_ID}.nfl_raw.pbp_historical`
        UNION ALL
        SELECT season, week, season_type, posteam, defteam, epa, success, play_type
        FROM `{PROJECT_ID}.nfl_raw.pbp`
    ),
    offense AS (
        SELECT season, week, posteam AS team,
               COUNT(*) AS off_plays,
               SUM(epa) AS off_total_epa,
               AVG(success) AS off_success_rate
        FROM all_pbp
        WHERE season_type = 'REG' AND posteam IS NOT NULL AND epa IS NOT NULL
          AND play_type IN ('pass', 'run')
        GROUP BY season, week, posteam
    ),
    defense AS (
        SELECT season, week, defteam AS team,
               COUNT(*) AS def_plays,
               SUM(epa) AS def_total_epa_allowed
        FROM all_pbp
        WHERE season_type = 'REG' AND defteam IS NOT NULL AND epa IS NOT NULL
          AND play_type IN ('pass', 'run')
        GROUP BY season, week, defteam
    )
    SELECT
        o.season, o.week, o.team,
        o.off_plays, o.off_total_epa, o.off_success_rate,
        d.def_plays, d.def_total_epa_allowed
    FROM offense o
    JOIN defense d ON o.season = d.season AND o.week = d.week AND o.team = d.team
    ORDER BY o.season, o.week, o.team
    """
    return run_query(client, sql)


def build_games(client):
    """Combines historical and recent schedules into one games table."""
    sql = f"""
    SELECT season, week, home_team, away_team, home_score, away_score
    FROM `{PROJECT_ID}.nfl_raw.schedules_historical`
    WHERE game_type = 'REG'
    UNION ALL
    SELECT season, week, home_team, away_team, home_score, away_score
    FROM `{PROJECT_ID}.nfl_raw.schedules`
    WHERE game_type = 'REG'
    ORDER BY season, week
    """
    return run_query(client, sql)


def add_trailing_features(team_week: pd.DataFrame, window: int = 4) -> pd.DataFrame:
    team_week = team_week.sort_values(["team", "season", "week"]).copy()
    team_week["off_epa_per_play"] = team_week["off_total_epa"] / team_week["off_plays"]
    team_week["def_epa_per_play_allowed"] = team_week["def_total_epa_allowed"] / team_week["def_plays"]

    def trailing(group):
        group = group.copy()
        group["trailing_off_epa"] = group["off_epa_per_play"].shift(1).rolling(window, min_periods=1).mean()
        group["trailing_def_epa_allowed"] = group["def_epa_per_play_allowed"].shift(1).rolling(window, min_periods=1).mean()
        group["trailing_off_success_rate"] = group["off_success_rate"].shift(1).rolling(window, min_periods=1).mean()
        return group

    return team_week.groupby("team", group_keys=False).apply(trailing)


def build_training_set(games: pd.DataFrame, team_week: pd.DataFrame) -> pd.DataFrame:
    feat_cols = ["season", "week", "team", "trailing_off_epa", "trailing_def_epa_allowed", "trailing_off_success_rate"]
    feat = team_week[feat_cols]

    df = games.merge(
        feat.rename(columns={
            "team": "home_team",
            "trailing_off_epa": "home_trailing_off_epa",
            "trailing_def_epa_allowed": "home_trailing_def_epa_allowed",
            "trailing_off_success_rate": "home_trailing_off_success_rate",
        }),
        on=["season", "week", "home_team"], how="inner",
    )
    df = df.merge(
        feat.rename(columns={
            "team": "away_team",
            "trailing_off_epa": "away_trailing_off_epa",
            "trailing_def_epa_allowed": "away_trailing_def_epa_allowed",
            "trailing_off_success_rate": "away_trailing_off_success_rate",
        }),
        on=["season", "week", "away_team"], how="inner",
    )

    required = FEATURES + ["home_score", "away_score"]
    df = df.dropna(subset=required)
    df["home_team_won"] = (df["home_score"] > df["away_score"]).astype(int)
    return df


def confidence_tier(prob):
    if prob >= 0.70:
        return "High"
    elif prob >= 0.60:
        return "Medium"
    return "Low"


def main():
    client = get_client()

    print("Building combined team-week stats (historical + recent)...")
    team_week = build_team_week_stats(client)
    team_week = add_trailing_features(team_week)

    print("Building game-level training set...")
    games = build_games(client)
    df = build_training_set(games, team_week)
    print(f"  {len(df):,} usable games, seasons {int(df['season'].min())}-{int(df['season'].max())}")

    train = df[df["season"] < 2025]
    test = df[df["season"] == 2025].copy()

    X_train, y_train = train[FEATURES], train[TARGET]
    X_test = test[FEATURES]

    print(f"Training on {len(train):,} games (full history: 1999-2024)...")
    log_model = LogisticRegression(max_iter=1000)
    log_model.fit(X_train, y_train)

    xgb_model = XGBClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.05,
        random_state=42, eval_metric="logloss",
    )
    xgb_model.fit(X_train, y_train)

    test["log_home_prob"] = log_model.predict_proba(X_test)[:, 1]
    test["xgb_home_prob"] = xgb_model.predict_proba(X_test)[:, 1]

    games_out = []
    correct = 0
    for _, row in test.sort_values("week", ascending=False).iterrows():
        xgb_home_prob = float(row["xgb_home_prob"])
        xgb_away_prob = 1 - xgb_home_prob
        log_home_prob = float(row["log_home_prob"])

        pick = row["home_team"] if xgb_home_prob >= 0.5 else row["away_team"]
        actual_winner = row["home_team"] if row["home_team_won"] == 1 else row["away_team"]
        was_correct = bool(pick == actual_winner)
        if was_correct:
            correct += 1

        margin = round(abs(xgb_home_prob - 0.5) * 100)
        confidence = confidence_tier(max(xgb_home_prob, xgb_away_prob))

        games_out.append({
            "home": row["home_team"],
            "away": row["away_team"],
            "week": int(row["week"]),
            "season": int(row["season"]),
            "home_score": int(row["home_score"]),
            "away_score": int(row["away_score"]),
            "actual_winner": actual_winner,
            "pick": pick,
            "correct": was_correct,
            "confidence": confidence,
            "prob": {"home": xgb_home_prob, "away": xgb_away_prob},
            "verdict": {
                "text": f"{pick} favored",
                "margin": margin,
            },
            "features": {
                "home_trailing_off_epa": float(row["home_trailing_off_epa"]),
                "home_trailing_def_epa": float(row["home_trailing_def_epa_allowed"]),
                "away_trailing_off_epa": float(row["away_trailing_off_epa"]),
                "away_trailing_def_epa": float(row["away_trailing_def_epa_allowed"]),
            },
            "components": {
                "logistic": {"home": log_home_prob, "away": 1 - log_home_prob},
                "xgboost": {"home": xgb_home_prob, "away": xgb_away_prob},
            },
        })

    accuracy = correct / len(test)

    payload = {
        "season": 2025,
        "total_games": len(test),
        "correct": correct,
        "accuracy": accuracy,
        "games": games_out,
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "predictions.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {out_path} ({len(games_out)} games, {accuracy:.1%} accuracy)")


if __name__ == "__main__":
    main()