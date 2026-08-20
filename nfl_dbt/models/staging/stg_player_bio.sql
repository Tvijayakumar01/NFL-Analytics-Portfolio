with ranked as (
    select
        player_id,
        concat(first_name, ' ', last_name) as full_name,
        position,
        headshot_url,
        season,
        week,
        row_number() over (partition by player_id order by season desc, week desc) as rn
    from {{ source('nfl_raw', 'rosters') }}
    where player_id is not null
      and first_name is not null
      and last_name is not null
)
select player_id, full_name, position, headshot_url
from ranked
where rn = 1
