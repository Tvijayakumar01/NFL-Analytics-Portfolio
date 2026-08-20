"""
Load local parquet files (pulled by pull_data.py) into BigQuery raw tables.

Run this from the project root, after pull_data.py has finished:
    python ingestion/load_to_bigquery.py

Requires:
    pip install google-cloud-bigquery db-dtypes
    credentials.json in the project root (service account key)
"""

import os
from google.cloud import bigquery
from google.oauth2 import service_account
import pandas as pd

PROJECT_ID = "nfl-analytics-505917"   # from your GCP console
DATASET_ID = "nfl_raw"                 # the dataset you created

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
CREDENTIALS_PATH = os.path.join(BASE_DIR, "credentials.json")
DATA_DIR = os.path.join(BASE_DIR, "data", "raw")

# Maps local parquet filename -> destination BigQuery table name
FILES_TO_LOAD = {
    "pbp.parquet": "pbp",
    "schedules.parquet": "schedules",
    "rosters.parquet": "rosters",
}


def get_client():
    credentials = service_account.Credentials.from_service_account_file(
        CREDENTIALS_PATH
    )
    return bigquery.Client(credentials=credentials, project=PROJECT_ID)


def load_table(client, local_filename, table_name):
    file_path = os.path.join(DATA_DIR, local_filename)
    print(f"Loading {local_filename} -> {DATASET_ID}.{table_name}")

    df = pd.read_parquet(file_path)
    print(f"  Read {df.shape[0]:,} rows, {df.shape[1]} columns from parquet")

    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{table_name}"

    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_TRUNCATE",  # overwrite table each run
        autodetect=True,                      # infer schema from dataframe
    )

    job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
    job.result()  # wait for the job to finish

    table = client.get_table(table_ref)
    print(f"  Loaded. Table now has {table.num_rows:,} rows.")


if __name__ == "__main__":
    client = get_client()

    for local_filename, table_name in FILES_TO_LOAD.items():
        load_table(client, local_filename, table_name)

    print("\nAll tables loaded into BigQuery.")