export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <rect width="40" height="40" rx="9" fill="#e3122f" />
      <g transform="rotate(-35 20 20)">
        <ellipse cx="20" cy="20" rx="13" ry="7.5" fill="#fff" />
        <path d="M14.5 20h11M17 18v4M20 18v4M23 18v4" stroke="#e3122f" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Wordmark({ light = true }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="leading-none">
        <div className={`headline text-[22px] ${light ? "text-white" : "text-ink"}`}>Sunday Club</div>
        <div className={`mt-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.22em] ${light ? "text-white/55" : "text-sub"}`}>
          NFL Analytics
        </div>
      </div>
    </div>
  );
}
