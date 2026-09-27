"""
Export key BigQuery tables to static JSON files for the GitHub Pages site.

Run this after each weekly dbt run:
    python scripts/export_data.py
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


def get_full_season_pwe(client, season):
    """Player-week EPA for the whole season, joined with bio (full name, headshot, position)."""
    return run_query(client, f"""
        SELECT
            pwe.player_id,
            COALESCE(bio.full_name, pwe.player_name) as player_name,
            pwe.team,
            pwe.role,
            pwe.week,
            bio.position,
            bio.headshot_url,
            pwe.plays,
            pwe.total_epa,
            pwe.epa_per_play,
            pwe.success_rate,
            pwe.yards,
            pwe.touchdowns,
            pwe.turnovers,
            pwe.completions
        FROM `{PROJECT_ID}.nfl_dbt.player_week_epa` pwe
        LEFT JOIN `{PROJECT_ID}.nfl_dbt.stg_player_bio` bio
            ON pwe.player_id = bio.player_id
        WHERE pwe.season = {season} AND pwe.season_type = 'REG'
    """)


def compute_weekly_totw_history(season_pwe):
    """One row per (week, role) = the top EPA performer that week, min 10 plays."""
    eligible = season_pwe[season_pwe["plays"] >= 10]
    idx = eligible.groupby(["week", "role"])["total_epa"].idxmax()
    return eligible.loc[idx].reset_index(drop=True)


def get_matchup_story(client, season, week, team):
    sched = run_query(client, f"""
        SELECT home_team, away_team, home_score, away_score
        FROM `{PROJECT_ID}.nfl_raw.schedules`
        WHERE season = {season} AND week = {week}
          AND (home_team = '{team}' OR away_team = '{team}')
        LIMIT 1
    """)
    if sched.empty:
        return None
    row = sched.iloc[0]
    if row["home_team"] == team:
        opponent, team_score, opp_score = row["away_team"], row["home_score"], row["away_score"]
    else:
        opponent, team_score, opp_score = row["home_team"], row["away_score"], row["home_score"]
    if team_score != team_score:
        return None
    return {"opponent": opponent, "team_score": int(team_score), "opp_score": int(opp_score)}


def get_form_leader(client, season, week):
    df = run_query(client, f"""
        SELECT player_id, player_name, team, position, form_z_score
        FROM `{PROJECT_ID}.nfl_dbt.player_rolling_form`
        WHERE season = {season} AND week = {week}
        ORDER BY form_z_score DESC
        LIMIT 1
    """)
    if df.empty:
        return None
    row = df.iloc[0]
    return {
        "player_name": row["player_name"],
        "team": row["team"],
        "position": row["position"],
        "form_z_score": row["form_z_score"],
    }


def export_this_week(client, season, season_pwe):
    current_week = int(season_pwe["week"].max())
    this_week_rows = season_pwe[season_pwe["week"] == current_week].sort_values("total_epa", ascending=False)

    top_performer = this_week_rows.iloc[0].to_dict()
    matchup = get_matchup_story(client, season, current_week, top_performer["team"])
    if matchup:
        top_performer.update(matchup)

    eligible = this_week_rows[this_week_rows["plays"] >= 10]
    team_of_week = (
        eligible.loc[eligible.groupby("role")["total_epa"].idxmax()]
        .sort_values("total_epa", ascending=False)
        .to_dict(orient="records")
    )

    history = compute_weekly_totw_history(season_pwe)
    this_totw = history[history["week"] == current_week]
    prev_totw = history[history["week"] == current_week - 1] if current_week > 1 else history.iloc[0:0]

    held_ids = set(this_totw["player_id"]) & set(prev_totw["player_id"])
    total_slots = len(this_totw)
    held_count = len(held_ids)

    prior_ids = set(history[history["week"] < current_week]["player_id"])
    debutants = this_totw[~this_totw["player_id"].isin(prior_ids)]
    debutant_count = int(len(debutants))
    debutant = debutants.iloc[0].to_dict() if len(debutants) else None

    form_leader = get_form_leader(client, season, current_week)

    payload = {
        "season": season,
        "week": current_week,
        "top_performer": top_performer,
        "team_of_week": team_of_week,
        "full_week": this_week_rows.to_dict(orient="records"),
        "form_leader": form_leader,
        "debutant": debutant,
        "debutant_count": debutant_count,
        "held_count": held_count,
        "total_slots": total_slots,
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "this_week.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2, default=str)
    print(f"Wrote {out_path} ({len(this_week_rows)} players)")


def export_teams(client, season, season_pwe):
    form_latest = run_query(client, f"""
        SELECT MAX(week) as week
        FROM `{PROJECT_ID}.nfl_dbt.player_rolling_form`
        WHERE season = {season}
    """)
    form_week_raw = form_latest.iloc[0]["week"]
    form_week = int(form_week_raw) if form_week_raw is not None else None

    team_week = run_query(client, f"""
        SELECT team, off_plays, off_total_epa, def_plays, def_total_epa_allowed
        FROM `{PROJECT_ID}.nfl_dbt.team_week_epa`
        WHERE season = {season} AND season_type = 'REG'
    """)
    league = (
        team_week.groupby("team")
        .agg(
            off_plays=("off_plays", "sum"),
            off_total_epa=("off_total_epa", "sum"),
            def_plays=("def_plays", "sum"),
            def_total_epa_allowed=("def_total_epa_allowed", "sum"),
        )
        .reset_index()
    )
    league["off_epa_per_play"] = league["off_total_epa"] / league["off_plays"]
    league["def_epa_per_play_allowed"] = league["def_total_epa_allowed"] / league["def_plays"]
    league["net_epa_per_play"] = league["off_epa_per_play"] - league["def_epa_per_play_allowed"]
    league = league.sort_values("net_epa_per_play", ascending=False).reset_index(drop=True)
    league.insert(0, "rank", league.index + 1)
    league_records = league[[
        "rank", "team", "off_plays", "off_epa_per_play",
        "def_plays", "def_epa_per_play_allowed", "net_epa_per_play"
    ]].to_dict(orient="records")

    pwe = season_pwe

    if form_week is not None:
        form = run_query(client, f"""
            SELECT player_id, form_z_score
            FROM `{PROJECT_ID}.nfl_dbt.player_rolling_form`
            WHERE season = {season} AND week = {form_week}
        """)
    else:
        form = None

    season_agg = (
        pwe.groupby(["player_id", "player_name", "team", "role", "position", "headshot_url"], dropna=False)
        .agg(
            season_plays=("plays", "sum"),
            season_total_epa=("total_epa", "sum"),
            season_yards=("yards", "sum"),
            season_touchdowns=("touchdowns", "sum"),
            season_turnovers=("turnovers", "sum"),
            season_completions=("completions", "sum"),
        )
        .reset_index()
    )
    season_agg = season_agg[season_agg["season_plays"] >= 20].copy()
    season_agg["season_epa_per_play"] = season_agg["season_total_epa"] / season_agg["season_plays"]

    if form is not None:
        season_agg = season_agg.merge(form, on="player_id", how="left")
    else:
        season_agg["form_z_score"] = None

    weekly_trends = {}
    for (pid, role), g in pwe.groupby(["player_id", "role"]):
        weekly_trends[(pid, role)] = g[["week", "total_epa"]].sort_values("week").to_dict(orient="records")

    league_avg = (
        pwe[pwe["plays"] >= 5]
        .groupby(["role", "week"])["total_epa"].mean()
        .reset_index()
        .rename(columns={"total_epa": "league_avg_epa"})
    )
    league_avg_by_role = {}
    for role, group in league_avg.groupby("role"):
        league_avg_by_role[role] = group[["week", "league_avg_epa"]].sort_values("week").to_dict(orient="records")

    rosters = {}
    for _, row in season_agg.sort_values("season_total_epa", ascending=False).iterrows():
        team = row["team"]
        rosters.setdefault(team, [])
        form_val = row["form_z_score"]
        rosters[team].append({
            "player_id": row["player_id"],
            "player_name": row["player_name"],
            "role": row["role"],
            "position": row["position"],
            "headshot_url": row["headshot_url"],
            "season_plays": int(row["season_plays"]),
            "season_total_epa": row["season_total_epa"],
            "season_epa_per_play": row["season_epa_per_play"],
            "season_yards": int(row["season_yards"]),
            "season_touchdowns": int(row["season_touchdowns"]),
            "season_turnovers": int(row["season_turnovers"]),
            "season_completions": int(row["season_completions"]),
            "form_z_score": None if form_val != form_val else form_val,
            "weekly": weekly_trends.get((row["player_id"], row["role"]), []),
        })

    payload = {
        "season": season,
        "league": league_records,
        "rosters": rosters,
        "league_avg_by_role": league_avg_by_role,
    }

    out_path = os.path.join(OUTPUT_DIR, "teams.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2, default=str)
    total_roster_rows = sum(len(v) for v in rosters.values())
    print(f"Wrote {out_path} ({len(league_records)} teams, {total_roster_rows} roster entries)")


def export_games(client, season, week):
    games = run_query(client, f"""
        SELECT home_team, away_team, home_score, away_score, gameday, gametime
        FROM `{PROJECT_ID}.nfl_raw.schedules`
        WHERE season = {season} AND week = {week}
        ORDER BY gameday, gametime
    """)
    records = games.to_dict(orient="records")

    out_path = os.path.join(OUTPUT_DIR, "games.json")
    with open(out_path, "w") as f:
        json.dump({"season": season, "week": week, "games": records}, f, indent=2, default=str)
    print(f"Wrote {out_path} ({len(records)} games)")


if __name__ == "__main__":
    client = get_client()

    latest = run_query(client, f"""
        SELECT season
        FROM `{PROJECT_ID}.nfl_dbt.player_week_epa`
        WHERE season_type = 'REG'
        ORDER BY season DESC
        LIMIT 1
    """)
    season = int(latest.iloc[0]["season"])

    season_pwe = get_full_season_pwe(client, season)
    current_week = int(season_pwe["week"].max())

    export_this_week(client, season, season_pwe)
    export_teams(client, season, season_pwe)
    export_games(client, season, current_week)
    print("\nExport complete.")