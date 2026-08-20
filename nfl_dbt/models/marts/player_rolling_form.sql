with combined as (
    -- collapse passer/rusher/receiver roles into one row per player-week
    select
        season, week, team, player_id, player_name,
        sum(plays) as plays,
        sum(total_epa) as total_epa
    from {{ ref('player_week_epa') }}
    group by season, week, team, player_id, player_name
),

with_position as (
    select
        c.*,
        r.position
    from combined c
    left join {{ ref('stg_rosters') }} r
        on c.player_id = r.player_id
        and c.season = r.season
        and c.week = r.week
),

rolling as (
    -- trailing 4-week window per player (this week + prior 3)
    select
        *,
        sum(plays) over (
            partition by player_id
            order by season, week
            rows between 3 preceding and current row
        ) as rolling_plays,
        sum(total_epa) over (
            partition by player_id
            order by season, week
            rows between 3 preceding and current row
        ) as rolling_epa
    from with_position
),

rolling_rate as (
    select
        *,
        rolling_epa / nullif(rolling_plays, 0) as rolling_epa_per_play
    from rolling
    where rolling_plays >= 20  -- minimum sample size to be eligible
),

position_baseline as (
    -- league-average rate per position, per week, for shrinkage and z-scoring
    select
        season, week, position,
        avg(rolling_epa_per_play) as position_avg_epa_per_play,
        stddev(rolling_epa_per_play) as position_stddev_epa_per_play
    from rolling_rate
    group by season, week, position
),

shrunk as (
    select
        rr.*,
        pb.position_avg_epa_per_play,
        pb.position_stddev_epa_per_play,
        -- shrinkage: blend the player's own rate toward the position average,
        -- weighted by how much data we actually have (K = 30 plays)
        (rr.rolling_epa + 30 * pb.position_avg_epa_per_play)
            / (rr.rolling_plays + 30) as shrunk_epa_per_play
    from rolling_rate rr
    join position_baseline pb
        on rr.season = pb.season and rr.week = pb.week and rr.position = pb.position
)

select
    season, week, team, player_id, player_name, position,
    rolling_plays,
    rolling_epa_per_play,
    shrunk_epa_per_play,
    (shrunk_epa_per_play - position_avg_epa_per_play)
        / nullif(position_stddev_epa_per_play, 0) as form_z_score
from shrunk
