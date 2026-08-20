with offense as (
    select
        season,
        week,
        season_type,
        posteam as team,
        play_type,
        epa,
        success
    from {{ ref('stg_pbp') }}
),

defense as (
    select
        season,
        week,
        season_type,
        defteam as team,
        epa
    from {{ ref('stg_pbp') }}
),

offense_agg as (
    select
        season,
        week,
        season_type,
        team,
        count(*) as off_plays,
        sum(epa) as off_total_epa,
        avg(epa) as off_epa_per_play,
        avg(cast(success as int64)) as off_success_rate,
        avg(case when play_type = 'pass' then epa end) as off_pass_epa_per_play,
        avg(case when play_type = 'run' then epa end) as off_rush_epa_per_play
    from offense
    group by season, week, season_type, team
),

defense_agg as (
    select
        season,
        week,
        season_type,
        team,
        count(*) as def_plays,
        sum(epa) as def_total_epa_allowed,
        avg(epa) as def_epa_per_play_allowed
    from defense
    group by season, week, season_type, team
)

select
    o.season,
    o.week,
    o.season_type,
    o.team,
    o.off_plays,
    o.off_total_epa,
    o.off_epa_per_play,
    o.off_success_rate,
    o.off_pass_epa_per_play,
    o.off_rush_epa_per_play,
    d.def_plays,
    d.def_total_epa_allowed,
    d.def_epa_per_play_allowed
from offense_agg o
join defense_agg d
    on o.season = d.season
    and o.week = d.week
    and o.season_type = d.season_type
    and o.team = d.team