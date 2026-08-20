with passing as (
    select
        season, week, season_type, posteam as team,
        passer_player_id as player_id,
        passer_player_name as player_name,
        'passer' as role,
        epa, success,
        cast(coalesce(yards_gained, 0) as int64) as yards,
        cast(coalesce(touchdown, 0) as int64) as touchdown,
        cast(coalesce(interception, 0) as int64) as turnover,
        cast(coalesce(complete_pass, 0) as int64) as completion
    from {{ ref('stg_pbp') }}
    where play_type = 'pass' and passer_player_id is not null
),

rushing as (
    select
        season, week, season_type, posteam as team,
        rusher_player_id as player_id,
        rusher_player_name as player_name,
        'rusher' as role,
        epa, success,
        cast(coalesce(yards_gained, 0) as int64) as yards,
        cast(coalesce(touchdown, 0) as int64) as touchdown,
        cast(coalesce(fumble_lost, 0) as int64) as turnover,
        0 as completion
    from {{ ref('stg_pbp') }}
    where play_type = 'run' and rusher_player_id is not null
),

receiving as (
    select
        season, week, season_type, posteam as team,
        receiver_player_id as player_id,
        receiver_player_name as player_name,
        'receiver' as role,
        epa, success,
        cast(coalesce(yards_gained, 0) as int64) as yards,
        cast(coalesce(touchdown, 0) as int64) as touchdown,
        cast(coalesce(fumble_lost, 0) as int64) as turnover,
        cast(coalesce(complete_pass, 0) as int64) as completion
    from {{ ref('stg_pbp') }}
    where play_type = 'pass' and receiver_player_id is not null
),

combined as (
    select * from passing
    union all
    select * from rushing
    union all
    select * from receiving
)

select
    season,
    week,
    season_type,
    team,
    player_id,
    player_name,
    role,
    count(*) as plays,
    sum(epa) as total_epa,
    avg(epa) as epa_per_play,
    avg(cast(success as int64)) as success_rate,
    sum(yards) as yards,
    sum(touchdown) as touchdowns,
    sum(turnover) as turnovers,
    sum(completion) as completions
from combined
group by season, week, season_type, team, player_id, player_name, role