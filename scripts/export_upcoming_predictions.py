"""
Generate live predictions for the next unplayed NFL week.

Trains on the FULL historical range (1999+) rather than just the dbt mart's
2021+ coverage. See scripts/compare_historical_window.py for the experiment
that validated this change.

Run after each weekly data refresh:
    python scripts/export_upcoming_predictions.py
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
    df = run_query(client, sql)
    df["off_epa_per_play"] = df["off_total_epa"] / df["off_plays"]
    df["def_epa_per_play_allowed"] = df["def_total_epa_allowed"] / df["def_plays"]
    return df


def build_all_games(client):
    """Combines historical and recent schedules into one games table (played games only,
    since rows with null scores get dropped later when building the training set)."""
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

    def trailing(group):
        group = group.copy()
        group["trailing_off_epa"] = group["off_epa_per_play"].shift(1).rolling(window, min_periods=1).mean()
        group["trailing_def_epa_allowed"] = group["def_epa_per_play_allowed"].shift(1).rolling(window, min_periods=1).mean()
        group["trailing_off_success_rate"] = group["off_success_rate"].shift(1).rolling(window, min_periods=1).mean()
        return group

    return team_week.groupby("team", group_keys=False).apply(trailing)


def build_training_set(all_games: pd.DataFrame, team_week_trailing: pd.DataFrame) -> pd.DataFrame:
    feat_cols = ["season", "week", "team", "trailing_off_epa", "trailing_def_epa_allowed", "trailing_off_success_rate"]
    feat = team_week_trailing[feat_cols]

    df = all_games.merge(
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


def get_current_form(team_week: pd.DataFrame, team: str):
    """Average of a team's last 4 completed weeks, regardless of season boundary —
    same idea as before, now sourced from the full combined historical + recent table."""
    rows = team_week[team_week["team"] == team].sort_values(["season", "week"], ascending=False).head(4)
    if rows.empty:
        return None
    return {
        "off_epa": float(rows["off_epa_per_play"].mean()),
        "def_epa": float(rows["def_epa_per_play_allowed"].mean()),
        "off_success": float(rows["off_success_rate"].mean()),
    }


def main():
    client = get_client()

    next_week = run_query(client, f"""
        SELECT season, week
        FROM `{PROJECT_ID}.nfl_raw.schedules`
        WHERE home_score IS NULL
        ORDER BY season, week
        LIMIT 1
    """)
    if next_week.empty:
        print("No upcoming games found in the schedule — nothing to predict yet.")
        return

    season = int(next_week.iloc[0]["season"])
    week = int(next_week.iloc[0]["week"])
    print(f"Next unplayed week: {season} Week {week}")

    upcoming_games_df = run_query(client, f"""
        SELECT home_team, away_team, gameday, gametime
        FROM `{PROJECT_ID}.nfl_raw.schedules`
        WHERE season = {season} AND week = {week} AND home_score IS NULL
        ORDER BY gameday, gametime
    """)

    print("Building combined team-week stats (historical + recent)...")
    team_week = build_team_week_stats(client)
    team_week_trailing = add_trailing_features(team_week)

    print("Training models on all completed history (1999+)...")
    all_games = build_all_games(client)
    train_df = build_training_set(all_games, team_week_trailing)
    X_train, y_train = train_df[FEATURES], train_df[TARGET]
    print(f"  Training on {len(train_df):,} games, seasons {int(train_df['season'].min())}-{int(train_df['season'].max())}")

    log_model = LogisticRegression(max_iter=1000)
    log_model.fit(X_train, y_train)

    xgb_model = XGBClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.05,
        random_state=42, eval_metric="logloss",
    )
    xgb_model.fit(X_train, y_train)

    games_out = []
    for _, row in upcoming_games_df.iterrows():
        home_form = get_current_form(team_week, row["home_team"])
        away_form = get_current_form(team_week, row["away_team"])
        if not home_form or not away_form:
            print(f"Skipping {row['home_team']} vs {row['away_team']} — not enough trailing history yet.")
            continue

        feat_row = pd.DataFrame([{
            "home_trailing_off_epa": home_form["off_epa"],
            "home_trailing_def_epa_allowed": home_form["def_epa"],
            "home_trailing_off_success_rate": home_form["off_success"],
            "away_trailing_off_epa": away_form["off_epa"],
            "away_trailing_def_epa_allowed": away_form["def_epa"],
            "away_trailing_off_success_rate": away_form["off_success"],
        }])

        xgb_home_prob = float(xgb_model.predict_proba(feat_row)[0][1])
        log_home_prob = float(log_model.predict_proba(feat_row)[0][1])

        pick = row["home_team"] if xgb_home_prob >= 0.5 else row["away_team"]
        margin = round(abs(xgb_home_prob - 0.5) * 100)
        confidence = confidence_tier(max(xgb_home_prob, 1 - xgb_home_prob))

        games_out.append({
            "home": row["home_team"],
            "away": row["away_team"],
            "week": week,
            "season": season,
            "gameday": str(row["gameday"]) if row["gameday"] is not None else None,
            "gametime": row["gametime"],
            "pick": pick,
            "confidence": confidence,
            "prob": {"home": xgb_home_prob, "away": 1 - xgb_home_prob},
            "verdict": {"text": f"{pick} favored", "margin": margin},
            "features": {
                "home_trailing_off_epa": home_form["off_epa"],
                "home_trailing_def_epa": home_form["def_epa"],
                "away_trailing_off_epa": away_form["off_epa"],
                "away_trailing_def_epa": away_form["def_epa"],
            },
            "components": {
                "logistic": {"home": log_home_prob, "away": 1 - log_home_prob},
                "xgboost": {"home": xgb_home_prob, "away": 1 - xgb_home_prob},
            },
        })

    payload = {"season": season, "week": week, "games": games_out}

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "upcoming_predictions.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {out_path} ({len(games_out)} games)")


if __name__ == "__main__":
    main()