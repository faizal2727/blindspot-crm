import React, { useState, useMemo } from 'react';
import { Plus, Search, X, Edit2, Trash2, CheckCircle2, Circle, AlertTriangle, Users, Hammer, Calendar } from 'lucide-react';
import { ModalWrap, WaIcon, Pill } from './components';
import { formatINR, formatDate, formatDateShort, tsToDateInput, dateInputToISO, waLink, num } from './utils';

// Four stages, in order. Each maps to columns in the DB (e.g. measurement_worker_id, measurement_due, etc.)
export const STAGES = [
  { key: 'measurement', label: 'Measurement', color: '#b8902e' },
  { key: 'cutting',     label: 'Cutting',     color: '#a87332' },
  { key: 'assembling',  label: 'Assembling',  color: '#8b7d3a' },
  { key: 'delivery',    label: 'Delivery',    color: '#5d8a55' },
];

// Compute which stage a job is currently at, based on which stages are done
export const currentStage = (job) => {
  if (!job) return 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (!job[`${STAGES[i].key}DoneAt`]) return i;
  }
  return STAGES.length; // all done
};

export const isOverdue = (job, stageIdx) => {
  const stage = STAGES[stageIdx];
  if (!stage) return false;
  const due = job[`${stage.key}Due`];
  const done = job[`${stage.key}DoneAt`];
  if (done || !due) return false;
  return new Date(due) < new Date();
};

// WhatsApp message templates for production
const waProdTemplates = {
  assignment: (worker, job, order, customer, stage, company) =>
    `Hello ${worker.name},\n\nWork assignment — *${stage.label}*\n\nOrder: ${order.number}\nCustomer: ${customer?.name || '—'}\nDue: ${formatDate(job[`${stage.key}Due`]) || 'ASAP'}\n${job[`${stage.key}Notes`] ? '\nNotes: ' + job[`${stage.key}Notes`] : ''}\n\nPlease confirm receipt and let us know if you have any questions.\n\nRegards,\n${company}`,
  reminder: (worker, job, order, stage, company) =>
    `Hello ${worker.name},\n\nReminder — *${stage.label}* for order ${order.number} is due ${formatDate(job[`${stage.key}Due`])}.\n\nPlease share the status update.\n\nThanks,\n${company}`,
};

