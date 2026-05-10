import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, Calendar, Package, Users, TrendingUp, CheckCircle2,
  ChevronRight, Menu, Home, Loader2, ScrollText, CreditCard, BarChart3, Download,
  Boxes, Settings as SettingsIcon, AlertTriangle, RefreshCw,
} from 'lucide-react';
import './styles.css';
import { api } from './api';
import { Pill, WaIcon, Toast } from './components';
import {
  formatINR, formatDate, formatDateShort, num,
  stageColors, waLink, waTemplates,
} from './utils';
import {
  CustomerForm, CustomerDetail, LeadForm, QuoteForm, QuoteDetail,
  OrderForm, PaymentForm, InventoryForm,
} from './forms';

const RESOURCES = ['customers', 'leads', 'quotes', 'orders', 'payments', 'inventory'];

export default function App() {
  const [data, setData] = useState({
    customers: [], leads: [], quotes: [], orders: [], payments: [], inventory: [],
    settings: null,
  });
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingModal, setSavingModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => setToast({ message, type });

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [customers, leads, quotes, orders, payments, inventory, settings] = await Promise.all([
        api.list('customers'),
        api.list('leads'),
        api.list('quotes'),
        api.list('orders'),
        api.list('payments'),
        api.list('inventory'),
        api.getSettings(),
      ]);
      setData({ customers, leads, quotes, orders, payments, inventory, settings });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Reset search when changing views
  useEffect(() => { setSearch(''); }, [view]);

  const customerById = (id) => data.customers.find(c => c.id === id);

  // Generic save / delete helpers
  const save = async (resource, item, after) => {
    setSavingModal(true);
    try {
      if (item.id) {
        await api.update(resource, item.id, item);
      } else {
        await api.create(resource, item);
      }
      await reload(true);
      setModal(null);
      showToast('Saved');
      if (after) after();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingModal(false);
    }
  };

  const remove = async (resource, id, label) => {
    if (!confirm(`Delete ${label || 'this'}?`)) return;
    try {
      await api.remove(resource, id);
      await reload(true);
      showToast('Deleted');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Loading splash
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf7f0', fontFamily: 'Georgia, serif' }}>
        <div style={{ textAlign: 'center', color: '#6b5d3f' }}>
          <Loader2 size={32} className="spin" />
          <div style={{ marginTop: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 12 }}>Loading workspace</div>
        </div>
      </div>
    );
  }

  // ============ SIDEBAR ============
  const Sidebar = () => (
    <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
      <div className="brand">Blind<em>Spot</em></div>
      <div className="brand-sub">Nothing slips through</div>
      <div className="nav-section">Workspace</div>
      {[
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'leads', label: 'Leads & Pipeline', icon: TrendingUp },
        { id: 'customers', label: 'Customers', icon: Users },
      ].map(item => (
        <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id); setNavOpen(false); }}>
          <span className="nav-dot" />
          <item.icon size={15} strokeWidth={1.5} />
          {item.label}
        </button>
      ))}
      <div className="nav-section">Sales</div>
      {[
        { id: 'quotes', label: 'Quotes', icon: ScrollText },
        { id: 'orders', label: 'Orders', icon: Package },
        { id: 'payments', label: 'Payments', icon: CreditCard },
      ].map(item => (
        <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id); setNavOpen(false); }}>
          <span className="nav-dot" />
          <item.icon size={15} strokeWidth={1.5} />
          {item.label}
        </button>
      ))}
      <div className="nav-section">Operations</div>
      {[
        { id: 'inventory', label: 'Inventory', icon: Boxes },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
      ].map(item => (
        <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id); setNavOpen(false); }}>
          <span className="nav-dot" />
          <item.icon size={15} strokeWidth={1.5} />
          {item.label}
        </button>
      ))}
      <div className="save-indicator">
        <CheckCircle2 size={11} /> Synced
        <button className="btn-icon" style={{ marginLeft: 'auto', padding: 4 }} onClick={() => reload(true)} title="Refresh">
          <RefreshCw size={11} />
        </button>
      </div>
    </aside>
  );

  // ============ DASHBOARD ============
  const Dashboard = () => {
    const totalPipeline = data.leads.filter(l => !['Won', 'Lost'].includes(l.stage)).reduce((s, l) => s + num(l.value), 0);
    const wonThisMonth = data.leads.filter(l => l.stage === 'Won' && new Date(l.createdAt) > new Date(Date.now() - 86400000 * 30)).reduce((s, l) => s + num(l.value), 0);
    const outstanding = data.orders.reduce((s, o) => s + num(o.amount) - num(o.paid), 0);
    const upcoming = data.leads.filter(l => l.nextDate && new Date(l.nextDate) < new Date(Date.now() + 86400000 * 7) && !['Won', 'Lost'].includes(l.stage)).sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));

    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-sub">Overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <div className="page-title">Good day, <em>weaver</em>.</div>
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Pipeline Value</div>
            <div className="stat-value">{formatINR(totalPipeline)}</div>
            <div className="stat-meta">{data.leads.filter(l => !['Won','Lost'].includes(l.stage)).length} active leads</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Won (30 days)</div>
            <div className="stat-value">{formatINR(wonThisMonth)}</div>
            <div className="stat-meta">{data.leads.filter(l => l.stage === 'Won').length} total wins</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Outstanding</div>
            <div className="stat-value">{formatINR(outstanding)}</div>
            <div className="stat-meta">across {data.orders.filter(o => num(o.amount) - num(o.paid) > 0).length} orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Customers</div>
            <div className="stat-value">{data.customers.length}</div>
            <div className="stat-meta">{data.customers.filter(c => new Date(c.createdAt) > new Date(Date.now() - 86400000 * 30)).length} added recently</div>
          </div>
        </div>
        <div className="detail-grid">
          <div className="card">
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #ebe3cd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Active Pipeline</h3>
              <button className="btn-icon" onClick={() => setView('leads')}><ChevronRight size={16} /></button>
            </div>
            <div className="scrollx">
              <table>
                <thead><tr><th>Lead</th><th className="hide-mobile">Customer</th><th>Stage</th><th style={{textAlign:'right'}}>Value</th></tr></thead>
                <tbody>
                  {data.leads.filter(l => !['Won','Lost'].includes(l.stage)).slice(0, 5).map(l => (
                    <tr key={l.id} className="clickable" onClick={() => setView('leads')}>
                      <td><div style={{fontWeight: 500}}>{l.title}</div></td>
                      <td className="hide-mobile" style={{color: '#6b5d3f'}}>{customerById(l.customerId)?.name}</td>
                      <td><Pill status={l.stage} /></td>
                      <td style={{textAlign:'right'}} className="mono">{formatINR(l.value)}</td>
                    </tr>
                  ))}
                  {data.leads.filter(l => !['Won','Lost'].includes(l.stage)).length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: '#8a7d5e', padding: 24 }}>No active leads yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #ebe3cd' }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>This Week</h3>
            </div>
            <div style={{ padding: '8px 4px' }}>
              {upcoming.length === 0 ? (
                <div className="empty"><Calendar size={28} className="empty-icon" /><div>Nothing scheduled</div></div>
              ) : upcoming.slice(0, 6).map(l => (
                <div key={l.id} style={{ padding: '12px 18px', borderBottom: '1px solid #f4ede0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{l.title}</div>
                    <div className="mono" style={{ fontSize: 11, color: '#8b6914', whiteSpace: 'nowrap' }}>{formatDateShort(l.nextDate)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b5d3f', marginTop: 3 }}>{l.nextAction}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ CUSTOMERS ============
  const Customers = () => {
    const filtered = data.customers.filter(c =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-sub">{data.customers.length} contacts · B2B</div>
            <div className="page-title">Customer <em>book</em></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search-box">
              <Search size={14} color="#8a7d5e" />
              <input placeholder="Search name, city..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <X size={14} color="#8a7d5e" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />}
            </div>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'customer', data: { type: 'Designer' } })}>
              <Plus size={14} /> New
            </button>
          </div>
        </div>
        <div className="card scrollx">
          {filtered.length === 0 ? (
            <div className="empty"><Users size={32} className="empty-icon" /><div>No customers found</div></div>
          ) : (
            <table>
              <thead><tr><th>Customer</th><th className="hide-mobile">Type</th><th className="hide-mobile">Contact</th><th>City</th><th style={{textAlign:'right'}}></th></tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="clickable" onClick={() => setModal({ type: 'customerDetail', data: c })}>
                    <td>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#8a7d5e' }} className="hide-mobile">{c.contact}</div>
                    </td>
                    <td className="hide-mobile"><span className="pill" style={{ background: '#f4ede0', color: '#6b5d3f' }}>{c.type}</span></td>
                    <td className="hide-mobile">
                      <div style={{ fontSize: 12 }}>{c.phone}</div>
                      <div style={{ fontSize: 11, color: '#8a7d5e' }}>{c.email}</div>
                    </td>
                    <td>{c.city}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setModal({ type: 'customer', data: c }); }}><Edit2 size={14} /></button>
                      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); remove('customers', c.id, c.name); }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ============ LEADS ============
  const Leads = () => {
    const stages = ['New', 'Quoted', 'Negotiation', 'Won', 'Lost'];
    const filtered = data.leads.filter(l => !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      customerById(l.customerId)?.name.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-sub">Pipeline · {data.leads.length} leads</div>
            <div className="page-title">Leads & <em>opportunities</em></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search-box">
              <Search size={14} color="#8a7d5e" />
              <input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'lead', data: { stage: 'New', value: 0 } })}>
              <Plus size={14} /> New
            </button>
          </div>
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}>
          {stages.map(s => {
            const items = data.leads.filter(l => l.stage === s);
            return (
              <div key={s} className="stat-card" style={{ padding: 14 }}>
                <div className="stat-label" style={{ marginBottom: 6, color: stageColors[s].fg }}>
                  <span className="pill-dot" style={{ display: 'inline-block', background: stageColors[s].dot, marginRight: 6 }} />
                  {s}
                </div>
                <div className="serif" style={{ fontSize: 20, fontWeight: 500 }}>{items.length}</div>
                <div className="stat-meta mono" style={{ fontSize: 10 }}>{formatINR(items.reduce((sum, l) => sum + num(l.value), 0))}</div>
              </div>
            );
          })}
        </div>
        <div className="card scrollx">
          {filtered.length === 0 ? (
            <div className="empty"><TrendingUp size={32} className="empty-icon" /><div>No leads</div></div>
          ) : (
            <table>
              <thead><tr><th>Lead</th><th className="hide-mobile">Customer</th><th>Stage</th><th className="hide-mobile">Next Action</th><th style={{textAlign:'right'}}>Value</th><th></th></tr></thead>
              <tbody>
                {filtered.map(l => {
                  const cust = customerById(l.customerId);
                  return (
                    <tr key={l.id} className="clickable" onClick={() => setModal({ type: 'lead', data: l })}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{l.title}</div>
                        <div style={{ fontSize: 11, color: '#8a7d5e', marginTop: 2 }} className="hide-mobile">{l.notes?.slice(0, 50)}{l.notes?.length > 50 ? '…' : ''}</div>
                      </td>
                      <td className="hide-mobile">{cust?.name || '—'}</td>
                      <td><Pill status={l.stage} /></td>
                      <td className="hide-mobile">
                        <div style={{ fontSize: 12 }}>{l.nextAction}</div>
                        <div style={{ fontSize: 11, color: '#8b6914' }} className="mono">{formatDateShort(l.nextDate)}</div>
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatINR(l.value)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {cust?.phone && (
                          <a href={waLink(cust.phone, waTemplates.followUp(cust, l, data.settings.company))} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="btn-icon" style={{ color: '#25d366' }} title="WhatsApp follow-up">
                            <WaIcon />
                          </a>
                        )}
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); remove('leads', l.id, l.title); }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ============ QUOTES ============
  const Quotes = () => {
    const filtered = data.quotes.filter(q => !search ||
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      customerById(q.customerId)?.name.toLowerCase().includes(search.toLowerCase()));
    const total = (q) => (q.items || []).reduce((s, i) => s + num(i.qty) * num(i.rate) * (1 + num(i.gst) / 100), 0);
    const yyyy = new Date().getFullYear();
    const nextNumber = `QT-${yyyy}-${String(data.quotes.length + 1).padStart(4, '0')}`;
    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-sub">{data.quotes.length} quotes</div>
            <div className="page-title">Quotes & <em>estimates</em></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search-box">
              <Search size={14} color="#8a7d5e" />
              <input placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'quote', data: { number: nextNumber, date: new Date().toISOString(), validity: 30, status: 'Draft', items: [{ desc: '', qty: 1, rate: 0, gst: 18 }] } })}>
              <Plus size={14} /> New
            </button>
          </div>
        </div>
        <div className="card scrollx">
          {filtered.length === 0 ? (
            <div className="empty"><ScrollText size={32} className="empty-icon" /><div>No quotes yet</div></div>
          ) : (
            <table>
              <thead><tr><th>Quote #</th><th className="hide-mobile">Customer</th><th className="hide-mobile">Date</th><th>Status</th><th style={{textAlign:'right'}}>Total</th><th></th></tr></thead>
              <tbody>
                {filtered.map(q => {
                  const cust = customerById(q.customerId);
                  const t = Math.round(total(q));
                  return (
                    <tr key={q.id} className="clickable" onClick={() => setModal({ type: 'quoteDetail', data: q })}>
                      <td className="mono" style={{ fontWeight: 500 }}>{q.number}</td>
                      <td className="hide-mobile">{cust?.name}</td>
                      <td className="hide-mobile">{formatDate(q.date)}</td>
                      <td><span className="pill" style={{ background: q.status === 'Accepted' ? '#dde6d8' : q.status === 'Sent' ? '#e8e4d8' : '#f4ede0', color: q.status === 'Accepted' ? '#3d5a3a' : '#5a5230' }}>{q.status}</span></td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatINR(t)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {cust?.phone && (
                          <a href={waLink(cust.phone, waTemplates.quoteShare(cust, q, t, data.settings.company))} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="btn-icon" style={{ color: '#25d366' }} title="Share via WhatsApp">
                            <WaIcon />
                          </a>
                        )}
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setModal({ type: 'quote', data: q }); }}><Edit2 size={14} /></button>
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); remove('quotes', q.id, q.number); }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ============ ORDERS ============
  const Orders = () => {
    const filtered = data.orders.filter(o => !search ||
      o.number.toLowerCase().includes(search.toLowerCase()) ||
      customerById(o.customerId)?.name.toLowerCase().includes(search.toLowerCase()));
    const yyyy = new Date().getFullYear();
    const nextNumber = `SO-${yyyy}-${String(data.orders.length + 1).padStart(4, '0')}`;
    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-sub">{data.orders.length} orders</div>
            <div className="page-title">Sales <em>orders</em></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search-box">
              <Search size={14} color="#8a7d5e" />
              <input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'order', data: { number: nextNumber, date: new Date().toISOString(), status: 'Pending', amount: 0, paid: 0 } })}>
              <Plus size={14} /> New
            </button>
          </div>
        </div>
        <div className="card scrollx">
          {filtered.length === 0 ? (
            <div className="empty"><Package size={32} className="empty-icon" /><div>No orders</div></div>
          ) : (
            <table>
              <thead><tr><th>Order #</th><th className="hide-mobile">Customer</th><th>Status</th><th className="hide-mobile">Delivery</th><th style={{textAlign:'right'}}>Amount</th><th style={{textAlign:'right'}}>Balance</th><th></th></tr></thead>
              <tbody>
                {filtered.map(o => {
                  const cust = customerById(o.customerId);
                  const balance = num(o.amount) - num(o.paid);
                  return (
                    <tr key={o.id} className="clickable" onClick={() => setModal({ type: 'order', data: o })}>
                      <td className="mono" style={{ fontWeight: 500 }}>{o.number}</td>
                      <td className="hide-mobile">{cust?.name}</td>
                      <td><Pill status={o.status} type="order" /></td>
                      <td className="hide-mobile">{formatDate(o.deliveryDate)}</td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatINR(o.amount)}</td>
                      <td style={{ textAlign: 'right', color: balance > 0 ? '#a85b52' : '#3d5a3a' }} className="mono">{formatINR(balance)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {cust?.phone && balance > 0 && (
                          <a href={waLink(cust.phone, waTemplates.paymentReminder(cust, o, balance, data.settings.company))} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="btn-icon" style={{ color: '#25d366' }} title="Send payment reminder">
                            <WaIcon />
                          </a>
                        )}
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); remove('orders', o.id, o.number); }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ============ PAYMENTS ============
  const Payments = () => {
    const filtered = data.payments.filter(p => !search ||
      customerById(p.customerId)?.name.toLowerCase().includes(search.toLowerCase()) ||
      p.reference?.toLowerCase().includes(search.toLowerCase()));
    const totalReceived = data.payments.reduce((s, p) => s + num(p.amount), 0);
    const orderById = (id) => data.orders.find(o => o.id === id);
    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-sub">Total received · {formatINR(totalReceived)}</div>
            <div className="page-title">Payment <em>ledger</em></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search-box">
              <Search size={14} color="#8a7d5e" />
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'payment', data: { date: new Date().toISOString(), mode: 'Bank Transfer', amount: 0 } })}>
              <Plus size={14} /> Record
            </button>
          </div>
        </div>
        <div className="card scrollx">
          {filtered.length === 0 ? (
            <div className="empty"><CreditCard size={32} className="empty-icon" /><div>No payments recorded</div></div>
          ) : (
            <table>
              <thead><tr><th>Date</th><th>Customer</th><th className="hide-mobile">Order</th><th className="hide-mobile">Mode</th><th className="hide-mobile">Reference</th><th style={{textAlign:'right'}}>Amount</th><th></th></tr></thead>
              <tbody>
                {filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => (
                  <tr key={p.id} className="clickable" onClick={() => setModal({ type: 'payment', data: p })}>
                    <td className="mono">{formatDateShort(p.date)}</td>
                    <td>{customerById(p.customerId)?.name || '—'}</td>
                    <td className="hide-mobile mono" style={{ fontSize: 11 }}>{orderById(p.orderId)?.number || '—'}</td>
                    <td className="hide-mobile">{p.mode}</td>
                    <td className="hide-mobile mono" style={{ fontSize: 11, color: '#6b5d3f' }}>{p.reference}</td>
                    <td style={{ textAlign: 'right', color: '#3d5a3a', fontWeight: 500 }} className="mono">+{formatINR(p.amount)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); remove('payments', p.id, 'this payment'); }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ============ INVENTORY ============
  const Inventory = () => {
    const filtered = data.inventory.filter(i => !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase()));
    const totalValue = data.inventory.reduce((s, i) => s + num(i.stock) * num(i.rate), 0);
    const lowStock = data.inventory.filter(i => num(i.stock) < (i.unit === 'piece' ? 10 : 100));
    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-sub">{data.inventory.length} SKUs · {formatINR(Math.round(totalValue))} stock value</div>
            <div className="page-title">Inventory & <em>stock</em></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search-box">
              <Search size={14} color="#8a7d5e" />
              <input placeholder="Search SKU, name..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'inventory', data: { category: 'Roller Blind', unit: 'sqft', stock: 0, rate: 0, gst: 12 } })}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
        {lowStock.length > 0 && (
          <div style={{ padding: '12px 16px', background: '#fbf0ee', border: '1px solid #e8d8d4', borderRadius: 6, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <AlertTriangle size={16} color="#a85b52" />
            <span><strong>{lowStock.length} item{lowStock.length > 1 ? 's' : ''}</strong> running low: {lowStock.slice(0, 3).map(i => i.name).join(', ')}{lowStock.length > 3 ? '…' : ''}</span>
          </div>
        )}
        <div className="card scrollx">
          {filtered.length === 0 ? (
            <div className="empty"><Boxes size={32} className="empty-icon" /><div>No items</div></div>
          ) : (
            <table>
              <thead><tr><th>SKU</th><th>Item</th><th className="hide-mobile">Category</th><th style={{textAlign:'right'}}>Stock</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}} className="hide-mobile">Value</th><th></th></tr></thead>
              <tbody>
                {filtered.map(i => {
                  const isLow = num(i.stock) < (i.unit === 'piece' ? 10 : 100);
                  return (
                    <tr key={i.id} className="clickable" onClick={() => setModal({ type: 'inventory', data: i })}>
                      <td className="mono" style={{ fontSize: 11, color: '#6b5d3f' }}>{i.sku}</td>
                      <td><div style={{ fontWeight: 500 }}>{i.name}</div></td>
                      <td className="hide-mobile"><span className="pill" style={{ background: '#f4ede0', color: '#6b5d3f' }}>{i.category}</span></td>
                      <td style={{ textAlign: 'right' }} className="mono">
                        <span style={{ color: isLow ? '#a85b52' : 'inherit', fontWeight: isLow ? 600 : 400 }}>{i.stock}</span>
                        <span style={{ fontSize: 10, color: '#8a7d5e', marginLeft: 4 }}>{i.unit}</span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatINR(i.rate)}</td>
                      <td style={{ textAlign: 'right' }} className="mono hide-mobile">{formatINR(Math.round(num(i.stock) * num(i.rate)))}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); remove('inventory', i.id, i.name); }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ============ REPORTS ============
  const Reports = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      });
    }
    const monthSales = months.map(m => ({
      ...m,
      value: data.orders.filter(o => new Date(o.date) >= m.start && new Date(o.date) < m.end).reduce((s, o) => s + num(o.amount), 0),
    }));
    const maxMonth = Math.max(...monthSales.map(m => m.value), 1);
    const custRevenue = data.customers.map(c => ({
      ...c,
      revenue: data.orders.filter(o => o.customerId === c.id).reduce((s, o) => s + num(o.amount), 0),
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const maxCust = Math.max(...custRevenue.map(c => c.revenue), 1);
    const stages = ['New', 'Quoted', 'Negotiation', 'Won'];
    const stageCount = stages.map(s => data.leads.filter(l => l.stage === s).length);
    const totalLeads = data.leads.length;
    const wonRate = totalLeads ? Math.round((data.leads.filter(l => l.stage === 'Won').length / totalLeads) * 100) : 0;
    const outstandingByCust = data.customers.map(c => ({
      ...c,
      balance: data.orders.filter(o => o.customerId === c.id).reduce((s, o) => s + num(o.amount) - num(o.paid), 0),
    })).filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);
    const sources = {};
    data.leads.forEach(l => { sources[l.source] = (sources[l.source] || 0) + 1; });
    const sourceList = Object.entries(sources).sort((a, b) => b[1] - a[1]);
    const maxSource = Math.max(...Object.values(sources), 1);

    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-sub">Analytics · Live data</div>
            <div className="page-title">Reports & <em>insights</em></div>
          </div>
          <button className="btn btn-secondary" onClick={() => window.print()}><Download size={14} /> Print</button>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value">{wonRate}%</div>
            <div className="stat-meta">{data.leads.filter(l => l.stage === 'Won').length} won of {totalLeads}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Order Value</div>
            <div className="stat-value">{formatINR(Math.round(data.orders.reduce((s, o) => s + num(o.amount), 0) / Math.max(data.orders.length, 1)))}</div>
            <div className="stat-meta">{data.orders.length} orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Receivables</div>
            <div className="stat-value" style={{ color: '#a85b52' }}>{formatINR(data.orders.reduce((s, o) => s + num(o.amount) - num(o.paid), 0))}</div>
            <div className="stat-meta">{outstandingByCust.length} customers</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Stock Value</div>
            <div className="stat-value">{formatINR(Math.round(data.inventory.reduce((s, i) => s + num(i.stock) * num(i.rate), 0)))}</div>
            <div className="stat-meta">{data.inventory.length} SKUs</div>
          </div>
        </div>
        <div className="detail-grid">
          <div className="card" style={{ padding: 22 }}>
            <h3 className="serif" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 500 }}>Sales · Last 6 Months</h3>
            {monthSales.map(m => (
              <div key={m.key} className="bar-row">
                <div className="bar-label">{m.label}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(m.value / maxMonth) * 100}%` }} /></div>
                <div className="bar-value mono">{formatINR(m.value)}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 22 }}>
            <h3 className="serif" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 500 }}>Lead Sources</h3>
            {sourceList.length === 0 ? <div style={{ color: '#8a7d5e', fontSize: 13 }}>No data yet</div> : sourceList.map(([s, n]) => (
              <div key={s} className="bar-row">
                <div className="bar-label">{s}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(n / maxSource) * 100}%` }} /></div>
                <div className="bar-value mono">{n}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-grid" style={{ marginTop: 24 }}>
          <div className="card" style={{ padding: 22 }}>
            <h3 className="serif" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 500 }}>Top Customers</h3>
            {custRevenue.length === 0 || custRevenue[0].revenue === 0 ? <div style={{ color: '#8a7d5e', fontSize: 13 }}>No orders yet</div> : custRevenue.map(c => (
              <div key={c.id} className="bar-row">
                <div className="bar-label">{c.name}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.revenue / maxCust) * 100}%` }} /></div>
                <div className="bar-value mono">{formatINR(c.revenue)}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 22 }}>
            <h3 className="serif" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 500 }}>Outstanding Receivables</h3>
            {outstandingByCust.length === 0 ? <div style={{ color: '#3d5a3a', fontSize: 13, padding: 8 }}>✓ Nothing outstanding</div> : outstandingByCust.slice(0, 6).map(c => (
              <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f4ede0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#8a7d5e' }}>{c.city}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ color: '#a85b52', fontWeight: 600 }}>{formatINR(c.balance)}</div>
                  {c.phone && (
                    <a href={waLink(c.phone, `Hello ${c.contact || c.name},\n\nA gentle reminder — a balance of ₹${c.balance.toLocaleString('en-IN')} is pending. Kindly arrange the payment at your convenience.\n\nThank you,\n${data.settings.company}`)} target="_blank" rel="noopener" className="wa-btn wa-btn-sm" style={{ marginTop: 4 }}>
                      <WaIcon /> Remind
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 22, marginTop: 24 }}>
          <h3 className="serif" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 500 }}>Pipeline Funnel</h3>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
            {stages.map((s, i) => {
              const max = Math.max(...stageCount, 1);
              const h = (stageCount[i] / max) * 100;
              return (
                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="serif" style={{ fontSize: 22, fontWeight: 500 }}>{stageCount[i]}</div>
                  <div style={{ width: '100%', height: `${h}%`, minHeight: 4, background: stageColors[s].dot, borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b5d3f' }}>{s}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ============ SETTINGS ============
  const SettingsView = () => {
    const [s, setS] = useState(data.settings || {});
    const [busy, setBusy] = useState(false);
    const upd = (k, v) => setS(p => ({ ...p, [k]: v }));
    const onSave = async () => {
      setBusy(true);
      try {
        const updated = await api.updateSettings(s);
        setData(d => ({ ...d, settings: updated }));
        showToast('Settings saved');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-sub">Company profile & invoice details</div>
            <div className="page-title">Settings</div>
          </div>
        </div>
        <div className="card" style={{ padding: 28, maxWidth: 720 }}>
          <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8a7d5e', fontWeight: 500 }}>Company Profile</div>
          <p style={{ color: '#6b5d3f', fontSize: 12, marginTop: 0, marginBottom: 20 }}>This information appears on your printed quotes and invoices.</p>
          <div className="field"><label>Company Name</label><input value={s.company || ''} onChange={e => upd('company', e.target.value)} /></div>
          <div className="field"><label>Address</label><textarea rows="3" value={s.address || ''} onChange={e => upd('address', e.target.value)} /></div>
          <div className="field-row">
            <div className="field"><label>Phone</label><input value={s.phone || ''} onChange={e => upd('phone', e.target.value)} /></div>
            <div className="field"><label>Email</label><input value={s.email || ''} onChange={e => upd('email', e.target.value)} /></div>
          </div>
          <div className="field"><label>GSTIN</label><input value={s.gst || ''} onChange={e => upd('gst', e.target.value)} className="mono" /></div>
          <div className="field"><label>Bank Details</label><input value={s.bank || ''} onChange={e => upd('bank', e.target.value)} placeholder="Bank, A/c, IFSC" /></div>
          <div className="field"><label>Default Terms</label><textarea rows="3" value={s.terms || ''} onChange={e => upd('terms', e.target.value)} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-primary" onClick={onSave} disabled={busy}>
              {busy ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============ MODAL DISPATCH ============
  const renderModal = () => {
    if (!modal) return null;
    const close = () => setModal(null);
    const m = modal;
    if (m.type === 'customer') return <CustomerForm initial={m.data} busy={savingModal} onClose={close} onSave={(c) => save('customers', c)} />;
    if (m.type === 'customerDetail') return <CustomerDetail customer={m.data} leads={data.leads} orders={data.orders} onClose={close} onEdit={() => setModal({ type: 'customer', data: m.data })} />;
    if (m.type === 'lead') return <LeadForm initial={m.data} customers={data.customers} busy={savingModal} onClose={close} onSave={(l) => save('leads', l)} />;
    if (m.type === 'quote') return <QuoteForm initial={m.data} customers={data.customers} busy={savingModal} onClose={close} onSave={(q) => save('quotes', q)} />;
    if (m.type === 'quoteDetail') return <QuoteDetail quote={m.data} customer={customerById(m.data.customerId)} settings={data.settings} onClose={close} onEdit={() => setModal({ type: 'quote', data: m.data })} />;
    if (m.type === 'order') return <OrderForm initial={m.data} customers={data.customers} quotes={data.quotes} busy={savingModal} onClose={close} onSave={(o) => save('orders', o)} />;
    if (m.type === 'payment') return <PaymentForm initial={m.data} customers={data.customers} orders={data.orders} busy={savingModal} onClose={close} onSave={async (p) => {
      // After saving the payment, also bump the order's `paid` total
      setSavingModal(true);
      try {
        if (p.id) await api.update('payments', p.id, p);
        else await api.create('payments', p);
        if (p.orderId) {
          // Sum payments for the order (after the save) and update the order
          const allPayments = await api.list('payments');
          const orderPayments = allPayments.filter(x => x.orderId === p.orderId);
          const totalPaid = orderPayments.reduce((s, x) => s + num(x.amount), 0);
          await api.update('orders', p.orderId, { paid: totalPaid });
        }
        await reload(true);
        close();
        showToast('Saved');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setSavingModal(false);
      }
    }} />;
    if (m.type === 'inventory') return <InventoryForm initial={m.data} busy={savingModal} onClose={close} onSave={(it) => save('inventory', it)} />;
    return null;
  };

  return (
    <div className="crm-app">
      <Sidebar />
      <button className="menu-trigger btn-icon" onClick={() => setNavOpen(!navOpen)} style={{ position: 'fixed', top: 12, right: 12, zIndex: 95, background: '#fff', border: '1px solid #ebe3cd' }}>
        <Menu size={20} />
      </button>
      <main className="main">
        {view === 'dashboard' && <Dashboard />}
        {view === 'customers' && <Customers />}
        {view === 'leads' && <Leads />}
        {view === 'quotes' && <Quotes />}
        {view === 'orders' && <Orders />}
        {view === 'payments' && <Payments />}
        {view === 'inventory' && <Inventory />}
        {view === 'reports' && <Reports />}
        {view === 'settings' && <SettingsView />}
      </main>
      {renderModal()}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
