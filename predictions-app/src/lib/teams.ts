export type TeamInfo = {
  name: string;
  color: string;
  logo: string;
  conference: "AFC" | "NFC";
  division: string;
};

export const TEAM_INFO: Record<string, TeamInfo> = {
  ARI: { name: "Arizona Cardinals", color: "#97233F", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png", conference: "NFC", division: "West" },
  ATL: { name: "Atlanta Falcons", color: "#A71930", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png", conference: "NFC", division: "South" },
  BAL: { name: "Baltimore Ravens", color: "#241773", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png", conference: "AFC", division: "North" },
  BUF: { name: "Buffalo Bills", color: "#00338D", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png", conference: "AFC", division: "East" },
  CAR: { name: "Carolina Panthers", color: "#0085CA", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/car.png", conference: "NFC", division: "South" },
  CHI: { name: "Chicago Bears", color: "#0B162A", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png", conference: "NFC", division: "North" },
  CIN: { name: "Cincinnati Bengals", color: "#FB4F14", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png", conference: "AFC", division: "North" },
  CLE: { name: "Cleveland Browns", color: "#311D00", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png", conference: "AFC", division: "North" },
  DAL: { name: "Dallas Cowboys", color: "#041E42", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png", conference: "NFC", division: "East" },
  DEN: { name: "Denver Broncos", color: "#FB4F14", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/den.png", conference: "AFC", division: "West" },
  DET: { name: "Detroit Lions", color: "#0076B6", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/det.png", conference: "NFC", division: "North" },
  GB: { name: "Green Bay Packers", color: "#203731", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png", conference: "NFC", division: "North" },
  HOU: { name: "Houston Texans", color: "#03202F", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png", conference: "AFC", division: "South" },
  IND: { name: "Indianapolis Colts", color: "#002C5F", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png", conference: "AFC", division: "South" },
  JAX: { name: "Jacksonville Jaguars", color: "#101820", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png", conference: "AFC", division: "South" },
  KC: { name: "Kansas City Chiefs", color: "#E31837", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png", conference: "AFC", division: "West" },
  LA: { name: "Los Angeles Rams", color: "#003594", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png", conference: "NFC", division: "West" },
  LAC: { name: "Los Angeles Chargers", color: "#0080C6", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png", conference: "AFC", division: "West" },
  LV: { name: "Las Vegas Raiders", color: "#000000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png", conference: "AFC", division: "West" },
  MIA: { name: "Miami Dolphins", color: "#008E97", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png", conference: "AFC", division: "East" },
  MIN: { name: "Minnesota Vikings", color: "#4F2683", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/min.png", conference: "NFC", division: "North" },
  NE: { name: "New England Patriots", color: "#002244", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png", conference: "AFC", division: "East" },
  NO: { name: "New Orleans Saints", color: "#D3BC8D", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/no.png", conference: "NFC", division: "South" },
  NYG: { name: "New York Giants", color: "#0B2265", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png", conference: "NFC", division: "East" },
  NYJ: { name: "New York Jets", color: "#125740", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png", conference: "AFC", division: "East" },
  PHI: { name: "Philadelphia Eagles", color: "#004C54", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png", conference: "NFC", division: "East" },
  PIT: { name: "Pittsburgh Steelers", color: "#FFB612", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png", conference: "AFC", division: "North" },
  SEA: { name: "Seattle Seahawks", color: "#002244", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png", conference: "NFC", division: "West" },
  SF: { name: "San Francisco 49ers", color: "#AA0000", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png", conference: "NFC", division: "West" },
  TB: { name: "Tampa Bay Buccaneers", color: "#D50A0A", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png", conference: "NFC", division: "South" },
  TEN: { name: "Tennessee Titans", color: "#4B92DB", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png", conference: "AFC", division: "South" },
  WAS: { name: "Washington Commanders", color: "#5A1414", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png", conference: "NFC", division: "East" },
};