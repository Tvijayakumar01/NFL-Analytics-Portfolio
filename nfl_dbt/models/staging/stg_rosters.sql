select distinct
    season,
    week,
    player_id,
    position
from {{ source('nfl_raw', 'rosters') }}
where player_id is not null