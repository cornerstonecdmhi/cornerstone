function Stub({ title, sub, phase }: { title: string; sub: string; phase: string }) {
  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        <p className="muted">{sub}</p>
      </div>
      <div className="card stub">
        <div className="stub-badge">{phase}</div>
        <p>This module is part of the planned TMS build. The shell, navigation and access control are in place — the screens land here next.</p>
      </div>
    </>
  );
}

export const Goals = () => <Stub title="Goals" phase="Phase 2" sub="SMART goals, ICF-CY domains, GAS progress scoring." />;
export const Reports = () => <Stub title="Reports" phase="Phase 2" sub="Progress reports for parents, outcomes, revenue." />;
export const Audit = () => <Stub title="Audit Log" phase="Phase 1" sub="Every create / edit / delete — who and when." />;
