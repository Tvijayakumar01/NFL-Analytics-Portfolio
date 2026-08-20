"""
Train a baseline game-outcome prediction model using team rolling EPA features.

Run from project root:
    python models/train_model.py
"""

import os
from google.cloud import bigquery
from google.oauth2 import service_account
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss

PROJECT_ID = "nfl-analytics-505917"
BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
CREDENTIALS_PATH = os.path.join(BASE_DIR, "credentials.json")

FEATURES = [
    "home_trailing_off_epa",
    "home_trailing_def_epa_allowed",
    "home_trailing_off_success_rate",
    "away_trailing_off_epa",
    "away_trailing_def_epa_allowed",
    "away_trailing_off_success_rate",
]
TARGET = "home_team_won"


def load_data():
    credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
    client = bigquery.Client(credentials=credentials, project=PROJECT_ID)
    query = f"SELECT * FROM `{PROJECT_ID}.nfl_dbt.game_training_data`"
    df = client.query(query).to_dataframe()
    print(f"Loaded {len(df):,} games")
    return df


def time_based_split(df):
    train = df[df["season"] < 2025]
    test = df[df["season"] == 2025]
    print(f"Train: {len(train):,} games (2021-2024)")
    print(f"Test:  {len(test):,} games (2025)")
    return train, test


def naive_baseline(test):
    preds = [1] * len(test)
    acc = accuracy_score(test[TARGET], preds)
    print(f"\nNaive baseline (always pick home team): {acc:.1%} accuracy")
    return acc


def train_logistic_regression(train, test):
    X_train, y_train = train[FEATURES], train[TARGET]
    X_test, y_test = test[FEATURES], test[TARGET]

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, preds)
    ll = log_loss(y_test, probs)

    print(f"\nLogistic Regression: {acc:.1%} accuracy, {ll:.3f} log loss")

    coef_df = pd.DataFrame({
        "feature": FEATURES,
        "coefficient": model.coef_[0]
    }).sort_values("coefficient", ascending=False)
    print("\nFeature importance (coefficients):")
    print(coef_df.to_string(index=False))

    return model, acc


if __name__ == "__main__":
    df = load_data()
    train, test = time_based_split(df)
    naive_acc = naive_baseline(test)
    model, lr_acc = train_logistic_regression(train, test)

    print(f"\n{'='*40}")
    print(f"Naive baseline:      {naive_acc:.1%}")
    print(f"Logistic Regression: {lr_acc:.1%}")
    print(f"Improvement:         {(lr_acc - naive_acc)*100:+.1f} points")
    