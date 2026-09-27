import { useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

const links = [
  { to: "/", label: "This Week", end: true },
  { to: "/teams", label: "Teams" },
  { to: "/schedule", label: "Schedule" },
  { to: "/predictions", label: "Predictions" },
  { to: "/method", label: "Method" },
];

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition ${isActive ? "font-bold text-white" : "text-muted hover:text-white"}`;

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-ink/70 px-6 py-4 backdrop-blur-md sm:px-10">
        <div className="text-lg font-bold text-white">🏈 NFL EPA Lab</div>

        <div className="hidden gap-7 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={desktopLinkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-white md:hidden"
        >
          <Menu size={18} />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 z-[70] flex h-full w-[78%] max-w-xs flex-col border-l border-line bg-panel p-6 md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="text-base font-bold text-white">🏈 NFL EPA Lab</span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/5 text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {links.map((l, i) => (
                  <motion.div
                    key={l.to}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 + i * 0.05, ease: EASE }}
                  >
                    <NavLink
                      to={l.to}
                      end={l.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `block rounded-xl px-4 py-3 text-base font-semibold transition ${
                          isActive ? "bg-pos/15 text-pos" : "text-white/85 hover:bg-white/5"
                        }`
                      }
                    >
                      {l.label}
                    </NavLink>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}