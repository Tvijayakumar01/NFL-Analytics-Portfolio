select
    s.game_id,
    s.season,
    s.week,
    s.home_team,
    s.away_team,
    s.home_score,
    s.away_score,
    case when s.home_score > s.away_score then 1 else 0 end as home_team_won,

    home_form.trailing_off_epa as home_trailing_off_epa,
    home_form.trailing_def_epa_allowed as home_trailing_def_epa_allowed,
    home_form.trailing_off_success_rate as home_trailing_off_success_rate,

    away_form.trailing_off_epa as away_trailing_off_epa,
    away_form.trailing_def_epa_allowed as away_trailing_def_epa_allowed,
    away_form.trailing_off_success_rate as away_trailing_off_success_rate

from {{ source('nfl_raw', 'schedules') }} s
left join {{ ref('team_rolling_epa') }} home_form
    on s.home_team = home_form.team
    and s.season = home_form.season
    and s.week = home_form.week
left join {{ ref('team_rolling_epa') }} away_form
    on s.away_team = away_form.team
    and s.season = away_form.season
    and s.week = away_form.week
where s.home_score is not null
  and home_form.trailing_off_epa is not null
  and away_form.trailing_off_epa is not null