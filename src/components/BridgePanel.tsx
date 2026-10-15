'use client';

import { useState } from 'react';
import type { BridgeHandle } from '@/hooks/useBridge';
import { btn, inputCls, KV, Notice } from './ui';

const BRIDGE_SOURCE_URL = 'https://github.com/achwanyaa/Achwanyaneural/tree/main/bridge';

export default function BridgePanel({ handle }: { handle: BridgeHandle }) {
  const { settings, setSettings, status, error, checking, checkStatus } = handle;
  const [draft, setDraft] = useState(settings);
  const dirty = draft.url !== settings.url || draft.token !== settings.token || draft.riskPct !== settings.riskPct;
  const maxRisk = status?.max_risk_pct ?? 2;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="h-full space-y-4 overflow-y-auto p-3">
      {status ? (
        <div className="space-y-2">
          {!status.account.demo && <Notice tone="warn">Live account. Orders use real money.</Notice>}
          {!status.trade_allowed && <Notice tone="warn">Trading is disabled in MT5. Enable Algo Trading.</Notice>}
          <KV
            rows={[
              { label: 'Status', value: status.account.demo ? 'Connected · demo' : 'Connected · live', cls: status.account.demo ? 'text-up' : 'text-warn' },
              { label: 'Account', value: `#${status.account.login} · ${status.account.server}` },
              { label: 'Balance', value: `${fmt(status.account.balance)} ${status.account.currency}` },
              { label: 'Equity', value: `${fmt(status.account.equity)} ${status.account.currency}` },
            ]}
          />
        </div>
      ) : (
        <Notice tone={error ? 'down' : 'muted'}>{error ?? (settings.token ? 'Not connected.' : 'Not connected. Start the bridge and paste its token below.')}</Notice>
      )}

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSettings({ ...draft, riskPct: Math.min(Math.max(draft.riskPct, 0.01), maxRisk) });
        }}
      >
        <Field label="Bridge URL">
          <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className={inputCls} spellCheck={false} />
        </Field>
        <Field label="Token">
          <input
            type="password"
            value={draft.token}
            onChange={(e) => setDraft({ ...draft, token: e.target.value.trim() })}
            placeholder="Printed when the bridge first starts"
            className={inputCls}
            autoComplete="off"
          />
        </Field>
        <Field label={`Risk per trade, % of balance (max ${maxRisk})`}>
          <input
            type="number"
            min={0.01}
            max={maxRisk}
            step="any"
            value={draft.riskPct}
            onChange={(e) => setDraft({ ...draft, riskPct: Number(e.target.value) })}
            className={`${inputCls} num`}
          />
        </Field>
        <div className="flex gap-2">
          <button type="submit" disabled={!dirty} className={`${btn.base} ${btn.primary} flex-1`}>
            Save
          </button>
          <button type="button" onClick={() => void checkStatus()} disabled={checking} className={`${btn.base} ${btn.secondary} flex-1`}>
            {checking ? 'Testing…' : 'Test connection'}
          </button>
        </div>
      </form>

      <section className="space-y-2 border-t border-line pt-3 text-xs leading-relaxed text-muted">
        <h3 className="text-[13px] font-semibold text-ink">Setup</h3>
        <p>Windows, with MetaTrader 5 running and logged in.</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            Download the{' '}
            <a href={BRIDGE_SOURCE_URL} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              bridge folder
            </a>{' '}
            and run <code className="font-mono text-ink">pip install -r requirements.txt</code>.
          </li>
          <li>
            Run <code className="font-mono text-ink">python mt5_bridge.py</code> and paste the token it prints.
          </li>
          <li>
            For the deployed site, add its URL to <code className="font-mono text-ink">allowed_origins</code> in{' '}
            <code className="font-mono text-ink">bridge_config.json</code>, then restart the bridge.
          </li>
          <li>Enable Algo Trading in MT5. Start on a demo account.</li>
        </ol>
        <p className="text-faint">Use Chrome or Edge. Safari blocks HTTPS pages from reaching a local bridge.</p>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
