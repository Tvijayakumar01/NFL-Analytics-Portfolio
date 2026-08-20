"""
NFL EPA Lab - Teams page

Team-level offense/defense splits, season-to-date, plus a per-club roster deep dive
and a head-to-head comparison tool.
"""

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from utils import run_query
from team_meta import TEAM_INFO

st.set_page_config(page_title="Teams - NFL EPA Lab", layout="wide")

st.title("Teams")
st.caption("Season-to-date offensive and defensive efficiency, by team.")


def get_form_tier(z):
    if z is None:
        return "—"
    if z >= 1.0:
        return "🔥 Elite"
    elif z >= 0.5:
        return "✅ Great"
    elif z >= -0.5:
        return "👍 Good"
    elif z >= -1.0:
        return "😐 Below Average"
    else:
        return "❌ Struggled"


def color_bar(color, height=6):
    st.markdown(
        f'<div style="background-color:{color}; height:{height}px; '
        f'border-radius:3px; margin-bottom:6px;"></div>',
        unsafe_allow_html=True,
    )


# Find the current season
latest = run_query("""
    SELECT season
    FROM `nfl-analytics-505917.nfl_dbt.team_week_epa`
    WHERE season_type = 'REG'
    ORDER BY season DESC
    LIMIT 1
""")
current_season = int(latest.iloc[0]["season"])

latest_form = run_query(f"""
    SELECT MAX(week) as week
    FROM `nfl-analytics-505917.nfl_dbt.player_rolling_form`
    WHERE season = {current_season}
""")
current_form_week = int(latest_form.iloc[0]["week"]) if latest_form.iloc[0]["week"] is not None else None

with st.expander("ℹ️ How to read this page"):
    st.markdown("""
    **Off EPA/play** — average points added per offensive play, season-to-date.
    Higher is better.

    **Def EPA/play allowed** — average points the defense allows opponents to add
    per play. Lower (more negative) is better.

    **Net EPA/play** — offense minus defense allowed. Overall team strength.

    **Recent form** — a shrunk, position-adjusted rolling average over the last
    4 weeks. Separate from season totals — captures who's hot or cold *right now*.

    **Note on limitations**: these numbers don't adjust for strength of schedule —
    a great week against a weak defense looks the same in the data as the same
    week against an elite one.
    """)

# ============ LEAGUE TABLE ============
teams = run_query(f"""
    SELECT
        team,
        SUM(off_plays) as off_plays,
        SUM(off_total_epa) / SUM(off_plays) as off_epa_per_play,
        SUM(def_plays) as def_plays,
        SUM(def_total_epa_allowed) / SUM(def_plays) as def_epa_per_play_allowed
    FROM `nfl-analytics-505917.nfl_dbt.team_week_epa`
    WHERE season = {current_season} AND season_type = 'REG'
    GROUP BY team
""")
teams["net_epa_per_play"] = teams["off_epa_per_play"] - teams["def_epa_per_play_allowed"]
teams = teams.sort_values("net_epa_per_play", ascending=False).reset_index(drop=True)
teams.insert(0, "rank", teams.index + 1)

teams["logo"] = teams["team"].map(lambda t: TEAM_INFO.get(t, {}).get("logo", ""))
teams["full_name"] = teams["team"].map(lambda t: TEAM_INFO.get(t, {}).get("name", t))
teams["color"] = teams["team"].map(lambda t: TEAM_INFO.get(t, {}).get("color", "#888888"))

st.subheader(f"{current_season} Season Rankings")

display_cols = ["rank", "logo", "full_name", "off_plays", "off_epa_per_play",
                 "def_plays", "def_epa_per_play_allowed", "net_epa_per_play"]

st.dataframe(
    teams[display_cols],
    use_container_width=True,
    hide_index=True,
    column_config={
        "rank": st.column_config.NumberColumn("Rank"),
        "logo": st.column_config.ImageColumn("", width="small"),
        "full_name": st.column_config.TextColumn("Team"),
        "off_plays": st.column_config.NumberColumn("Off Plays"),
        "off_epa_per_play": st.column_config.NumberColumn(
            "Off EPA/Play", format="%+.3f",
            help="Higher is better"
        ),
        "def_plays": st.column_config.NumberColumn("Def Plays"),
        "def_epa_per_play_allowed": st.column_config.NumberColumn(
            "Def EPA/Play Allowed", format="%+.3f",
            help="Lower (more negative) is better"
        ),
        "net_epa_per_play": st.column_config.NumberColumn(
            "Net EPA/Play", format="%+.3f",
            help="Offense minus defense allowed"
        ),
    }
)

st.divider()

# ============ OFFENSE VS DEFENSE SCATTER (team-colored) ============
st.subheader("Offense vs. Defense")
st.caption("Top-right is best on both sides of the ball. Dots colored by team.")

