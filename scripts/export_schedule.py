"""
Export the full season schedule (all weeks, played and upcoming) for the Schedule page.

Run:
    python scripts/export_schedule.py
"""

import os
import json
from google.cloud import bigquery
from google.oauth2 import service_account

PROJECT_ID = "nfl-analytics-505917"
BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
CREDENTIALS_PATH = os.path.join(BASE_DIR, "credentials.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "predictions-app", "public", "data")


def get_client():
    credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
    return bigquery.Client(credentials=credentials, project=PROJECT_ID)


def run_query(client, sql):
    return client.query(sql).to_dataframe()


def main():
    client = get_client()

    latest = run_query(client, f"SELECT MAX(season) as season FROM `{PROJECT_ID}.nfl_raw.schedules`")
    season = int(latest.iloc[0]["season"])

    games = run_query(client, f"""
        SELECT week, home_team, away_team, home_score, away_score, gameday, gametime
        FROM `{PROJECT_ID}.nfl_raw.schedules`
        WHERE season = {season}
        ORDER BY week, gameday, gametime
    """)

    records = []
    for _, row in games.iterrows():
        played = row["home_score"] == row["home_score"]  # False if NaN
        records.append({
            "week": int(row["week"]),
            "home": row["home_team"],
            "away": row["away_team"],
            "home_score": int(row["home_score"]) if played else None,
            "away_score": int(row["away_score"]) if played else None,
            "gameday": str(row["gameday"]) if row["gameday"] is not None else None,
            "gametime": row["gametime"],
            "played": bool(played),
        })

    payload = {"season": season, "games": records}

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "schedule.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {out_path} ({len(records)} games)")


if __name__ == "__main__":
    main()