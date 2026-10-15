'use client';

import dynamic from 'next/dynamic';

// The terminal reads browser-only state (bridge settings in localStorage) on first render,
// so it renders on the client only.
const Terminal = dynamic(() => import('./Terminal'), {
  ssr: false,
  loading: () => <div className="grid h-dvh place-items-center text-xs text-muted">Loading…</div>,
});

export default function TerminalLoader() {
  return <Terminal />;
}
