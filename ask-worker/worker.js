// worker.js
// Cloudflare Worker: securely answers natural-language questions about the
// NFL EPA Lab site using Claude, with your API key kept server-side.

const DATA_BASE = "https://tvijayakumar01.github.io/NFL-Analytics-Portfolio/data";

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function buildContext() {
  const [teamsRes, scheduleRes, upcomingRes, thisWeekRes] = await Promise.all([
    fetch(`${DATA_BASE}/teams.json`),
    fetch(`${DATA_BASE}/schedule.json`),
    fetch(`${DATA_BASE}/upcoming_predictions.json`),
    fetch(`${DATA_BASE}/this_week.json`),
  ]);

  const [teams, schedule, upcoming, thisWeek] = await Promise.all([
    teamsRes.json(),
    scheduleRes.json(),
    upcomingRes.json(),
    thisWeekRes.json(),
  ]);

  const trimmedRosters = {};
  for (const [team, players] of Object.entries(teams.rosters)) {
    trimmedRosters[team] = players.map(({ weekly, ...rest }) => rest);
  }

  return {
    season: teams.season,
    standings: teams.league,
    rosters: trimmedRosters,
    schedule: schedule.games,
    upcoming_predictions: upcoming.games,
    latest_week_highlights: thisWeek.weeks[String(thisWeek.latest_week)],
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let question;
    try {
      const body = await request.json();
      question = body.question;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!question || typeof question !== "string" || question.length > 500) {
      return jsonResponse({ error: "Missing or invalid 'question' field" }, 400);
    }

    try {
      const context = await buildContext();

      const systemPrompt = `You are a friendly NFL analytics assistant for a site called "NFL EPA Lab". You're explaining things to someone who may not follow football closely AND may not know anything about advanced stats — assume no prior knowledge of either.

Answer using ONLY the JSON data provided below — never use outside knowledge about the NFL.

How to write your answers:
- Write like you're talking to a friend, in plain sentences — not a bulleted stat sheet.
- Never show a raw decimal number (like "0.148 EPA per play") without immediately translating it into a plain-English verdict, like "which is decent, but not among the league's best."
- If you mention EPA at all, briefly remind the reader what it means in one short phrase the first time (e.g., "EPA, a measure of how much a player helps their team score") — don't assume they remember what it stands for.
- Compare things in relative, everyday terms first ("one of the best," "middle of the pack," "well below average") — precise numbers can follow afterward as a supporting detail, not the headline.
- Avoid jargon like "ranked 11th," "net EPA," or listing multiple comparison players with their exact decimals — one comparison is usually enough, described in plain terms.
- Keep it short: 2-4 sentences is often enough. Only go longer if the question genuinely needs more.
- If the data doesn't contain what's needed to answer, say so honestly and simply, rather than guessing.

DATA:
${JSON.stringify(context)}`;

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: question }],
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        return jsonResponse({ error: "Upstream API error", detail: errText }, 502);
      }

      const data = await anthropicRes.json();
      const answer = data.content?.[0]?.text ?? "No answer generated.";

      return jsonResponse({ answer });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  },
};