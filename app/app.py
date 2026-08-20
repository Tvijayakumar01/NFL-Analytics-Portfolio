"""
NFL EPA Lab - This Week page (main entry point)

Run from project root:
    streamlit run app/app.py
"""

import streamlit as st
import pandas as pd
from utils import run_query

st.set_page_config(page_title="NFL EPA Lab", layout="wide")

st.title("🏈 NFL EPA Lab")
st.caption("Every player, ranked by value added. Updated weekly.")


def get_tier(percentile: float) -> str:
    """Translate a percentile rank into a plain-language performance tier."""
    if percentile >= 0.90:
        return "🔥 Elite"
    elif percentile >= 0.75:
        return "✅ Great"
    elif percentile >= 0.50:
        return "👍 Good"
    elif percentile >= 0.25:
        return "😐 Below Average"
    else:
        return "❌ Struggled"


# Find the most recent regular-season week with data
latest = run_query("""
    SELECT season, week
    FROM `nfl-analytics-505917.nfl_dbt.player_week_epa`
    WHERE season_type = 'REG'
    ORDER BY season DESC, week DESC
    LIMIT 1
""")
current_season = int(latest.iloc[0]["season"])
current_week = int(latest.iloc[0]["week"])

st.subheader(f"Week {current_week} · {current_season} Season")

with st.expander("ℹ️ What do these stats mean?"):
    st.markdown("""
    **EPA (Expected Points Added)** measures how much a single play helped or hurt
    a team's chance of scoring, based on down, distance, and field position —
    not just raw yards. A big gain on 3rd-and-25 barely matters; the same gain
    on 3rd-and-3 can be a game-changer. This accounts for that context.

    **EPA per play** is a player's average impact per snap — a measure of
    *efficiency*, regardless of how many plays they were on the field for.

    **Success rate** is simpler: the percentage of plays that gained enough yardage
    to keep the offense "on schedule" for that down and distance.

    **Tiers** (🔥 Elite, ✅ Great, 👍 Good, 😐 Below Average, ❌ Struggled) show how a
    player's total EPA that week compares to everyone else at their position —
    Elite means top 10% at their role that week.
    """)

# Pull the full week's data once — everything else derives from this
full_week = run_query(f"""
    SELECT player_name, team, role, plays, total_epa, epa_per_play, success_rate
    FROM `nfl-analytics-505917.nfl_dbt.player_week_epa`
    WHERE season = {current_season} AND week = {current_week} AND season_type = 'REG'
""")

# Compute percentile rank and tier within each role
full_week["percentile"] = full_week.groupby("role")["total_epa"].rank(pct=True)
full_week["tier"] = full_week["percentile"].apply(get_tier)

# Headline: top performer of the week by total EPA
top_performer = full_week.sort_values("total_epa", ascending=False).iloc[0]
st.markdown(
    f"**{top_performer['player_name']}** ({top_performer['team']}) had a "
    f"**{top_performer['tier']}** week — **{top_performer['total_epa']:+.2f} EPA** "
    f"across {int(top_performer['plays'])} plays."
)

st.divider()

# Team of the Week: best performer per role, min 10 plays
st.subheader("Team of the Week")
st.caption("Best raw EPA performance per role · minimum 10 plays")

eligible = full_week[full_week["plays"] >= 10]
team_of_week = eligible.loc[eligible.groupby("role")["total_epa"].idxmax()]

if len(team_of_week) > 0:
    cols = st.columns(len(team_of_week))
    for i, (_, row) in enumerate(team_of_week.iterrows()):
        with cols[i]:
            st.metric(
                label=f"{row['player_name']} ({row['role'].title()})",
                value=f"{row['total_epa']:+.2f}",
                delta=row["tier"],
                delta_color="off",
                help=f"{row['team']} · {int(row['plays'])} plays · {row['epa_per_play']:.2f} EPA/play"
            )

st.divider()

# Full table for the week
st.subheader("Full Week Stats")
display_df = full_week[[
    "player_name", "team", "role", "tier", "plays",
    "total_epa", "epa_per_play", "success_rate"
]].sort_values("total_epa", ascending=False)

st.dataframe(
    display_df,
    use_container_width=True,
    hide_index=True,
    column_config={
        "player_name": st.column_config.TextColumn("Player"),
        "team": st.column_config.TextColumn("Team"),
        "role": st.column_config.TextColumn("Role"),
        "tier": st.column_config.TextColumn("Tier", help="Performance tier vs. others at this position this week"),
        "plays": st.column_config.NumberColumn("Plays"),
        "total_epa": st.column_config.NumberColumn(
            "Total EPA", format="%+.2f",
            help="Expected Points Added, summed across all plays this week"
        ),
        "epa_per_play": st.column_config.NumberColumn(
            "EPA/Play", format="%+.2f",
            help="Average EPA per play — a measure of efficiency, not volume"
        ),
        "success_rate": st.column_config.NumberColumn(
            "Success Rate", format="percent",
            help="Percentage of plays that gained enough yardage to stay on schedule for the down and distance"
        ),
    }
)