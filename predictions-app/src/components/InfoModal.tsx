import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";
import { SlashMark } from "./Page";

const EASE = [0.16, 1, 0.3, 1] as const;

export type InfoItem = { title: string; desc: string };

export function InfoModal({ open, onClose, title, items }: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: InfoItem[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="pointer-events-auto max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <div className="stripes flex items-center justify-between gap-4 bg-navy px-6 py-4 text-white">
                <h3 className="headline flex items-center gap-2.5 text-2xl">
                  <SlashMark className="h-5 w-1.5" /> {title}
                </h3>
                <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[calc(85vh-4rem)] space-y-3 overflow-y-auto p-6">
                {items.map((c) => (
                  <div key={c.title} className="border-l-[3px] border-brand pl-4">
                    <div className="font-display text-lg font-bold uppercase tracking-wide text-ink">{c.title}</div>
                    <div className="mt-0.5 text-sm leading-relaxed text-sub">{c.desc}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Info trigger sized for the navy page hero. */
export function InfoButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="tab-dark shrink-0 py-1.5!">
      <Info size={15} />
      <span className="hidden sm:inline">Glossary</span>
    </button>
  );
}
