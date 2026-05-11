export const formatINR = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN');
export const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const formatDateShort = (ts) => {
  if (!ts) return '—';
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};
export const tsToDateInput = (ts) => {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toISOString().slice(0, 10);
};
export const dateInputToISO = (s) => s ? new Date(s).toISOString() : null;

export const stageColors = {
  'New':         { bg: '#f4ede0', fg: '#7a5e2a', dot: '#b8902e' },
  'Quoted':      { bg: '#e8e4d8', fg: '#5a5230', dot: '#8b7d3a' },
  'Negotiation': { bg: '#eddfd0', fg: '#6b4a26', dot: '#a87332' },
  'Won':         { bg: '#dde6d8', fg: '#3d5a3a', dot: '#5d8a55' },
  'Lost':        { bg: '#e8d8d4', fg: '#6b3a36', dot: '#a85b52' },
};
export const orderStatusColors = {
  'Pending':       { bg: '#f4ede0', fg: '#7a5e2a' },
  'In Production': { bg: '#eddfd0', fg: '#6b4a26' },
  'Ready':         { bg: '#e8e4d8', fg: '#5a5230' },
  'Delivered':     { bg: '#dde6d8', fg: '#3d5a3a' },
  'Cancelled':     { bg: '#e8d8d4', fg: '#6b3a36' },
};

// WhatsApp helpers
const cleanPhone = (phone) => {
  if (!phone) return '';
  let p = phone.replace(/[^\d]/g, '');
  if (p.length === 10) p = '91' + p;
  return p;
};
export const waLink = (phone, message) => {
  const p = cleanPhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
};

export const waTemplates = {
  followUp: (customer, lead, company) =>
    `Hello ${customer.contact || customer.name},\n\nThis is a quick follow-up regarding "${lead.title}". Could you please share an update on your decision?\n\nLooking forward to hearing from you.\n\nRegards,\n${company}`,
  quoteShare: (customer, quote, total, company) =>
    `Hello ${customer.contact || customer.name},\n\nPlease find our quotation ${quote.number} dated ${formatDate(quote.date)}.\n\nTotal: ₹${total.toLocaleString('en-IN')}\nValidity: ${quote.validity} days\n\nKindly review and let us know if you have any questions.\n\nRegards,\n${company}`,
  paymentReminder: (customer, order, balance, company) =>
    `Hello ${customer.contact || customer.name},\n\nA gentle reminder regarding order ${order.number} — a balance of ₹${balance.toLocaleString('en-IN')} is pending against this order.\n\nKindly arrange the payment at your convenience. Please share the reference once paid.\n\nThank you,\n${company}`,
};

export const num = (v) => Number(v) || 0;
