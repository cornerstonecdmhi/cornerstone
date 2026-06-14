// Builds a printable / downloadable document for an assessment, reproducing each
// instrument in its SOURCE-FORM layout (no clinic letterhead — "headers not
// needed"): scored scales render as an item grid with the rating columns and the
// chosen response ticked; narrative/checklist forms render as labelled fields.
// Save-as-PDF from the browser's print dialog gives the downloadable template.
import type { Assessment } from './types';
import { instrumentForTool, itemInput, scoreInstrument, type Instrument } from './instruments';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function renderInstrument(inst: Instrument, resp: Record<string, string>): string {
  const result = inst.scored ? scoreInstrument(inst, resp) : null;
  let html = '';

  if (result) {
    html += `<div class="result"><span class="big">${result.total}</span> <span class="band">${esc(result.band)}</span></div>`;
    if (result.domains.length) {
      html += '<table class="dom"><tbody>' + result.domains.map((d) =>
        `<tr><td>${esc(d.domain)}</td><td class="n">${d.score} / ${d.max}</td><td class="n">${d.max ? Math.round(d.score / d.max * 100) : 0}%</td></tr>`).join('') + '</tbody></table>';
    }
    if (result.interpretation) html += `<p class="interp">${esc(result.interpretation)}</p>`;
  }

  for (const s of inst.sections) {
    // Decide if this section is a uniform rating grid (all items share the instrument scale).
    const gridItems = s.items.filter((it) => { const k = itemInput(inst, it); return k === 'scale' || k === 'choice'; });
    const otherItems = s.items.filter((it) => { const k = itemInput(inst, it); return !(k === 'scale' || k === 'choice'); });
    html += `<h3>${esc(s.name)}</h3>`;

    if (gridItems.length && inst.scale) {
      const cols = Object.keys(inst.scale);
      html += '<table class="grid"><thead><tr><th class="qt">Item</th>' + cols.map((c) => `<th class="opt">${esc(c)}</th>`).join('') + '</tr></thead><tbody>';
      for (const it of gridItems) {
        const v = resp[it.code] || '';
        html += `<tr><td class="qt">${esc(it.text)}</td>` + cols.map((c) => `<td class="opt">${v === c ? '✓' : ''}</td>`).join('') + '</tr>';
      }
      html += '</tbody></table>';
    }

    for (const it of otherItems) {
      const k = itemInput(inst, it);
      const v = resp[it.code] || '';
      if (k === 'subhead') { html += `<h4>${esc(it.text)}</h4>`; continue; }
      if (k === 'binary') { html += `<div class="kv"><span class="lbl">${esc(it.text)}</span><span class="val">${v === '1' ? '✓' : '—'}</span></div>`; continue; }
      if (k === 'select') { const lbl = it.options && v ? (it.options[v] || v) : v; html += `<div class="kv"><span class="lbl">${esc(it.text)}</span><span class="val">${esc(lbl) || '<i>—</i>'}</span></div>`; continue; }
      if (k === 'numeric' || k === 'text' || k === 'yesno') { html += `<div class="kv"><span class="lbl">${esc(it.text)}</span><span class="val">${esc(v) || '<i>—</i>'}</span></div>`; continue; }
      // textarea
      html += `<div class="ta"><div class="lbl">${esc(it.text)}</div><div class="box">${esc(v).replace(/\n/g, '<br>') || '&nbsp;'}</div></div>`;
    }
  }
  return html;
}

export function buildAssessmentHTML(a: Assessment, autoPrint = true): string {
  const tools = a.tools && a.tools.length ? a.tools : (a.tool ? [{ tool: a.tool, score: '', interpretation: '' }] : []);
  const body = tools.map((t) => {
    const inst = instrumentForTool(t.tool);
    let inner = '';
    if (inst) inner = renderInstrument(inst, t.responses || {});
    else inner = `<div class="kv"><span class="lbl">Score</span><span class="val">${esc(t.score) || '—'}</span></div><div class="kv"><span class="lbl">Interpretation</span><span class="val">${esc(t.interpretation) || '—'}</span></div>`;
    return `<section><h2>${esc(inst ? inst.name : t.tool)}</h2>${inner}</section>`;
  }).join('<div class="pb"></div>');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(a.childName)} — assessment</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c2530;font-size:12.5px;margin:0;padding:24px;line-height:1.45}
  .meta{font-size:13px;margin-bottom:14px;border-bottom:1.5px solid #cfd6dd;padding-bottom:8px}
  .meta b{font-size:15px}
  h2{font-size:15px;margin:18px 0 6px;border-bottom:1px solid #e4e9ee;padding-bottom:3px}
  h3{font-size:12.5px;margin:12px 0 4px;color:#0b574f}
  h4{font-size:12px;margin:8px 0 2px;color:#5f5e5a}
  table{width:100%;border-collapse:collapse;margin:4px 0 8px}
  td,th{border:1px solid #d3dae1;padding:3px 6px;vertical-align:top;font-size:11.5px}
  th{background:#f4f6f8;font-weight:600}
  .grid .qt{width:auto} .grid .opt{width:34px;text-align:center}
  td.opt{text-align:center;font-weight:700;color:#0f766e}
  .dom td{border:none;padding:2px 6px} .dom .n{text-align:right;color:#5d6b7a}
  .n{text-align:right}
  .result{margin:6px 0} .result .big{font-size:22px;font-weight:700} .result .band{font-weight:600;padding:2px 10px;border:1px solid #cfd6dd;border-radius:12px;font-size:12px}
  .interp{color:#444;font-size:11.5px}
  .kv{display:flex;gap:10px;padding:3px 0;border-bottom:1px solid #f0f2f4}
  .kv .lbl{flex:1} .kv .val{font-weight:600;text-align:right;max-width:55%}
  .ta{margin:5px 0} .ta .lbl{font-weight:600;margin-bottom:2px} .ta .box{border:1px solid #d3dae1;border-radius:4px;padding:5px 7px;min-height:20px;background:#fff}
  .pb{page-break-after:always}
  .noprint{margin-bottom:12px}
  @media print{.noprint{display:none}}
</style></head><body>
  <div class="noprint"><button onclick="window.print()" style="padding:7px 14px;font-size:13px;cursor:pointer">Save as PDF / Print</button></div>
  <div class="meta"><b>${esc(a.childName)}</b> &nbsp; ${esc(a.date)} &nbsp; Assessor: ${esc(a.assessor)} &nbsp; Status: ${esc(a.status)}</div>
  ${body}
  ${autoPrint ? '<script>window.onload=function(){setTimeout(function(){try{window.print()}catch(e){}},350)}</script>' : ''}
</body></html>`;
}

export function openAssessmentPrint(a: Assessment, autoPrint = true): void {
  const html = buildAssessmentHTML(a, autoPrint);
  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to download / print the assessment.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
}