// ============ WORKERS VIEW ============
export function WorkersView({ data, setModal, remove, search, setSearch }) {
  const filtered = data.workers.filter(w =>
    !search ||
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.role?.toLowerCase().includes(search.toLowerCase()) ||
    w.phone?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fade-in">
      <div className="topbar">
        <div>
          <div className="page-sub">
            {data.workers.filter(w => w.active).length} active ·
            {' '}{data.workers.filter(w => w.type === 'In-house').length} in-house ·
            {' '}{data.workers.filter(w => w.type === 'Outsourced').length} outsourced
          </div>
          <div className="page-title">Team & <em>karigars</em></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-box">
            <Search size={14} color="#8a7d5e" />
            <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setModal({ type: 'worker', data: { type: 'In-house', active: true } })}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="card scrollx">
        {filtered.length === 0 ? (
          <div className="empty"><Users size={32} className="empty-icon" /><div>No workers yet</div></div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Type</th><th className="hide-mobile">Role</th><th className="hide-mobile">Phone</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id} className="clickable" onClick={() => setModal({ type: 'worker', data: w })}>
                  <td><div style={{ fontWeight: 500 }}>{w.name}</div></td>
                  <td>
                    <span className="pill" style={{ background: w.type === 'In-house' ? '#dde6d8' : '#eddfd0', color: w.type === 'In-house' ? '#3d5a3a' : '#6b4a26' }}>
                      {w.type}
                    </span>
                  </td>
                  <td className="hide-mobile">{w.role}</td>
                  <td className="hide-mobile mono" style={{ fontSize: 12 }}>{w.phone}</td>
                  <td>
                    {w.active
                      ? <span className="pill" style={{ background: '#dde6d8', color: '#3d5a3a' }}>Active</span>
                      : <span className="pill" style={{ background: '#f4ede0', color: '#8a7d5e' }}>Inactive</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); remove('workers', w.id, w.name); }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============ PRODUCTION KANBAN ============
export function ProductionView({ data, setModal, settings, search, setSearch }) {
  const orderById  = (id) => data.orders.find(o => o.id === id);
  const customerById = (id) => data.customers.find(c => c.id === id);
  const workerById = (id) => data.workers.find(w => w.id === id);

  // Filter jobs by search across order number / customer name
  const filteredJobs = data.productionJobs.filter(j => {
    if (!search) return true;
    const o = orderById(j.orderId);
    const c = customerById(o?.customerId);
    const q = search.toLowerCase();
    return o?.number?.toLowerCase().includes(q) || c?.name?.toLowerCase().includes(q);
  });

  // Group by current stage. Jobs with all stages complete go into a "Done" pile (hidden from main view).
  const jobsByStage = STAGES.map((_, i) => filteredJobs.filter(j => currentStage(j) === i));
  const allDone = filteredJobs.filter(j => currentStage(j) === STAGES.length);

  // Overdue count for the warning banner
  const overdueCount = filteredJobs.filter(j => {
    const s = currentStage(j);
    return s < STAGES.length && isOverdue(j, s);
  }).length;

  // Orders that don't yet have a production job — offer to create one
  const ordersWithoutJob = data.orders.filter(o =>
    o.status !== 'Delivered' && o.status !== 'Cancelled' &&
    !data.productionJobs.some(j => j.orderId === o.id));

  return (
    <div className="fade-in">
      <div className="topbar">
        <div>
          <div className="page-sub">
            {filteredJobs.length} jobs · {filteredJobs.length - allDone.length} in progress · {allDone.length} completed
          </div>
          <div className="page-title">Production <em>floor</em></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-box">
            <Search size={14} color="#8a7d5e" />
            <input placeholder="Search order / customer..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {overdueCount > 0 && (
        <div style={{ padding: '12px 16px', background: '#fbf0ee', border: '1px solid #e8d8d4', borderRadius: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <AlertTriangle size={16} color="#a85b52" />
          <span><strong>{overdueCount} stage{overdueCount > 1 ? 's' : ''}</strong> overdue. Tap the red cards below.</span>
        </div>
      )}

      {ordersWithoutJob.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#fff', border: '1px solid #ebe3cd', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>{ordersWithoutJob.length} order{ordersWithoutJob.length > 1 ? 's' : ''} ready to start production:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ordersWithoutJob.slice(0, 5).map(o => (
              <button key={o.id} className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setModal({ type: 'productionJob', data: { orderId: o.id } })}>
                + {o.number} ({customerById(o.customerId)?.name})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="kanban">
        {STAGES.map((stage, idx) => (
          <div key={stage.key} className="kanban-col">
            <div className="kanban-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pill-dot" style={{ background: stage.color }} />
                <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b5d3f' }}>{stage.label}</span>
              </div>
              <span style={{ fontSize: 11, color: '#8a7d5e', fontWeight: 500 }}>{jobsByStage[idx].length}</span>
            </div>
            <div className="kanban-body">
              {jobsByStage[idx].length === 0 ? (
                <div style={{ textAlign: 'center', color: '#bbae8a', fontSize: 11, padding: '24px 8px', fontStyle: 'italic' }}>—</div>
              ) : jobsByStage[idx].map(j => {
                const order = orderById(j.orderId);
                const customer = customerById(order?.customerId);
                const worker = workerById(j[`${stage.key}WorkerId`]);
                const overdue = isOverdue(j, idx);
                const due = j[`${stage.key}Due`];
                return (
                  <div key={j.id} className={`kanban-card ${overdue ? 'overdue' : ''}`} onClick={() => setModal({ type: 'productionJob', data: j })}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }} className="mono">{order?.number || '—'}</div>
                    <div style={{ fontSize: 12, color: '#2a2520', marginBottom: 6 }}>{customer?.name || '—'}</div>
                    {worker ? (
                      <div style={{ fontSize: 11, color: '#6b5d3f', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <Hammer size={10} /> {worker.name}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#a85b52', fontStyle: 'italic', marginBottom: 4 }}>Not assigned</div>
                    )}
                    {due && (
                      <div style={{ fontSize: 11, color: overdue ? '#a85b52' : '#8b6914', display: 'flex', alignItems: 'center', gap: 4 }} className="mono">
                        <Calendar size={10} /> {formatDateShort(due)}
                        {overdue && <span style={{ marginLeft: 2 }}>· overdue</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {allDone.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: '#6b5d3f', padding: '8px 0' }}>
            ✓ {allDone.length} completed job{allDone.length > 1 ? 's' : ''} (click to view)
          </summary>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {allDone.map(j => {
              const order = orderById(j.orderId);
              const customer = customerById(order?.customerId);
              return (
                <div key={j.id} className="kanban-card" style={{ opacity: 0.7 }} onClick={() => setModal({ type: 'productionJob', data: j })}>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{order?.number}</div>
                  <div style={{ fontSize: 11, color: '#6b5d3f' }}>{customer?.name}</div>
                  <div style={{ fontSize: 10, color: '#3d5a3a', marginTop: 4 }}>✓ All stages complete</div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

// ============ WORKER FORM ============
export function WorkerForm({ initial, onSave, onClose, busy }) {
  const [f, setF] = useState(initial);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <ModalWrap title={f.id ? 'Edit Worker' : 'Add Worker'} sub={f.type === 'Outsourced' ? 'Karigar / Vendor' : 'Team Member'} onClose={onClose}>
      <div className="field"><label>Name</label><input value={f.name || ''} onChange={e => upd('name', e.target.value)} /></div>
      <div className="field-row">
        <div className="field"><label>Type</label>
          <select value={f.type || 'In-house'} onChange={e => upd('type', e.target.value)}>
            <option>In-house</option><option>Outsourced</option>
          </select>
        </div>
        <div className="field"><label>Role</label>
          <input value={f.role || ''} onChange={e => upd('role', e.target.value)} placeholder="e.g. Tailor, Installer" />
        </div>
      </div>
      <div className="field"><label>Phone (for WhatsApp)</label><input value={f.phone || ''} onChange={e => upd('phone', e.target.value)} placeholder="+91" /></div>
      <div className="field"><label>Notes</label><textarea rows="2" value={f.notes || ''} onChange={e => upd('notes', e.target.value)} /></div>
      <div className="field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.active !== false} onChange={e => upd('active', e.target.checked)} style={{ width: 'auto' }} />
          <span>Active (available for new work)</span>
        </label>
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => f.name ? onSave(f) : alert('Name required')}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </ModalWrap>
  );
}

// ============ PRODUCTION JOB FORM (the big one) ============
export function ProductionJobForm({ initial, orders, customers, workers, settings, onSave, onClose, busy }) {
  const [f, setF] = useState(initial);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const order = orders.find(o => o.id === f.orderId);
  const customer = customers.find(c => c.id === order?.customerId);
  const activeWorkers = workers.filter(w => w.active !== false);

  const markStageDone = (stageKey, done) => {
    upd(`${stageKey}DoneAt`, done ? new Date().toISOString() : null);
  };

  const stageWaLink = (stage) => {
    const worker = activeWorkers.find(w => w.id === f[`${stage.key}WorkerId`]);
    if (!worker?.phone) return null;
    return waLink(worker.phone, waProdTemplates.assignment(worker, f, order, customer, stage, settings.company));
  };

  return (
    <ModalWrap
      title={order ? `Production · ${order.number}` : 'New Production Job'}
      sub={customer?.name || 'Select an order'}
      onClose={onClose}
    >
      {!order && (
        <div className="field"><label>Link to Order</label>
          <select value={f.orderId || ''} onChange={e => upd('orderId', e.target.value)}>
            <option value="">— select —</option>
            {orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').map(o => (
              <option key={o.id} value={o.id}>{o.number} · {customers.find(c => c.id === o.customerId)?.name || '—'}</option>
            ))}
          </select>
        </div>
      )}

      {order && (
        <div style={{ padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #ebe3cd', marginBottom: 16, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><strong>{order.number}</strong> · {customer?.name}</div>
            <div className="mono" style={{ color: '#6b5d3f' }}>{formatINR(order.amount)}</div>
          </div>
          {order.deliveryDate && <div style={{ color: '#8b6914', marginTop: 4 }}>Delivery target: {formatDate(order.deliveryDate)}</div>}
        </div>
      )}

      {/* The four stage cards */}
      {STAGES.map((stage, idx) => {
        const done = !!f[`${stage.key}DoneAt`];
        const overdue = !done && f[`${stage.key}Due`] && new Date(f[`${stage.key}Due`]) < new Date();
        const link = stageWaLink(stage);

        return (
          <div key={stage.key} style={{
            padding: 14,
            background: done ? '#f4f8f0' : (overdue ? '#fbf0ee' : '#fff'),
            borderRadius: 6,
            border: `1px solid ${done ? '#dde6d8' : (overdue ? '#e8d8d4' : '#ebe3cd')}`,
            marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => markStageDone(stage.key, !done)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                  title={done ? 'Mark as not done' : 'Mark as done'}
                >
                  {done
                    ? <CheckCircle2 size={18} color="#5d8a55" />
                    : <Circle size={18} color={overdue ? '#a85b52' : '#bbae8a'} />}
                </button>
                <span style={{ fontWeight: 600, fontSize: 13, textDecoration: done ? 'line-through' : 'none', color: done ? '#6b5d3f' : '#2a2520' }}>
                  Stage {idx + 1} — {stage.label}
                </span>
                {overdue && <span className="pill" style={{ background: '#e8d8d4', color: '#6b3a36', fontSize: 10 }}>Overdue</span>}
                {done && <span className="pill" style={{ background: '#dde6d8', color: '#3d5a3a', fontSize: 10 }}>Done {formatDateShort(f[`${stage.key}DoneAt`])}</span>}
              </div>
            </div>

            <div className="field-row" style={{ marginBottom: 0 }}>
              <div className="field" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 9 }}>Assigned to</label>
                <select value={f[`${stage.key}WorkerId`] || ''} onChange={e => upd(`${stage.key}WorkerId`, e.target.value)}>
                  <option value="">— unassigned —</option>
                  {activeWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.role || w.type})</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 9 }}>Target date</label>
                <input type="date" value={tsToDateInput(f[`${stage.key}Due`])} onChange={e => upd(`${stage.key}Due`, dateInputToISO(e.target.value))} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 9 }}>Notes</label>
              <input value={f[`${stage.key}Notes`] || ''} onChange={e => upd(`${stage.key}Notes`, e.target.value)} placeholder="Any specific instructions for this stage…" />
            </div>
            {link && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <a className="wa-btn wa-btn-sm" href={link} target="_blank" rel="noopener">
                  <WaIcon /> Send assignment
                </a>
              </div>
            )}
          </div>
        );
      })}

      <div className="field" style={{ marginTop: 16 }}>
        <label>Overall notes</label>
        <textarea rows="2" value={f.notes || ''} onChange={e => upd('notes', e.target.value)} />
      </div>

      <div className="modal-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => f.orderId ? onSave(f) : alert('Select an order')}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </ModalWrap>
  );
}
