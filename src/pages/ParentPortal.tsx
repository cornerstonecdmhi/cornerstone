import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { listChildrenForParent, listGoalsForChild, listAppointmentsForChild, listInvoicesForChild, listCarePlansForChild, listSharedAssessmentsForChild, getSettings } from '../lib/data';
import type { Child, Goal, Appointment, CarePlan, Assessment } from '../lib/types';
import { type InvoiceDoc, compute, fmt, dmy } from '../lib/invoice';
import { openAssessmentPrint } from '../lib/assessmentPrint';

export default function ParentPortal() {
  const { user, logout } = useAuth();
  const [clinic, setClinic] = useState('Cornerstone');
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  useEffect(() => {
    getSettings().then((s) => setClinic(s.name)).catch(() => {});
    // A parent reads ONLY their own children (filtered query — an unfiltered list
    // would be rejected by the security rules).
    listChildrenForParent(user?.clientId || '').then((cs) => {
      setChildren(cs); if (cs[0]?.id) setChildId(cs[0].id!);
    }).catch(() => {});
  }, []);
  // Per-child reads (the security rules let a parent read only their OWN child's
  // goals, sessions and invoices — so these must be filtered by childId, not listed all).
  useEffect(() => {
    if (!childId) return;
    listAppointmentsForChild(childId).then(setAppts).catch(() => setAppts([]));
    listGoalsForChild(childId).then(setGoals).catch(() => setGoals([]));
    listInvoicesForChild(childId).then(setInvoices).catch(() => setInvoices([]));
    listCarePlansForChild(childId).then(setCarePlans).catch(() => setCarePlans([]));
    listSharedAssessmentsForChild(childId).then(setAssessments).catch(() => setAssessments([]));
  }, [childId]);

  const child = children.find((c) => c.id === childId);
  const childGoals = goals;       // already scoped to childId
  const childInvoices = invoices;  // already scoped to childId (by FK)
  // Show the most recent agreed/active care plan to the parent.
  const plan = [...carePlans].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .find((p) => p.status === 'Active' || p.status === 'Agreed') || carePlans[0];
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = appts.filter((a) => a.date >= todayStr && a.status === 'Scheduled');

  return (
    <div className="portal">
      <header className="portal-head">
        <div className="brand"><span className="brand-mark">C</span>
          <div><div className="brand-name" style={{ color: '#fff' }}>{clinic}</div><div className="brand-sub">Parent Portal</div></div></div>
        <div className="user-box">
          {children.length > 1 && (
            <select value={childId} onChange={(e) => setChildId(e.target.value)} className="portal-sel">
              {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className="btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <div className="portal-body">
        <h1>Hello{user?.name ? ', ' + user.name.split(' ')[0] : ''} 👋</h1>
        {child && <p className="muted">Here's how <b>{child.name}</b> is doing.</p>}

        {plan && (
          <div className="card">
            <h3>Your care plan</h3>
            <div className="prog-row">
              <div>
                <b>{plan.therapies.map((t) => `${t.discipline} ${t.sessionsPerWeek}×/wk`).join(' · ') || plan.intensityNote || 'Plan agreed'}</b>
                <div className="muted" style={{ fontSize: 12 }}>{plan.planType}{plan.planPrice ? ` · ₹${plan.planPrice}` : ''}{plan.scheduleNote ? ` · ${plan.scheduleNote}` : ''}</div>
              </div>
              <span className={'pill ' + plan.status.toLowerCase()}>{plan.status}</span>
            </div>
            {plan.developmentalImpression && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{plan.developmentalImpression}</p>}
          </div>
        )}

        <div className="card">
          <h3>Progress</h3>
          {childGoals.length === 0 && <p className="muted">Goals will appear here once set by the clinical team.</p>}
          {childGoals.map((g) => (
            <div key={g.id} className="prog-row">
              <div><b>{g.description}</b><div className="muted" style={{ fontSize: 12 }}>{g.discipline} · {g.icfDomain}</div></div>
              <span className={'gas g' + (g.gasScore + 2)}>{g.gasScore > 0 ? '+' : ''}{g.gasScore}</span>
            </div>
          ))}
          {childGoals.length > 0 && <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>Scale: −2 baseline · 0 expected · +2 exceeds (Goal Attainment Scaling).</p>}
        </div>

        <div className="card">
          <h3>Assessments &amp; reports</h3>
          {assessments.length === 0 && <p className="muted">Reports your clinician shares will appear here.</p>}
          {assessments.map((as) => {
            const scored = (as.tools || []).filter((t) => t.autoScored && t.band);
            return (
              <div key={as.id} className="prog-row">
                <div>
                  <b>{as.tools && as.tools.length ? `${as.tools.length} test${as.tools.length === 1 ? '' : 's'}` : as.tool}</b>
                  <div className="muted" style={{ fontSize: 12 }}>{dmy(as.date)}{scored.length ? ' · ' + scored.map((t) => t.band).join(', ') : ''}</div>
                </div>
                <button className="btn-ghost" onClick={() => openAssessmentPrint(as, false)}>View report</button>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h3>Upcoming sessions</h3>
          {upcoming.length === 0 && <p className="muted">No upcoming sessions scheduled.</p>}
          {upcoming.map((a) => (
            <div key={a.id} className="prog-row">
              <div><b>{dmy(a.date)} · {a.time}</b><div className="muted" style={{ fontSize: 12 }}>{a.serviceName} with {a.therapistName}</div></div>
              <span className="pill scheduled">Scheduled</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Invoices &amp; receipts</h3>
          {childInvoices.length === 0 && <p className="muted">No invoices yet.</p>}
          {childInvoices.map((i) => {
            const t = i.total ?? compute(i).total;
            const paid = (i.amountPaid ?? +i.paid) >= t - 0.005;
            return (
              <div key={i.id} className="prog-row">
                <div><b>{i.number}</b><div className="muted" style={{ fontSize: 12 }}>{dmy(i.date)} · ₹ {fmt(t)}</div></div>
                <span className={'pill ' + (paid ? 'attended' : 'unpaid')}>{paid ? 'Paid' : 'Due'}</span>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h3>Messages</h3>
          <p className="muted">Secure messaging with the clinic — coming soon.</p>
        </div>
      </div>
    </div>
  );
}
