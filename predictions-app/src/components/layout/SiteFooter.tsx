import { Link } from "react-router-dom";
import { Wordmark } from "./Brand";
import { NAV_ITEMS } from "../../lib/nav";

export default function SiteFooter() {
  return (
    <footer className="mt-20 bg-navy text-white">
      <div className="h-1 bg-brand" />
      <div className="stripes">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              Play-by-play analytics, weekly recaps and model-driven picks — built on every snap since 1999 and
              refreshed daily.
            </p>
          </div>
          <div>
            <div className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white/45">Explore</div>
            <ul className="mt-3 space-y-2">
              {NAV_ITEMS.map((n) => (
                <li key={n.href}>
                  <Link to={n.href} className="text-sm text-white/75 hover:text-white">{n.name}</Link>
                </li>
              ))}
              <li><Link to="/ask" className="text-sm text-white/75 hover:text-white">Ask The Huddle</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white/45">About the data</div>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Play-by-play data from nflverse via nfl_data_py, warehoused in BigQuery and modeled with dbt and XGBoost.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-white/40 sm:flex-row sm:justify-between sm:px-6">
            <span>© {new Date().getFullYear()} Sunday Club · A portfolio analytics project</span>
            <span>Not affiliated with or endorsed by the NFL or its teams. Team logos belong to their owners.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
