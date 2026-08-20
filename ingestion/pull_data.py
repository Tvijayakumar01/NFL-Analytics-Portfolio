"""
NFL data ingestion script.

Pulls historical play-by-play, schedule, and roster data using nfl_data_py
and saves each as a local parquet file under ./data/raw/.

Run this from the project root:
    python ingestion/pull_data.py
"""

import os
import nfl_data_py as nfl

# Seasons to pull. 5 seasons gives enough history to train a prediction
# model while keeping the initial pull fast. Extend this list later once
# the pipeline is working end to end.
SEASONS = [2021, 2022, 2023, 2024, 2025]

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")


def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def pull_play_by_play():
    print(f"Pulling play-by-play for seasons: {SEASONS}")
    df = nfl.import_pbp_data(SEASONS, downcast=True, cache=False)
    print(f"  -> {df.shape[0]:,} rows, {df.shape[1]} columns")
    out_path = os.path.join(DATA_DIR, "pbp.parquet")
    df.to_parquet(out_path, index=False)
    print(f"  Saved to {out_path}")
    return df


def pull_schedules():
    print(f"Pulling schedules for seasons: {SEASONS}")
    df = nfl.import_schedules(SEASONS)
    print(f"  -> {df.shape[0]:,} rows, {df.shape[1]} columns")
    out_path = os.path.join(DATA_DIR, "schedules.parquet")
    df.to_parquet(out_path, index=False)
    print(f"  Saved to {out_path}")
    return df


def pull_rosters():
    print(f"Pulling weekly rosters for seasons: {SEASONS}")
    df = nfl.import_weekly_rosters(SEASONS)
    print(f"  -> {df.shape[0]:,} rows, {df.shape[1]} columns")
    out_path = os.path.join(DATA_DIR, "rosters.parquet")
    df.to_parquet(out_path, index=False)
    print(f"  Saved to {out_path}")
    return df


if __name__ == "__main__":
    ensure_data_dir()
    pull_play_by_play()
    pull_schedules()
    pull_rosters()
    print("\nAll pulls complete. Files saved under data/raw/")