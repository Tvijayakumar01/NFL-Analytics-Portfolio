"""
Backtest export: score every 2025-season test game with both trained models
and export a track-record dataset for the React Predictions page.

Run from project root:
    python scripts/export_predictions.py
"""

import os
import json
from google.cloud import bigquery
from google.oauth2 import service_account
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier

PROJECT_ID = "nfl-analytics-505917"
BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
CREDENTIALS_PATH = os.path.join(BASE_DIR, "credentials.json")
# Vite serves anything under public/ at the site root, so the app can fetch this directly
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


def load_training_data(client):
    query = f"SELECT * FROM `{PROJECT_ID}.nfl_dbt.game_training_data`"
    return client.query(query).to_dataframe()


def confidence_tier(prob):
    if prob >= 0.70:
        return "High"
    elif prob >= 0.60:
        return "Medium"
    return "Low"


def main():
    client = get_client()
    df = load_training_data(client)

    train = df[df["season"] < 2025]
    test = df[df["season"] == 2025].copy()

    X_train, y_train = train[FEATURES], train[TARGET]
    X_test = test[FEATURES]

    log_model = LogisticRegression(max_iter=1000)
    log_model.fit(X_train, y_train)

    xgb_model = XGBClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.05,
        random_state=42, eval_metric="logloss",
    )
    xgb_model.fit(X_train, y_train)

    test["log_home_prob"] = log_model.predict_proba(X_test)[:, 1]
    test["xgb_home_prob"] = xgb_model.predict_proba(X_test)[:, 1]

    games = []
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

        games.append({
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
        "games": games,
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "predictions.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {out_path} ({len(games)} games, {accuracy:.1%} accuracy)")


if __name__ == "__main__":
    main()