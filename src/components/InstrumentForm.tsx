// Renders any assessment instrument from its declarative definition (lib/instruments)
// and auto-scores it live. Supports per-item input types (scale, yes/no, text,
// textarea, number, sub-heading) so a single form can mix a rating scale with
// free-text summaries (e.g. Sensory) or checklists with notes (e.g. EA).
import type { CSSProperties } from 'react';
import type { Instrument, ScoreResult, InstrItem } from '../lib/instruments';
import { scoreInstrument, scorableCodes, requiresAllItems, itemInput } from '../lib/instruments';
import type { AssessToolScore } from '../lib/types';

const BAND: Record<string, { bg: string; fg: string }> = {
  success: { bg: '#e7f6ee', fg: '#0f7b46' },
  info: { bg: '#e8f0fe', fg: '#1d4ed8' },
  warning: { bg: '#fdf0dd', fg: '#a4630a' },
  danger: { bg: '#fdecec', fg: '#c02626' },
  muted: { bg: '#eef1f4', fg: '#5d6b7a' },
};

function seg(on: boolean): CSSProperties {
  return {
    minWidth: 30, height: 30, padding: '0 7px', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
    border: '1px solid ' + (on ? '#1d4ed8' : '#d3dae1'),
    background: on ? '#e8f0fe' : '#fff', color: on ? '#1d4ed8' : '#5d6b7a',
  };
}

export default function InstrumentForm({ inst, value, onChange }:
  { inst: Instrument; value: AssessToolScore; onChange: (v: AssessToolScore) => void }) {
  const resp: Record<string, string> = value.responses || {};
  const result: ScoreResult | null = inst.scored ? scoreInstrument(inst, resp) : null;

  const codes = scorableCodes(inst);
  const answered = codes.filter((c) => resp[c] !== undefined && resp[c] !== '').length;
  const showCounter = inst.scored && requiresAllItems(inst);

  const setItem = (code: string, val: string) => {
    const next = { ...resp, [code]: val };
    const patch: AssessToolScore = { ...value, responses: next };
    if (inst.scored) {
      const r = scoreInstrument(inst, next);
      if (r) {
        patch.total = r.total; patch.band = r.band; patch.bandClass = r.bandClass;
        patch.domains = r.domains; patch.interpretation = r.interpretation; patch.autoScored = true;
        patch.score = `${r.total} — ${r.band}`;
      }
    }
    onChange(patch);
  };

  const bandColor = result ? (BAND[result.bandClass] || BAND.muted) : BAND.muted;

  const renderControl = (it: InstrItem) => {
    const input = itemInput(inst, it);
    const v = resp[it.code] ?? '';
    if (input === 'subhead') return null;
    if (input === 'scale' || input === 'choice') {
      const opts = it.options || inst.scale || {};
      return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 'none' }}>
          {Object.entries(opts).map(([val, label]) => (
            <button type="button" key={val} title={label} style={seg(v === val)}
              onClick={() => setItem(it.code, v === val ? '' : val)}>{val}</button>
          ))}
        </div>
      );
    }
    if (input === 'yesno') {
      return (
        <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
          {['Yes', 'No'].map((y) => (
            <button type="button" key={y} style={seg(v === y)} onClick={() => setItem(it.code, v === y ? '' : y)}>{y}</button>
          ))}
        </div>
      );
    }
    if (input === 'binary') {
      return <input type="checkbox" checked={v === '1'} style={{ width: 16, height: 16 }} onChange={(e) => setItem(it.code, e.target.checked ? '1' : '')} />;
    }
    if (input === 'numeric') {
      return <input type="number" min={0} value={v} style={{ maxWidth: 120 }} onChange={(e) => setItem(it.code, e.target.value)} />;
    }
    if (input === 'select') {
      const opts = it.options || {};
      return (
        <select value={v} onChange={(e) => setItem(it.code, e.target.value)} style={{ maxWidth: 320 }}>
          <option value="">—</option>
          {Object.entries(opts).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      );
    }
    if (input === 'text') {
      return <input value={v} onChange={(e) => setItem(it.code, e.target.value)} />;
    }
    return <textarea rows={2} value={v} onChange={(e) => setItem(it.code, e.target.value)} />;
  };

  return (
    <div style={{ border: '1px solid #e4e9ee', borderRadius: 10, padding: 14, background: '#fafbfc', marginTop: 8 }}>
      {inst.note && <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>{inst.note}</p>}

      {inst.scale && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#5d6b7a', margin: '4px 0 12px' }}>
          {Object.entries(inst.scale).map(([v, l]) => <span key={v}><b>{v}</b> {l}</span>)}
        </div>
      )}

      {inst.scored && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '8px 0 12px' }}>
          {result && (
            <div><div style={{ fontSize: 11, color: '#5d6b7a' }}>Total</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{result.total}</div></div>
          )}
          {result && <span style={{ background: bandColor.bg, color: bandColor.fg, padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: 13 }}>{result.band}</span>}
          {showCounter && (
            <span style={{ fontSize: 12, color: answered < codes.length ? '#a4630a' : '#0f7b46' }}>
              {answered} / {codes.length} answered{answered < codes.length ? ` — ${codes.length - answered} left` : ' — complete'}
            </span>
          )}
        </div>
      )}

      {result && result.domains.length > 0 && (
        <div style={{ margin: '0 0 12px' }}>
          {result.domains.map((d) => {
            const pct = d.max ? Math.round((d.score / d.max) * 100) : 0;
            return (
              <div key={d.domain} style={{ margin: '6px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>{d.domain}</span><span style={{ color: '#5d6b7a' }}>{d.score} / {d.max} · {pct}%</span>
                </div>
                <div style={{ height: 7, background: '#eef1f4', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: '#0f766e' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {inst.sections.map((sec, si) => (
        <div key={si} style={{ marginTop: 12 }}>
          <h4 style={{ margin: '6px 0', fontSize: 13, color: '#0b574f' }}>{sec.name}</h4>
          {sec.items.map((it, ii) => {
            const input = itemInput(inst, it);
            if (input === 'subhead') return <h5 key={it.code} style={{ margin: '10px 0 2px', fontSize: 12.5, color: '#5f5e5a' }}>{it.text}</h5>;
            const stacked = input === 'textarea' || input === 'text' || input === 'numeric' || input === 'select';
            return (
              <div key={it.code} style={{ padding: '7px 0', borderTop: ii === 0 ? 'none' : '1px solid #eef1f4' }}>
                <div style={{ display: 'flex', alignItems: stacked ? 'stretch' : 'flex-start', gap: 10, flexDirection: stacked ? 'column' : 'row' }}>
                  <div style={{ flex: 1, fontSize: 13.5 }}>{it.text}{it.help && <span style={{ color: '#8b97a4', fontSize: 11.5 }}> — {it.help}</span>}</div>
                  {renderControl(it)}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
