import type { ClinicSettings } from '../lib/types';
import { type InvoiceDoc as Inv, compute, statusOf, inWords, fmt, dmy, nextNumberPreview } from '../lib/invoice';

const STAMP: Record<string, string> = {
  'Paid': 'paid', 'Unpaid': 'unpaid', 'Partially Paid': 'partial', 'Overdue': 'overdue', 'Estimate': 'estimate',
};

export default function InvoiceDoc({ inv, settings: s }: { inv: Inv; settings: ClinicSettings }) {
  const t = compute(inv);
  const st = statusOf(inv, t.total);
  const showTax = s.gstReg === 'yes';
  const number = inv.number || nextNumberPreview(inv, s) + ' (on save)';

  return (
    <div id="invoice-doc" className="inv-doc">
      <div className="inv-head">
        <div className="inv-logo">
          {s.logo
            ? <img src={s.logo} alt="logo" style={{ maxHeight: s.logoH || 92 }} />
            : <div className="logo-fallback"><div className="lf-main">Corner<span>stone</span></div><div className="lf-sub">{s.subline}</div><div className="lf-tag">— {s.tagline} —</div></div>}
        </div>
        <div className="inv-contact">
          <div className="cline"><b>Phone:</b><span>{s.phone}</span></div>
          <div className="cline"><b>Email:</b><span>{s.email}</span></div>
          <div className="cline"><b>Website:</b><span>{s.website}</span></div>
          {showTax && s.gstin && <div className="cline"><b>GSTIN:</b><span>{s.gstin}</span></div>}
          <div className="cline"><b>Address:</b><span>{s.address}</span></div>
        </div>
      </div>

      <div className="inv-title-row">
        <div className="inv-title">{inv.docType.toUpperCase()}</div>
        <div className="inv-no">
          <div className="lbl">{inv.docType} No.</div>
          <div className="val">{number}</div>
          <div><span className={'stamp ' + (STAMP[st] || 'draft')}>{st.toUpperCase()}</span></div>
        </div>
      </div>

      <div className="meta-panel">
        <div className="m"><div className="lbl">{inv.docType} Date</div><div className="val">{dmy(inv.date)}</div></div>
        {(inv.docType === 'Invoice' || inv.docType === 'Estimate') &&
          <div className="m"><div className="lbl">Due Date</div><div className="val">{dmy(inv.due)}</div></div>}
        {showTax && <div className="m"><div className="lbl">Place of Supply</div><div className="val">{s.placeOfSupply}</div></div>}
      </div>

      <div className="billto">
        <div className="lbl">BILL TO</div>
        <div className="name">{inv.billTo.name || ' '}</div>
        <div className="det">{inv.billTo.addr}<br />{inv.billTo.phone}<br />{inv.billTo.email}</div>
        {inv.child && <div className="patient"><b>Patient (Child):</b> {inv.child}</div>}
      </div>

      <table className="items">
        <thead><tr>
          <th className="r" style={{ width: 34 }}>#</th><th>Service Description</th>
          <th className="r">Sessions / Qty</th><th className="r">Unit Price (₹)</th>
          {showTax && <th className="r">Tax</th>}<th className="r">Amount (₹)</th>
        </tr></thead>
        <tbody>
          {inv.items.filter((i) => i.svc || i.qty || i.price).map((i, idx) => (
            <tr key={idx}>
              <td className="r">{idx + 1}</td>
              <td className="desc">{i.svc}{i.period && <span className="period">{i.period}</span>}</td>
              <td className="r">{i.qty}</td>
              <td className="r">{fmt(+i.price)}</td>
              {showTax && <td className="r">{i.tax === 'Taxable' ? '18%' : 'Exempt'}</td>}
              <td className="r">{fmt((+i.qty || 0) * (+i.price || 0))}</td>
            </tr>
          ))}
          {inv.items.filter((i) => i.svc || i.qty || i.price).length === 0 &&
            <tr><td colSpan={6} className="muted" style={{ padding: 18 }}>No line items</td></tr>}
        </tbody>
      </table>

      <div className="lower">
        <div className="pay-info">
          <h4>PAYMENT INFORMATION</h4>
          <div className="pi-grid">
            <div className="qr-box">
              {s.qr ? <img src={s.qr} alt="QR" /> : <div className="qr-ph">Upload UPI QR in Settings</div>}
              <div className="scan">Scan to Pay</div>
              <div className="upi">UPI ID: {s.upi}</div>
            </div>
            <div className="bank">
              <div className="bk"><div className="l">Bank Name</div><div className="v">{s.bankName}</div></div>
              <div className="bk"><div className="l">Account Name</div><div className="v">{s.accName}</div></div>
              <div className="bk"><div className="l">Account Number</div><div className="v">{s.accNo}</div></div>
              <div className="bk"><div className="l">IFSC Code</div><div className="v">{s.ifsc}</div></div>
              <div className="bk"><div className="l">Account Type</div><div className="v">{s.accType}</div></div>
            </div>
          </div>
          {inv.note && <div className="note"><b>Note:</b> {inv.note}</div>}
        </div>

        <div className="totals">
          <div className="t-card">
            <div className="trow"><span>Subtotal</span><span>₹ {fmt(t.sub)}</span></div>
            <div className="trow"><span>Discount{inv.disc.reason ? ` (${inv.disc.reason})` : ''}</span><span>- ₹ {fmt(t.disc)}</span></div>
            {showTax
              ? <div className="trow"><span>GST (18% on taxable)</span><span>₹ {fmt(t.tax)}</span></div>
              : <div className="trow"><span>Tax (0%)</span><span>₹ 0.00</span></div>}
            {!!(+inv.round) && <div className="trow"><span>Round-off</span><span>₹ {fmt(+inv.round)}</span></div>}
            <div className="divider" />
            <div className="grand"><span className="gl">Total Amount</span><span className="gv">₹ {fmt(t.total)}</span></div>
            {!!(+inv.paid) && <>
              <div className="trow b" style={{ marginTop: 6 }}><span>Amount Paid</span><span>₹ {fmt(+inv.paid)}</span></div>
              <div className="trow b"><span>Balance Due</span><span>₹ {fmt(t.balance)}</span></div>
            </>}
          </div>
          <div className="words">{inWords(t.total)}</div>
        </div>
      </div>

      {s.terms && <div className="terms"><b>Terms:</b> {s.terms}</div>}
      <div className="sign"><div className="line"><div className="for">For {s.signatory || s.name}</div>Authorized Signatory</div></div>

      <div className="inv-footer">
        <div className="fhead">If you have any questions or need assistance, please reach out to us.</div>
        <div className="frow"><span>📞 {s.phone}</span><span>✉ {s.email}</span><span>📍 {s.address}</span></div>
      </div>
    </div>
  );
}
