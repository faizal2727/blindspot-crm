import React, { useState } from 'react';
import { Plus, X, Download, CheckCircle2 } from 'lucide-react';
import { ModalWrap, WaIcon } from './components';
import { formatINR, formatDate, tsToDateInput, dateInputToISO, num, waLink, waTemplates } from './utils';

export function CustomerForm({ initial, onSave, onClose, busy }) {
  const [f, setF] = useState(initial);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <ModalWrap title={f.id ? 'Edit Customer' : 'New Customer'} sub="Customer Record" onClose={onClose}>
      <div className="field"><label>Business Name</label><input value={f.name || ''} onChange={e => upd('name', e.target.value)} placeholder="e.g. Aaranya Interiors" /></div>
      <div className="field-row">
        <div className="field"><label>Type</label>
          <select value={f.type || 'Designer'} onChange={e => upd('type', e.target.value)}>
            <option>Designer</option><option>Architect</option><option>Builder</option><option>Dealer</option><option>Direct</option>
          </select>
        </div>
        <div className="field"><label>City</label><input value={f.city || ''} onChange={e => upd('city', e.target.value)} placeholder="e.g. Kochi" /></div>
      </div>
      <div className="field"><label>Contact Person</label><input value={f.contact || ''} onChange={e => upd('contact', e.target.value)} /></div>
      <div className="field-row">
        <div className="field"><label>Phone</label><input value={f.phone || ''} onChange={e => upd('phone', e.target.value)} placeholder="+91" /></div>
        <div className="field"><label>Email</label><input value={f.email || ''} onChange={e => upd('email', e.target.value)} /></div>
      </div>
      <div className="field"><label>Address</label><input value={f.address || ''} onChange={e => upd('address', e.target.value)} /></div>
      <div className="field"><label>GSTIN</label><input value={f.gst || ''} onChange={e => upd('gst', e.target.value)} placeholder="32XXXXX" /></div>
      <div className="field"><label>Notes</label><textarea rows="3" value={f.notes || ''} onChange={e => upd('notes', e.target.value)} /></div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => f.name ? onSave(f) : alert('Name is required')}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </ModalWrap>
  );
}

