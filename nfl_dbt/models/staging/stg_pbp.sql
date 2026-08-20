select
    game_id,
    season,
    week,
    season_type,
    posteam,
    defteam,
    play_type,
    down,
    ydstogo,
    yards_gained,
    epa,
    success,
    passer_player_id,
    passer_player_name,
    rusher_player_id,
    rusher_player_name,
    receiver_player_id,
    receiver_player_name,
    complete_pass,
    interception,
    fumble_lost,
    touchdown,
    sack
from {{ source('nfl_raw', 'pbp') }}
where epa is not null
  and play_type in ('pass', 'run')