teams["defense_strength"] = -teams["def_epa_per_play_allowed"]
color_map = {row["team"]: row["color"] for _, row in teams.iterrows()}

fig = px.scatter(
    teams,
    x="off_epa_per_play",
    y="defense_strength",
    text="team",
    hover_name="full_name",
    color="team",
    color_discrete_map=color_map,
    labels={
        "off_epa_per_play": "Offensive EPA/Play (higher = better)",
        "defense_strength": "Defensive Strength (higher = better)",
    },
)
fig.update_traces(textposition="top center", marker=dict(size=12, line=dict(width=1, color="white")))
fig.add_hline(y=teams["defense_strength"].mean(), line_dash="dot", line_color="gray")
fig.add_vline(x=teams["off_epa_per_play"].mean(), line_dash="dot", line_color="gray")
fig.update_layout(height=600, showlegend=False)

st.plotly_chart(fig, use_container_width=True, key="offense_defense_scatter")

st.divider()

# ============ HEAD-TO-HEAD COMPARISON ============
st.subheader("Head-to-Head Comparison")
st.caption("Compare two teams' season-to-date profiles side by side.")

team_options = teams.sort_values("full_name")["team"].tolist()
h2h_col1, h2h_col2 = st.columns(2)
with h2h_col1:
    team_a = st.selectbox("Team A", team_options,
                           format_func=lambda t: TEAM_INFO.get(t, {}).get("name", t),
                           key="h2h_team_a")
with h2h_col2:
    default_b_index = 1 if team_options[0] == team_a else 0
    team_b = st.selectbox("Team B", team_options,
                           format_func=lambda t: TEAM_INFO.get(t, {}).get("name", t),
                           index=default_b_index, key="h2h_team_b")

row_a = teams[teams["team"] == team_a].iloc[0]
row_b = teams[teams["team"] == team_b].iloc[0]

col_a, col_b = st.columns(2)
for col, row, other_row in [(col_a, row_a, row_b), (col_b, row_b, row_a)]:
    with col:
        color_bar(row["color"], height=8)
        logo_c, name_c = st.columns([1, 4])
        with logo_c:
            if row["logo"]:
                st.image(row["logo"], width=60)
        with name_c:
            st.markdown(f"### {row['full_name']}")

        st.metric("Off EPA/Play", f"{row['off_epa_per_play']:+.3f}",
                   delta=f"{row['off_epa_per_play'] - other_row['off_epa_per_play']:+.3f} vs opponent")
        st.metric("Def EPA/Play Allowed", f"{row['def_epa_per_play_allowed']:+.3f}",
                   delta=f"{other_row['def_epa_per_play_allowed'] - row['def_epa_per_play_allowed']:+.3f} vs opponent",
                   help="A positive delta here means this team's defense is better")
        st.metric("Net EPA/Play", f"{row['net_epa_per_play']:+.3f}",
                   delta=f"{row['net_epa_per_play'] - other_row['net_epa_per_play']:+.3f} vs opponent")

st.divider()

# ============ CLUB DEEP DIVE ============
st.subheader("Club Profile")

selected_team = st.selectbox(
    "Select a team",
    team_options,
    format_func=lambda t: TEAM_INFO.get(t, {}).get("name", t),
    key="club_profile_select",
)

team_row = teams[teams["team"] == selected_team].iloc[0]
color_bar(team_row["color"], height=10)
logo_col, info_col = st.columns([1, 6])
with logo_col:
    if team_row["logo"]:
        st.image(team_row["logo"], width=80)
with info_col:
    st.markdown(f"## {team_row['full_name']}")

form_join = ""
if current_form_week is not None:
    form_join = f"""
    LEFT JOIN `nfl-analytics-505917.nfl_dbt.player_rolling_form` prf
        ON pwe.player_id = prf.player_id
        AND prf.season = {current_season}
        AND prf.week = {current_form_week}
    """
form_value_select = "ANY_VALUE(prf.form_z_score) as form_z_score" if current_form_week is not None else "NULL as form_z_score"