export function CustomerDetail({ customer, leads, orders, onClose, onEdit }) {
  const c = customer;
  const customerLeads = leads.filter(l => l.customerId === c.id);
  const customerOrders = orders.filter(o => o.customerId === c.id);
  const totalBusiness = customerOrders.reduce((s, o) => s + num(o.amount), 0);
  const outstanding = customerOrders.reduce((s, o) => s + num(o.amount) - num(o.paid), 0);
  return (
    <ModalWrap title={c.name} sub={`${c.type} · ${c.city || ''}`} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: 14, background: '#fff', borderRadius: 6, border: '1px solid #ebe3cd' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8a7d5e' }}>Total Business</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>{formatINR(totalBusiness)}</div>
        </div>
        <div style={{ padding: 14, background: '#fff', borderRadius: 6, border: '1px solid #ebe3cd' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8a7d5e' }}>Outstanding</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginTop: 4, color: outstanding > 0 ? '#a85b52' : '#3d5a3a' }}>{formatINR(outstanding)}</div>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        {c.contact && <div className="detail-row"><div className="detail-label">Contact</div><div className="detail-val">{c.contact}</div></div>}
        {c.phone && <div className="detail-row"><div className="detail-label">Phone</div><div className="detail-val mono">{c.phone}</div></div>}
        {c.email && <div className="detail-row"><div className="detail-label">Email</div><div className="detail-val">{c.email}</div></div>}
        {c.address && <div className="detail-row"><div className="detail-label">Address</div><div className="detail-val">{c.address}</div></div>}
        {c.gst && <div className="detail-row"><div className="detail-label">GSTIN</div><div className="detail-val mono">{c.gst}</div></div>}
        {c.notes && <div className="detail-row"><div className="detail-label">Notes</div><div className="detail-val">{c.notes}</div></div>}
      </div>
      {customerLeads.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6b5d3f', marginBottom: 8, fontWeight: 500 }}>Recent Leads</div>
          {customerLeads.slice(0, 4).map(l => (
            <div key={l.id} style={{ padding: '10px 12px', background: '#fff', border: '1px solid #ebe3cd', borderRadius: 4, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{l.title}</div>
                <div style={{ fontSize: 11, color: '#8a7d5e' }}>{l.stage}</div>
              </div>
              <div className="mono" style={{ fontSize: 12 }}>{formatINR(l.value)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onEdit}>Edit</button>
      </div>
    </ModalWrap>
  );
}

export function LeadForm({ initial, customers, onSave, onClose, busy }) {
  const [f, setF] = useState(initial);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <ModalWrap title={f.id ? 'Edit Lead' : 'New Lead'} sub="Pipeline Entry" onClose={onClose}>
      <div className="field"><label>Lead Title</label><input value={f.title || ''} onChange={e => upd('title', e.target.value)} placeholder="e.g. Marriott Suite Renovation" /></div>
      <div className="field-row">
        <div className="field"><label>Customer</label>
          <select value={f.customerId || ''} onChange={e => upd('customerId', e.target.value)}>
            <option value="">— select —</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Stage</label>
          <select value={f.stage || 'New'} onChange={e => upd('stage', e.target.value)}>
            <option>New</option><option>Quoted</option><option>Negotiation</option><option>Won</option><option>Lost</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Estimated Value (₹)</label><input type="number" value={f.value || 0} onChange={e => upd('value', +e.target.value)} /></div>
        <div className="field"><label>Source</label>
          <select value={f.source || 'Direct'} onChange={e => upd('source', e.target.value)}>
            <option>Direct</option><option>Referral</option><option>Website</option><option>Social Media</option><option>Repeat</option><option>Trade Show</option>
          </select>
        </div>
      </div>
      <div className="field"><label>Next Action</label><input value={f.nextAction || ''} onChange={e => upd('nextAction', e.target.value)} placeholder="e.g. Site visit for measurement" /></div>
      <div className="field"><label>Next Action Date</label><input type="date" value={tsToDateInput(f.nextDate)} onChange={e => upd('nextDate', dateInputToISO(e.target.value))} /></div>
      <div className="field"><label>Notes</label><textarea rows="3" value={f.notes || ''} onChange={e => upd('notes', e.target.value)} /></div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => f.title ? onSave(f) : alert('Title required')}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </ModalWrap>
  );
}

export function QuoteForm({ initial, customers, onSave, onClose, busy }) {
  const [f, setF] = useState({ ...initial, items: initial.items || [{ desc: '', qty: 1, rate: 0, gst: 18 }] });
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const updItem = (i, k, v) => upd('items', f.items.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const total = f.items?.reduce((s, i) => s + num(i.qty) * num(i.rate) * (1 + num(i.gst) / 100), 0) || 0;
  const subtotal = f.items?.reduce((s, i) => s + num(i.qty) * num(i.rate), 0) || 0;

  return (
    <ModalWrap title={f.id ? 'Edit Quote' : 'New Quote'} sub={f.number} onClose={onClose}>
      <div className="field-row">
        <div className="field"><label>Customer</label>
          <select value={f.customerId || ''} onChange={e => upd('customerId', e.target.value)}>
            <option value="">— select —</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Status</label>
          <select value={f.status || 'Draft'} onChange={e => upd('status', e.target.value)}>
            <option>Draft</option><option>Sent</option><option>Accepted</option><option>Rejected</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Date</label><input type="date" value={tsToDateInput(f.date)} onChange={e => upd('date', dateInputToISO(e.target.value))} /></div>
        <div className="field"><label>Validity (days)</label><input type="number" value={f.validity || 30} onChange={e => upd('validity', +e.target.value)} /></div>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label style={{ marginBottom: 8 }}>Line Items</label>
        {f.items?.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 60px 90px 60px 30px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <input placeholder="Description" value={it.desc} onChange={e => updItem(i, 'desc', e.target.value)} style={{ padding: 8, border: '1px solid #e6dfca', borderRadius: 4, fontSize: 12 }} />
            <input type="number" placeholder="Qty" value={it.qty} onChange={e => updItem(i, 'qty', +e.target.value)} style={{ padding: 8, border: '1px solid #e6dfca', borderRadius: 4, fontSize: 12 }} />
            <input type="number" placeholder="Rate" value={it.rate} onChange={e => updItem(i, 'rate', +e.target.value)} style={{ padding: 8, border: '1px solid #e6dfca', borderRadius: 4, fontSize: 12 }} />
            <input type="number" placeholder="GST%" value={it.gst} onChange={e => updItem(i, 'gst', +e.target.value)} style={{ padding: 8, border: '1px solid #e6dfca', borderRadius: 4, fontSize: 12 }} />
            <button className="btn-icon" onClick={() => upd('items', f.items.filter((_, idx) => idx !== i))}><X size={14} /></button>
          </div>
        ))}
        <button className="btn btn-secondary" style={{ marginTop: 4, fontSize: 12, padding: '6px 12px' }} onClick={() => upd('items', [...(f.items || []), { desc: '', qty: 1, rate: 0, gst: 18 }])}><Plus size={12} /> Add line</button>
      </div>
      <div style={{ padding: 14, background: '#fff', borderRadius: 6, border: '1px solid #ebe3cd', marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span>Subtotal</span><span className="mono">{formatINR(Math.round(subtotal))}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, color: '#6b5d3f' }}><span>GST</span><span className="mono">{formatINR(Math.round(total - subtotal))}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, paddingTop: 8, borderTop: '1px solid #ebe3cd' }}><span>Total</span><span className="serif mono" style={{ fontSize: 18 }}>{formatINR(Math.round(total))}</span></div>
      </div>
      <div className="field" style={{ marginTop: 16 }}><label>Notes</label><textarea rows="2" value={f.notes || ''} onChange={e => upd('notes', e.target.value)} /></div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => f.customerId ? onSave(f) : alert('Customer required')}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </ModalWrap>
  );
}

export function QuoteDetail({ quote, customer, settings, onClose, onEdit }) {
  const subtotal = quote.items.reduce((s, i) => s + num(i.qty) * num(i.rate), 0);
  const total = quote.items.reduce((s, i) => s + num(i.qty) * num(i.rate) * (1 + num(i.gst) / 100), 0);
  const gstTotal = total - subtotal;

  const printQuote = () => {
    const win = window.open('', '_blank');
    const itemsHtml = quote.items.map((it, i) => `<tr><td>${i+1}</td><td>${it.desc}</td><td class="right">${it.qty}</td><td class="right">${formatINR(it.rate)}</td><td class="right">${it.gst}%</td><td class="right">${formatINR(num(it.qty) * num(it.rate))}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>${quote.number}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; color: #2a2520; font-size: 13px; line-height: 1.5; background: white; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #2a2520; }
        .brand { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 500; }
        .brand em { font-style: italic; color: #8b6914; }
        .small { font-size: 11px; color: #6b5d3f; line-height: 1.6; white-space: pre-line; }
        .label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #8a7d5e; margin-bottom: 4px; }
        .doc-title { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 500; margin-bottom: 8px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin: 24px 0; }
        table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        th { background: #f4ede0; padding: 10px 12px; font-size: 11px; text-align: left; letter-spacing: 0.05em; text-transform: uppercase; }
        td { padding: 10px 12px; border-bottom: 1px solid #ebe3cd; font-size: 12px; }
        .totals { margin-left: auto; width: 280px; }
        .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
        .totals .grand { border-top: 2px solid #2a2520; margin-top: 8px; padding-top: 12px; font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ebe3cd; font-size: 11px; color: #6b5d3f; }
        .right { text-align: right; }
        @media print { body { margin: 0; padding: 20px; } }
      </style>
    </head><body>
      <div class="head">
        <div>
          <div class="brand">Blind<em>Spot</em></div>
          <div class="small" style="margin-top: 8px;">${settings.company || ''}\n${settings.address || ''}\n${settings.phone || ''} · ${settings.email || ''}\nGSTIN: ${settings.gst || ''}</div>
        </div>
        <div style="text-align: right;">
          <div class="doc-title">QUOTATION</div>
          <div class="small"><strong>${quote.number}</strong><br>Date: ${formatDate(quote.date)}<br>Valid: ${quote.validity} days</div>
        </div>
      </div>
      <div class="grid">
        <div>
          <div class="label">Bill To</div>
          <div style="font-weight: 600; font-size: 14px;">${customer?.name || ''}</div>
          <div class="small" style="margin-top: 4px;">${customer?.contact || ''}\n${customer?.address || ''}\n${customer?.city || ''}\n${customer?.phone || ''}\n${customer?.gst ? 'GSTIN: ' + customer.gst : ''}</div>
        </div>
        <div>
          <div class="label">Status</div>
          <div style="font-weight: 600;">${quote.status}</div>
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">GST%</th><th class="right">Amount</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${formatINR(Math.round(subtotal))}</span></div>
        <div class="row"><span>GST</span><span>${formatINR(Math.round(gstTotal))}</span></div>
        <div class="row grand"><span>Total</span><span>${formatINR(Math.round(total))}</span></div>
      </div>
      <div class="footer">
        ${quote.notes ? `<div style="margin-bottom: 12px;"><strong>Notes:</strong> ${quote.notes}</div>` : ''}
        <div style="margin-bottom: 12px;"><strong>Terms:</strong> ${settings.terms || ''}</div>
        <div><strong>Bank:</strong> ${settings.bank || ''}</div>
        <div style="margin-top: 24px; text-align: center; color: #8a7d5e;">— Thank you for your business —</div>
      </div>
      <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
    </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  return (
    <ModalWrap title={quote.number} sub={`Quote · ${customer?.name || '—'}`} onClose={onClose}>
      <div className="detail-row"><div className="detail-label">Date</div><div className="detail-val">{formatDate(quote.date)}</div></div>
      <div className="detail-row"><div className="detail-label">Status</div><div className="detail-val">{quote.status}</div></div>
      <div className="detail-row"><div className="detail-label">Validity</div><div className="detail-val">{quote.validity} days</div></div>
      <table style={{ marginTop: 16 }}>
        <thead><tr><th>Item</th><th style={{textAlign:'right'}}>Qty</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
        <tbody>
          {quote.items.map((it, i) => (
            <tr key={i}><td>{it.desc}</td><td style={{textAlign:'right'}} className="mono">{it.qty}</td><td style={{textAlign:'right'}} className="mono">{formatINR(it.rate)}</td><td style={{textAlign:'right'}} className="mono">{formatINR(num(it.qty) * num(it.rate))}</td></tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: 14, background: '#fff', borderRadius: 6, border: '1px solid #ebe3cd', marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>Subtotal</span><span className="mono">{formatINR(Math.round(subtotal))}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4, color: '#6b5d3f' }}><span>GST</span><span className="mono">{formatINR(Math.round(gstTotal))}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, paddingTop: 8, marginTop: 8, borderTop: '1px solid #ebe3cd' }}><span>Total</span><span className="serif mono" style={{ fontSize: 18 }}>{formatINR(Math.round(total))}</span></div>
      </div>
      {quote.notes && <div style={{ marginTop: 12, padding: 12, background: '#f4ede0', borderRadius: 4, fontSize: 12, fontStyle: 'italic' }}>{quote.notes}</div>}
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onEdit}>Edit</button>
        <button className="btn btn-secondary" onClick={printQuote}><Download size={14} /> Print / PDF</button>
        {customer?.phone && (
          <a className="wa-btn" href={waLink(customer.phone, waTemplates.quoteShare(customer, quote, Math.round(total), settings.company))} target="_blank" rel="noopener">
            <WaIcon /> Send on WhatsApp
          </a>
        )}
      </div>
    </ModalWrap>
  );
}

export function OrderForm({ initial, customers, quotes, onSave, onClose, busy }) {
  const [f, setF] = useState(initial);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <ModalWrap title={f.id ? 'Edit Order' : 'New Order'} sub={f.number} onClose={onClose}>
      <div className="field-row">
        <div className="field"><label>Customer</label>
          <select value={f.customerId || ''} onChange={e => upd('customerId', e.target.value)}>
            <option value="">— select —</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Status</label>
          <select value={f.status || 'Pending'} onChange={e => upd('status', e.target.value)}>
            <option>Pending</option><option>In Production</option><option>Ready</option><option>Delivered</option><option>Cancelled</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Order Date</label><input type="date" value={tsToDateInput(f.date)} onChange={e => upd('date', dateInputToISO(e.target.value))} /></div>
        <div className="field"><label>Delivery Date</label><input type="date" value={tsToDateInput(f.deliveryDate)} onChange={e => upd('deliveryDate', dateInputToISO(e.target.value))} /></div>
      </div>
      <div className="field"><label>Linked Quote (optional)</label>
        <select value={f.quoteId || ''} onChange={e => upd('quoteId', e.target.value)}>
          <option value="">— none —</option>
          {quotes.filter(q => !f.customerId || q.customerId === f.customerId).map(q => <option key={q.id} value={q.id}>{q.number}</option>)}
        </select>
      </div>
      <div className="field-row">
        <div className="field"><label>Total Amount (₹)</label><input type="number" value={f.amount || 0} onChange={e => upd('amount', +e.target.value)} /></div>
        <div className="field"><label>Paid (₹)</label><input type="number" value={f.paid || 0} onChange={e => upd('paid', +e.target.value)} /></div>
      </div>
      <div className="field"><label>Notes</label><textarea rows="2" value={f.notes || ''} onChange={e => upd('notes', e.target.value)} /></div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => f.customerId ? onSave(f) : alert('Customer required')}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </ModalWrap>
  );
}

export function PaymentForm({ initial, customers, orders, onSave, onClose, busy }) {
  const [f, setF] = useState(initial);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <ModalWrap title={f.id ? 'Edit Payment' : 'Record Payment'} sub="Payment Entry" onClose={onClose}>
      <div className="field"><label>Customer</label>
        <select value={f.customerId || ''} onChange={e => upd('customerId', e.target.value)}>
          <option value="">— select —</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="field"><label>Against Order (optional)</label>
        <select value={f.orderId || ''} onChange={e => upd('orderId', e.target.value)}>
          <option value="">— general —</option>
          {orders.filter(o => !f.customerId || o.customerId === f.customerId).map(o => <option key={o.id} value={o.id}>{o.number} · {formatINR(num(o.amount) - num(o.paid))} due</option>)}
        </select>
      </div>
      <div className="field-row">
        <div className="field"><label>Date</label><input type="date" value={tsToDateInput(f.date)} onChange={e => upd('date', dateInputToISO(e.target.value))} /></div>
        <div className="field"><label>Amount (₹)</label><input type="number" value={f.amount || 0} onChange={e => upd('amount', +e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Mode</label>
          <select value={f.mode || 'Bank Transfer'} onChange={e => upd('mode', e.target.value)}>
            <option>Bank Transfer</option><option>UPI</option><option>Cheque</option><option>Cash</option><option>Card</option>
          </select>
        </div>
        <div className="field"><label>Reference</label><input value={f.reference || ''} onChange={e => upd('reference', e.target.value)} placeholder="UTR / Cheque #" /></div>
      </div>
      <div className="field"><label>Notes</label><textarea rows="2" value={f.notes || ''} onChange={e => upd('notes', e.target.value)} /></div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => (f.customerId && f.amount) ? onSave(f) : alert('Customer and amount required')}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </ModalWrap>
  );
}

export function InventoryForm({ initial, onSave, onClose, busy }) {
  const [f, setF] = useState(initial);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <ModalWrap title={f.id ? 'Edit Item' : 'New Inventory Item'} sub="Stock Record" onClose={onClose}>
      <div className="field-row">
        <div className="field"><label>SKU</label><input value={f.sku || ''} onChange={e => upd('sku', e.target.value)} placeholder="e.g. RB-PRM-001" className="mono" /></div>
        <div className="field"><label>Category</label>
          <select value={f.category || 'Roller Blind'} onChange={e => upd('category', e.target.value)}>
            <option>Roller Blind</option><option>Vertical Blind</option><option>Roman Blind</option><option>Venetian Blind</option><option>Motorized</option><option>Curtain Fabric</option><option>Accessory</option><option>Other</option>
          </select>
        </div>
      </div>
      <div className="field"><label>Item Name</label><input value={f.name || ''} onChange={e => upd('name', e.target.value)} placeholder="e.g. Premium Roller Blind — Cream" /></div>
      <div className="field-row">
        <div className="field"><label>Stock</label><input type="number" value={f.stock || 0} onChange={e => upd('stock', +e.target.value)} /></div>
        <div className="field"><label>Unit</label>
          <select value={f.unit || 'piece'} onChange={e => upd('unit', e.target.value)}>
            <option>piece</option><option>sqft</option><option>meter</option><option>set</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Rate (₹)</label><input type="number" value={f.rate || 0} onChange={e => upd('rate', +e.target.value)} /></div>
        <div className="field"><label>GST %</label>
          <select value={f.gst || 12} onChange={e => upd('gst', +e.target.value)}>
            <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
          </select>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => f.name && f.sku ? onSave(f) : alert('Name and SKU are required')}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </ModalWrap>
  );
}
