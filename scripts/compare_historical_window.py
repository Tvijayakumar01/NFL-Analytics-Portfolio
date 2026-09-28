"""
Compares two versions of the prediction model on the SAME 2025 holdout season:
  - "Recent window": trained on 2021-2024 (what your live model currently uses)
  - "Full history":  trained on 1999-2024 (using the historical backfill)

This does NOT touch your live model or site data — it's a standalone
experiment. Run it once, read the results, and decide what to do next.

Run:
    python scripts/compare_historical_window.py
"""

import numpy as np
import pandas as pd
from google.cloud import bigquery
from google.oauth2 import service_account
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score

PROJECT_ID = "nfl-analytics-505917"
CREDENTIALS_PATH = "credentials.json"


def get_client():
    credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
    return bigquery.Client(credentials=credentials, project=PROJECT_ID)


def run_query(client, sql):
    return client.query(sql).to_dataframe()


def build_team_week_epa(client):
    """Combines historical (1999-2020) and recent (2021+) raw play-by-play into
    one team-week offensive/defensive EPA table, computed directly from raw plays."""
    sql = f"""
    WITH all_pbp AS (
        SELECT season, week, season_type, posteam, defteam, epa, play_type
        FROM `{PROJECT_ID}.nfl_raw.pbp_historical`
        UNION ALL
        SELECT season, week, season_type, posteam, defteam, epa, play_type
        FROM `{PROJECT_ID}.nfl_raw.pbp`
    ),
    offense AS (
        SELECT season, week, posteam AS team,
               COUNT(*) AS off_plays,
               SUM(epa) AS off_total_epa
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
        o.off_plays, o.off_total_epa,
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
    """For each team-week row, compute trailing EPA/play over the prior `window`
    weeks (shifted so the current week's own result isn't included — no leakage)."""
    team_week = team_week.sort_values(["team", "season", "week"]).copy()
    team_week["off_epa_per_play"] = team_week["off_total_epa"] / team_week["off_plays"]
    team_week["def_epa_per_play_allowed"] = team_week["def_total_epa_allowed"] / team_week["def_plays"]

    def trailing(group):
        group = group.copy()
        group["trailing_off_epa"] = group["off_epa_per_play"].shift(1).rolling(window, min_periods=1).mean()
        group["trailing_def_epa"] = group["def_epa_per_play_allowed"].shift(1).rolling(window, min_periods=1).mean()
        return group

    return team_week.groupby("team", group_keys=False).apply(trailing)


def build_training_set(games: pd.DataFrame, team_week: pd.DataFrame) -> pd.DataFrame:
    feat = team_week[["season", "week", "team", "trailing_off_epa", "trailing_def_epa"]]

    df = games.merge(
        feat.rename(columns={"team": "home_team", "trailing_off_epa": "home_trailing_off_epa", "trailing_def_epa": "home_trailing_def_epa"}),
        on=["season", "week", "home_team"], how="inner",
    )
    df = df.merge(
        feat.rename(columns={"team": "away_team", "trailing_off_epa": "away_trailing_off_epa", "trailing_def_epa": "away_trailing_def_epa"}),
        on=["season", "week", "away_team"], how="inner",
    )

    df = df.dropna(subset=["home_trailing_off_epa", "home_trailing_def_epa", "away_trailing_off_epa", "away_trailing_def_epa", "home_score", "away_score"])
    df["home_win"] = (df["home_score"] > df["away_score"]).astype(int)
    return df


FEATURES = ["home_trailing_off_epa", "home_trailing_def_epa", "away_trailing_off_epa", "away_trailing_def_epa"]


def evaluate(train_df: pd.DataFrame, test_df: pd.DataFrame, label: str):
    X_train, y_train = train_df[FEATURES], train_df["home_win"]
    X_test, y_test = test_df[FEATURES], test_df["home_win"]

    logreg = LogisticRegression(max_iter=1000)
    logreg.fit(X_train, y_train)
    logreg_acc = accuracy_score(y_test, logreg.predict(X_test))

    xgb = XGBClassifier(eval_metric="logloss", n_estimators=200, max_depth=3, learning_rate=0.05)
    xgb.fit(X_train, y_train)
    xgb_acc = accuracy_score(y_test, xgb.predict(X_test))

    naive_acc = accuracy_score(y_test, np.ones(len(y_test)))  # always predict home wins

    print(f"\n--- {label} ---")
    print(f"  Training games: {len(train_df):,}  (seasons {int(train_df['season'].min())}-{int(train_df['season'].max())})")
    print(f"  Naive baseline (always home):  {naive_acc:.1%}")
    print(f"  Logistic Regression:           {logreg_acc:.1%}")
    print(f"  XGBoost:                       {xgb_acc:.1%}")
    return xgb_acc


def main():
    client = get_client()

    print("Building combined team-week EPA table (historical + recent)...")
    team_week = build_team_week_epa(client)
    print(f"  {len(team_week):,} team-week rows, seasons {int(team_week['season'].min())}-{int(team_week['season'].max())}")

    print("Computing trailing features...")
    team_week = add_trailing_features(team_week)

    print("Building game-level training set...")
    games = build_games(client)
    training_set = build_training_set(games, team_week)
    print(f"  {len(training_set):,} usable games total")

    test_df = training_set[training_set["season"] == 2025]
    if test_df.empty:
        print("\nNo 2025 games found to use as a holdout — check that season is in your data.")
        return

    recent_train = training_set[(training_set["season"] >= 2021) & (training_set["season"] <= 2024)]
    full_train = training_set[training_set["season"] <= 2024]

    print(f"\nHoldout test set: {len(test_df):,} games from 2025")

    recent_acc = evaluate(recent_train, test_df, "Recent Window (2021-2024)")
    full_acc = evaluate(full_train, test_df, "Full History (1999-2024)")

    print("\n=== RESULT ===")
    if full_acc > recent_acc:
        print(f"Full history WON: {full_acc:.1%} vs {recent_acc:.1%} — more data helped.")
    elif recent_acc > full_acc:
        print(f"Recent window WON: {recent_acc:.1%} vs {full_acc:.1%} — the older eras diluted the signal.")
    else:
        print(f"Tied at {recent_acc:.1%} — no meaningful difference either way.")


if __name__ == "__main__":
    main()