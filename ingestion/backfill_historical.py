"""
ONE-TIME backfill: pulls historical play-by-play data (1999-2020) and loads it
into a SEPARATE BigQuery table (nfl_raw.pbp_historical), isolated from the
existing daily pipeline's tables.

This is NOT part of the daily automation — run it once, manually:
    python ingestion/backfill_historical.py

Why separate tables? Your daily job truncates and reloads nfl_raw.pbp for the
recent/current season range every day. If historical data lived in that same
table, the daily job would wipe it out on its next run. Keeping historical
data in its own table means the daily automation is completely unaffected.
"""

import nfl_data_py as nfl
import pandas as pd
from google.cloud import bigquery
from google.oauth2 import service_account

PROJECT_ID = "nfl-analytics-505917"
CREDENTIALS_PATH = "credentials.json"
HISTORICAL_SEASONS = list(range(1999, 2021))  # 1999 through 2020 inclusive


def get_client():
    credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
    return bigquery.Client(credentials=credentials, project=PROJECT_ID)


def main():
    client = get_client()

    print(f"Pulling play-by-play for {len(HISTORICAL_SEASONS)} seasons: {HISTORICAL_SEASONS[0]}-{HISTORICAL_SEASONS[-1]}")
    print("This will take a while — historical seasons are large. Grab a coffee.")

    pbp = nfl.import_pbp_data(HISTORICAL_SEASONS, downcast=True)
    print(f"Pulled {len(pbp):,} historical plays.")

    table_id = f"{PROJECT_ID}.nfl_raw.pbp_historical"
    job_config = bigquery.LoadJobConfig(write_disposition="WRITE_TRUNCATE")

    print(f"Loading into {table_id} ...")
    job = client.load_table_from_dataframe(pbp, table_id, job_config=job_config)
    job.result()
    print(f"Done. {table_id} now has {job.output_rows:,} rows.")

    print("\nPulling historical schedules...")
    sched = nfl.import_schedules(HISTORICAL_SEASONS)
    sched_table_id = f"{PROJECT_ID}.nfl_raw.schedules_historical"
    job2 = client.load_table_from_dataframe(sched, sched_table_id, job_config=job_config)
    job2.result()
    print(f"Done. {sched_table_id} now has {job2.output_rows:,} rows.")

    print("\nBackfill complete. Historical data now lives in:")
    print(f"  - {table_id}")
    print(f"  - {sched_table_id}")
    print("Your daily automation's tables (nfl_raw.pbp, nfl_raw.schedules) are untouched.")


if __name__ == "__main__":
    main()