import Link from "next/link";
import { FlaskConical, ShieldCheck } from "lucide-react";

export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-8">
          <Link
            href="/"
            aria-label="Live Session Lab home"
            className="flex min-h-11 items-center gap-3 rounded-lg font-semibold tracking-tight"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FlaskConical className="size-5" aria-hidden="true" />
            </span>
            Live Session Lab
          </Link>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none sm:px-8 sm:py-12"
      >
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t px-4 py-6 text-sm text-muted-foreground sm:px-8">
        <p>An independent experiment in browser video.</p>
        <p className="flex items-center gap-2">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          For test conversations only.
        </p>
      </footer>
    </div>
  );
}
