"""
Generate live predictions for the next unplayed NFL week.

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


def confidence_tier(prob):
    if prob >= 0.70:
        return "High"
    elif prob >= 0.60:
        return "Medium"
    return "Low"


def trailing_form(client, team):
    """Average of a team's last 4 completed weeks, regardless of season boundary."""
    df = run_query(client, f"""
        SELECT off_epa_per_play, def_epa_per_play_allowed, off_success_rate
        FROM `{PROJECT_ID}.nfl_dbt.team_week_epa`
        WHERE team = '{team}' AND season_type = 'REG'
        ORDER BY season DESC, week DESC
        LIMIT 4
    """)
    if df.empty:
        return None
    return {
        "off_epa": float(df["off_epa_per_play"].mean()),
        "def_epa": float(df["def_epa_per_play_allowed"].mean()),
        "off_success": float(df["off_success_rate"].mean()),
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

    games_df = run_query(client, f"""
        SELECT home_team, away_team, gameday, gametime
        FROM `{PROJECT_ID}.nfl_raw.schedules`
        WHERE season = {season} AND week = {week} AND home_score IS NULL
        ORDER BY gameday, gametime
    """)

    print("Training models on all completed seasons...")
    train_df = run_query(client, f"SELECT * FROM `{PROJECT_ID}.nfl_dbt.game_training_data`")
    X_train, y_train = train_df[FEATURES], train_df[TARGET]

    log_model = LogisticRegression(max_iter=1000)
    log_model.fit(X_train, y_train)

    xgb_model = XGBClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.05,
        random_state=42, eval_metric="logloss",
    )
    xgb_model.fit(X_train, y_train)

    games = []
    for _, row in games_df.iterrows():
        home_form = trailing_form(client, row["home_team"])
        away_form = trailing_form(client, row["away_team"])
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

        games.append({
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

    payload = {"season": season, "week": week, "games": games}

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "upcoming_predictions.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {out_path} ({len(games)} games)")


if __name__ == "__main__":
    main()