roster = run_query(f"""
    SELECT
        pwe.player_id,
        COALESCE(ANY_VALUE(bio.full_name), ANY_VALUE(pwe.player_name)) as player_name,
        pwe.role,
        ANY_VALUE(bio.position) as position,
        ANY_VALUE(bio.headshot_url) as headshot_url,
        SUM(pwe.plays) as season_plays,
        SUM(pwe.total_epa) as season_total_epa,
        SUM(pwe.total_epa) / SUM(pwe.plays) as season_epa_per_play,
        SUM(pwe.yards) as season_yards,
        SUM(pwe.touchdowns) as season_touchdowns,
        SUM(pwe.turnovers) as season_turnovers,
        SUM(pwe.completions) as season_completions,
        {form_value_select}
    FROM `nfl-analytics-505917.nfl_dbt.player_week_epa` pwe
    LEFT JOIN `nfl-analytics-505917.nfl_dbt.stg_player_bio` bio
        ON pwe.player_id = bio.player_id
    {form_join}
    WHERE pwe.season = {current_season}
      AND pwe.season_type = 'REG'
      AND pwe.team = '{selected_team}'
    GROUP BY pwe.player_id, pwe.role
    HAVING SUM(pwe.plays) >= 20
    ORDER BY season_total_epa DESC
""")

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Qualifying Players", len(roster), help="Players with 20+ plays this season")
with col2:
    st.metric("Median Value (Total EPA)", f"{roster['season_total_epa'].median():+.2f}")
with col3:
    st.metric("Mean Value (Total EPA)", f"{roster['season_total_epa'].mean():+.2f}",
               help="Pulled by outliers — median is sturdier")

st.caption("Values are season-to-date, minimum 20 plays. Not comparable across roles.")

# Group roster by role for browsability
st.subheader("Squad by Value")
role_filter = st.multiselect(
    "Filter by role",
    options=["passer", "rusher", "receiver"],
    default=["passer", "rusher", "receiver"],
    format_func=lambda r: r.title(),
)
filtered_roster = roster[roster["role"].isin(role_filter)]

team_color = team_row["color"]
for i, row in filtered_roster.reset_index(drop=True).iterrows():
    form_tier = get_form_tier(row["form_z_score"])
    header = f"**{i+1}. {row['player_name']}** ({row['role'].title()}) — {row['season_total_epa']:+.2f} · Recent form: {form_tier}"

    color_bar(team_color, height=4)
    with st.expander(header):
        img_col, stats_col = st.columns([1, 4])

        with img_col:
            if row["headshot_url"]:
                st.image(row["headshot_url"], width=100)
            if row["position"]:
                st.caption(f"Position: {row['position']}")
            st.caption(f"Recent form: {form_tier}")

        with stats_col:
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Total EPA", f"{row['season_total_epa']:+.2f}")
            c2.metric("EPA/Play", f"{row['season_epa_per_play']:+.3f}")
            c3.metric("Plays", int(row['season_plays']))
            c4.metric("Yards", int(row['season_yards']))

            c5, c6, c7 = st.columns(3)
            td_label = "Passing TDs" if row["role"] == "passer" else (
                "Rushing TDs" if row["role"] == "rusher" else "Receiving TDs"
            )
            c5.metric(td_label, int(row['season_touchdowns']))
            turnover_label = "Interceptions" if row["role"] == "passer" else "Fumbles Lost"
            c6.metric(turnover_label, int(row['season_turnovers']))
            if row["role"] in ("passer", "receiver"):
                comp_label = "Completions" if row["role"] == "passer" else "Receptions"
                c7.metric(comp_label, int(row['season_completions']))

            # Weekly trend with league-average reference line
            weekly = run_query(f"""
                SELECT week, total_epa
                FROM `nfl-analytics-505917.nfl_dbt.player_week_epa`
                WHERE player_id = '{row["player_id"]}'
                  AND season = {current_season}
                  AND season_type = 'REG'
                  AND role = '{row["role"]}'
                ORDER BY week
            """)
            league_avg = run_query(f"""
                SELECT week, AVG(total_epa) as league_avg_epa
                FROM `nfl-analytics-505917.nfl_dbt.player_week_epa`
                WHERE season = {current_season}
                  AND season_type = 'REG'
                  AND role = '{row["role"]}'
                  AND plays >= 5
                GROUP BY week
                ORDER BY week
            """)

            if len(weekly) > 1:
                trend_fig = go.Figure()
                trend_fig.add_trace(go.Scatter(
                    x=weekly["week"], y=weekly["total_epa"],
                    mode="lines+markers", name=row["player_name"],
                    line=dict(color=team_color, width=3),
                ))
                if not league_avg.empty:
                    trend_fig.add_trace(go.Scatter(
                        x=league_avg["week"], y=league_avg["league_avg_epa"],
                        mode="lines", name=f"League avg ({row['role']})",
                        line=dict(color="gray", width=1, dash="dot"),
                    ))
                trend_fig.update_layout(
                    height=280, margin=dict(l=0, r=0, t=20, b=0),
                    xaxis_title="Week", yaxis_title="Total EPA",
                    legend=dict(orientation="h", yanchor="bottom", y=1.02),
                )
                st.plotly_chart(
                    trend_fig,
                    use_container_width=True,
                    key=f"trend_{row['player_id']}_{row['role']}"
                )
                