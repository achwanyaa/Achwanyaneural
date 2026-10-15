/** Small shared building blocks so every panel uses the same density, borders and buttons. */

export const btn = {
  base: 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] px-3 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40',
  primary: 'bg-accent text-white hover:brightness-110',
  buy: 'bg-up text-white hover:brightness-110',
  sell: 'bg-down text-white hover:brightness-110',
  secondary: 'border border-line-strong text-ink hover:bg-raised',
  ghost: 'text-muted hover:bg-raised hover:text-ink',
};

export const inputCls =
  'h-8 w-full rounded-[3px] border border-line-strong bg-bg px-2 text-[13px] outline-none placeholder:text-faint focus:border-accent';

export function KV({ rows }: { rows: { label: string; value: React.ReactNode; cls?: string }[] }) {
  return (
    <dl className="border-y border-line">
      {rows.map((r, i) => (
        <div key={r.label} className={`flex h-8 items-center justify-between ${i > 0 ? 'border-t border-line' : ''}`}>
          <dt className="text-muted">{r.label}</dt>
          <dd className={`num font-medium ${r.cls ?? 'text-ink'}`}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({ tone, children }: { tone: 'down' | 'up' | 'warn' | 'muted'; children: React.ReactNode }) {
  const cls = {
    down: 'border-down/40 text-down',
    up: 'border-up/40 text-up',
    warn: 'border-warn/50 text-warn',
    muted: 'border-line text-muted',
  }[tone];
  return <div className={`border-l-2 bg-raised/50 px-3 py-2 text-xs leading-relaxed ${cls}`}>{children}</div>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-[13px] text-muted">{title}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}
