import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";
import { Wordmark } from "./Brand";
import { NAV_ITEMS } from "../../lib/nav";


export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-navy text-white shadow-[0_6px_20px_-12px_rgb(0_0_0/0.6)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" onClick={close} aria-label="Sunday Club home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden h-full items-stretch lg:flex" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className={({ isActive }) =>
                `relative flex items-center px-3.5 font-display text-[17px] font-bold uppercase tracking-[0.04em] transition-colors ${
                  isActive ? "text-white" : "text-white/65 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.name}
                  <span
                    className={`absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-brand transition-transform ${isActive ? "scale-x-100" : "scale-x-0"}`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/ask" className="btn btn-primary hidden py-2! sm:inline-flex">
            <Sparkles size={15} /> Ask The Huddle
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/10 bg-navy-2 lg:hidden"
            aria-label="Mobile"
          >
            <div className="px-4 py-3">
              {[...NAV_ITEMS, { name: "Ask The Huddle", href: "/ask", hint: "AI answers from the data", end: false }].map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  onClick={close}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-lg px-3 py-3 ${isActive ? "bg-white/10" : "hover:bg-white/5"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`headline text-2xl ${isActive ? "text-white" : "text-white/80"}`}>{item.name}</span>
                      <span className="text-xs text-white/45">{item.hint}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
