import { useEffect, useState } from 'react';
import { listNotifications, sendNotification, listChildren, listClients, listAppointmentsForChild } from '../lib/data';
import type { AppNotification, Child, Client } from '../lib/types';

const today = () => new Date().toISOString().slice(0, 10);

const TEMPLATES = [
  { trigger: 'Appointment confirmed', channel: 'whatsapp', text: 'Hi {parent}, {child}’s {service} is confirmed for {date} at {time} with {therapist}.' },
  { trigger: 'Reminder (T-24h / T-2h)', channel: 'whatsapp', text: 'Reminder: {child} has {service} tomorrow at {time}. Reply to reschedule.' },
  { trigger: 'Invoice / receipt', channel: 'email', text: 'Invoice {number} for ₹{amount} is attached. Pay online: {link}' },
  { trigger: 'Payment due / overdue', channel: 'whatsapp', text: 'Gentle reminder: ₹{balance} is pending for {child}’s sessions.' },
  { trigger: 'Progress report ready', channel: 'whatsapp', text: '{child}’s monthly progress report is ready to view: {link}' },
  { trigger: 'Therapist leave → reassignment', channel: 'whatsapp', text: '{child}’s {date} session is now with {therapist} (cover). Same time.' },
];

const when = (s: string) => s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export default function Notifications() {
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const load = () => listNotifications().then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); listChildren().then(setChildren).catch(() => {}); listClients().then(setClients).catch(() => {}); }, []);

  // Pre-fill a message with a child's details + upcoming sessions → admin reviews & sends.
  const prefillForChild = async (childId: string) => {
    const c = children.find((x) => x.id === childId); if (!c) return;
    const parent = clients.find((p) => p.id === c.parentId);
    let lines = '(no sessions scheduled yet)';
    try {
      const appts = await listAppointmentsForChild(childId);
      const up = appts.filter((a) => a.date >= today() && a.status !== 'Cancelled').slice(0, 5);
      if (up.length) lines = up.map((a) => `• ${a.date} ${a.time} — ${a.serviceName} with ${a.therapistName}`).join('\n');
    } catch { /* preview */ }
    setChannel('whatsapp');
    setName(parent?.name || '');
    setTo(parent?.phone || '');
    setMessage(`Hi ${parent?.name || 'there'}, here is ${c.name}'s schedule at Cornerstone:\n${lines}\n\nReply or call us to make any changes. — Team Cornerstone`);
  };

  const send = async () => {
    if (!to.trim() || !message.trim()) return flash('Add a recipient and a message.');
    setBusy(true);
    try {
      const res = await sendNotification({ channel, to: to.trim(), name, message, type: 'Manual message', recipientName: name || to });
      flash(res.status === 'Sent' ? `Sent via ${channel}.` : `Could not send: ${res.message}`);
      setMessage('');
      await load();
    } catch (e) {
      flash((e as Error)?.message || 'Send failed — deploy + configure the integration first.');
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-head"><h1>Notifications</h1><p className="muted">Daily communications — WhatsApp, email &amp; SMS via your integration engine (MSG91 / WhatsApp Cloud API / SendGrid).</p></div>

      <h3 className="sec">Compose &amp; send</h3>
      <div className="card">
        <label className="f" style={{ maxWidth: 380, marginBottom: 10 }}><span>Pre-fill for a child (auto-fills parent + schedule)</span>
          <select defaultValue="" onChange={(e) => { if (e.target.value) prefillForChild(e.target.value); }}>
            <option value="">— compose manually —</option>
            {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <div className="form-grid">
          <label className="f"><span>Channel</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value as 'whatsapp' | 'sms' | 'email')}>
              <option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Email</option>
            </select></label>
          <label className="f"><span>Recipient name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Parent name" /></label>
          <label className="f"><span>{channel === 'email' ? 'Email address' : 'Phone number'}</span><input value={to} onChange={(e) => setTo(e.target.value)} placeholder={channel === 'email' ? 'parent@email.com' : '+91 …'} /></label>
        </div>
        <label className="f full"><span>Message</span><textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
        <div className="row-between" style={{ marginTop: 12 }}>
          <button className="btn-primary" disabled={busy} onClick={send}>{busy ? 'Sending…' : `Send via ${channel}`}</button>
          {msg && <span className="save-flash">{msg}</span>}
        </div>
        <div className="hint-note" style={{ marginTop: 12 }}>Sends through your configured provider (credentials live in the website admin → Integrations). WhatsApp template messages may be required outside the 24-hour window. In this preview, sends are simulated.</div>
      </div>

      <h3 className="sec">Recent notifications</h3>
      <div className="card">
        {rows.length === 0 && <p className="muted">No notifications yet.</p>}
        {rows.length > 0 && (
          <table className="grid">
            <thead><tr><th>When</th><th>Type</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Message</th></tr></thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{when(n.at)}</td>
                  <td>{n.type}</td><td>{n.channel}</td><td>{n.recipient}</td>
                  <td><span className={'pill ' + (n.status === 'Pending' ? 'onhold' : n.status === 'Failed' ? 'noshow' : 'attended')}>{n.status}</span></td>
                  <td className="muted" style={{ maxWidth: 280 }}>{n.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3 className="sec">Templates &amp; triggers</h3>
      <div className="card">
        <table className="grid">
          <thead><tr><th>Trigger</th><th>Channel</th><th>Message template</th><th></th></tr></thead>
          <tbody>{TEMPLATES.map((t) => (
            <tr key={t.trigger}>
              <td><b>{t.trigger}</b></td><td>{t.channel}</td><td className="muted">{t.text}</td>
              <td className="acts"><button className="mini save" onClick={() => { setChannel(t.channel as 'whatsapp' | 'email'); setMessage(t.text); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Use</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
