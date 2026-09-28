import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trophy, Target, Star, Shield, Sparkles } from "lucide-react";
import { Container, PageHero } from "../components/Page";
import { BrandMark } from "../components/layout/Brand";

const EASE = [0.16, 1, 0.3, 1] as const;
const WORKER_URL = "https://nfl-epa-lab-ask.tvijayakumar.workers.dev";

const EXAMPLE_QUESTIONS = [
  { icon: Trophy, label: "Top Team", question: "Which team has the best net EPA per play this season?" },
  { icon: Target, label: "This Week", question: "Who is favored to win this week's biggest game?" },
  { icon: Star, label: "Top QB", question: "Which quarterback has the best EPA per play?" },
  { icon: Shield, label: "Best Defense", question: "What team has the toughest defense this season?" },
];

type Exchange = {
  question: string;
  answer: string;
};

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
      <BrandMark size={32} />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-page px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-sub"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function Ask() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [params, setParams] = useSearchParams();
  const handledQuery = useRef(false);

  async function askQuestion(question: string) {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setInput("");

    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }
      setHistory((h) => [...h, { question, answer: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach the assistant. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  // A question passed from the home page search box (?q=...) is asked once on arrival.
  useEffect(() => {
    const q = params.get("q");
    if (q && !handledQuery.current) {
      handledQuery.current = true;
      setParams({}, { replace: true });
      askQuestion(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    askQuestion(input);
  }

  const pending = loading && history.length === 0;

  return (
    <>
      <PageHero
        eyebrow={<span className="inline-flex items-center gap-1.5"><Sparkles size={14} /> AI-Powered</span>}
        title="The Huddle"
        lede="Ask a plain-English question about this season's teams, players, standings, or upcoming games — answered using the real data behind this site."
      />

      <Container className="max-w-4xl! pt-8">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3">
            <BrandMark size={28} />
            <div>
              <div className="font-display text-lg font-bold uppercase leading-none tracking-wide text-ink">Huddle Assistant</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-sub">
                <span className="h-1.5 w-1.5 rounded-full bg-pos" /> Answers from this season's data
              </div>
            </div>
          </div>

          <div className="min-h-[340px] space-y-6 p-5 sm:p-6">
            {history.length === 0 && !pending && (
              <div>
                <div className="eyebrow mb-3">Try asking</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {EXAMPLE_QUESTIONS.map((q, i) => (
                    <motion.button
                      key={q.question}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.05, ease: EASE }}
                      onClick={() => askQuestion(q.question)}
                      className="group flex items-start gap-3 rounded-xl border border-line p-4 text-left transition hover:border-navy hover:bg-page"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
                        <q.icon size={17} />
                      </div>
                      <div>
                        <div className="font-display text-sm font-bold uppercase tracking-wider text-sub">{q.label}</div>
                        <div className="mt-0.5 text-sm font-medium leading-snug text-ink">{q.question}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {history.map((exchange, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-4 py-3 text-sm font-medium text-white">
                      {exchange.question}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5"><BrandMark size={32} /></div>
                    <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tl-sm bg-page px-4 py-3 text-[15px] leading-relaxed text-ink">
                      {exchange.answer}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && <TypingIndicator />}

            {error && (
              <div className="rounded-lg border-l-4 border-neg bg-neg/5 px-4 py-3 text-sm text-neg">{error}</div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="sticky bottom-0 border-t border-line bg-white p-3 sm:p-4">
            <div className="flex items-center gap-2 rounded-full border border-line bg-page p-1.5 pl-5 transition focus-within:border-navy focus-within:bg-white">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about teams, players, or predictions…"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink placeholder:text-sub focus:outline-none"
                disabled={loading}
                aria-label="Your question"
              />
              <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary px-4!" aria-label="Send">
                <Send size={15} /> <span className="hidden sm:inline">Ask</span>
              </button>
            </div>
          </form>
        </div>
      </Container>
    </>
  );
}
