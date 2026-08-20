"""
Train an XGBoost model and compare against the logistic regression baseline.

Run from project root:
    python models/train_xgboost.py
"""

import os
import joblib
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, log_loss

from train_model import (
    load_data,
    time_based_split,
    naive_baseline,
    train_logistic_regression,
    FEATURES,
    TARGET,
)

MODEL_OUT_PATH = os.path.join(os.path.dirname(__file__), "xgb_model.joblib")


def train_xgboost(train, test):
    X_train, y_train = train[FEATURES], train[TARGET]
    X_test, y_test = test[FEATURES], test[TARGET]

    model = XGBClassifier(
        n_estimators=100,
        max_depth=3,          # shallow trees, since we only have 6 features
        learning_rate=0.05,
        random_state=42,
        eval_metric="logloss",
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, preds)
    ll = log_loss(y_test, probs)

    print(f"\nXGBoost: {acc:.1%} accuracy, {ll:.3f} log loss")

    importances = sorted(
        zip(FEATURES, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True,
    )
    print("\nFeature importance:")
    for feat, imp in importances:
        print(f"  {feat}: {imp:.3f}")

    return model, acc, ll


if __name__ == "__main__":
    df = load_data()
    train, test = time_based_split(df)
    naive_acc = naive_baseline(test)
    lr_model, lr_acc = train_logistic_regression(train, test)
    xgb_model, xgb_acc, xgb_ll = train_xgboost(train, test)

    print(f"\n{'='*45}")
    print(f"Naive baseline:      {naive_acc:.1%}")
    print(f"Logistic Regression: {lr_acc:.1%}")
    print(f"XGBoost:             {xgb_acc:.1%}")

    # Save whichever model performed better, for use in the Streamlit app later
    if xgb_acc >= lr_acc:
        joblib.dump(xgb_model, MODEL_OUT_PATH)
        print(f"\nXGBoost performed best — saved to {MODEL_OUT_PATH}")
    else:
        joblib.dump(lr_model, MODEL_OUT_PATH)
        print(f"\nLogistic Regression performed best — saved to {MODEL_OUT_PATH}")