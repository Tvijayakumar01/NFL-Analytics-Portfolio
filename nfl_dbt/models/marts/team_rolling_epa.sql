select
    season,
    week,
    team,
    avg(off_epa_per_play) over (
        partition by team
        order by season, week
        rows between 4 preceding and 1 preceding
    ) as trailing_off_epa,
    avg(def_epa_per_play_allowed) over (
        partition by team
        order by season, week
        rows between 4 preceding and 1 preceding
    ) as trailing_def_epa_allowed,
    avg(off_success_rate) over (
        partition by team
        order by season, week
        rows between 4 preceding and 1 preceding
    ) as trailing_off_success_rate
from {{ ref('team_week_epa') }}