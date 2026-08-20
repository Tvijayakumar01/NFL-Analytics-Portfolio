"""
Shared utilities for the Streamlit app — BigQuery connection and query helpers.
"""

import os
import streamlit as st
from google.cloud import bigquery
from google.oauth2 import service_account

PROJECT_ID = "nfl-analytics-505917"
BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
CREDENTIALS_PATH = os.path.join(BASE_DIR, "credentials.json")


@st.cache_resource
def get_client():
    credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
    return bigquery.Client(credentials=credentials, project=PROJECT_ID)


@st.cache_data(ttl=3600)  # cache query results for 1 hour
def run_query(query: str):
    client = get_client()
    return client.query(query).to_dataframe()