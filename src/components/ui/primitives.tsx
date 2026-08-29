import Link from "next/link";

/** Shared styling primitives. Keeping these in one place is what makes a palette
 * change a one-file edit instead of a search-and-replace across every component. */

export const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-paper-sunken disabled:text-ink-faint sm:py-2 sm:text-sm";

export const buttonPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50 sm:min-h-10";

export const buttonSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken disabled:opacity-50 sm:min-h-10";

export const buttonQuiet =
  "inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-brand transition-colors hover:bg-brand-soft";

export function Card({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(43,37,33,0.04)] sm:p-5 ${className}`}
    >
      {title && (
        <h2 className="font-display text-sm font-semibold tracking-wide text-ink-muted uppercase">
          {title}
        </h2>
      )}
      {description && <p className="mt-1 text-sm text-ink-faint">{description}</p>}
      {(title || description) && <div className="mt-4" />}
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-brand-line bg-brand-soft text-brand",
    warning: "border-gold-line bg-gold-soft text-notice",
    danger: "border-danger/30 bg-danger-soft text-danger",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className={buttonPrimary}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
