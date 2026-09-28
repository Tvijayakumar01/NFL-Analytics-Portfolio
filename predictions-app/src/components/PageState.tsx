import { AlertCircle } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-line" />
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-brand" />
      </div>
      <span className="eyebrow">{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="card flex max-w-md items-start gap-3 border-l-4 border-l-neg p-5 text-sm">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-neg" />
        <div>
          <div className="font-semibold text-ink">Something went wrong</div>
          <div className="mt-1 text-sub">{message}</div>
        </div>
      </div>
    </div>
  );
}

/** Grey placeholder block for sections still loading. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#e3e7ed] ${className}`} />;
}
