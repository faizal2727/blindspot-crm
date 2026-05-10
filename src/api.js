// Supabase client + a thin API surface that mirrors the old REST shape,
// so App.jsx and forms.jsx don't need any changes.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't crash — show a clear message in the UI instead.
  console.error('Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: { persistSession: false }, // no auth for now
});

// snake_case <-> camelCase converters so the React layer stays clean
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toSnake = (s) => s.replace(/([A-Z])/g, '_$1').toLowerCase();

const camelObj = (row) => {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out;
};
const camelRows = (rows) => (rows || []).map(camelObj);

const snakeObj = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const k of Object.keys(obj)) {
    if (k === 'id') continue;
    let v = obj[k];
    // FK: empty string -> null
    if ((k === 'customerId' || k === 'leadId' || k === 'quoteId' || k === 'orderId') && v === '') v = null;
    out[toSnake(k)] = v;
  }
  return out;
};

const guard = (err) => {
  if (err) throw new Error(err.message || 'Database error');
};

export const api = {
  list: async (resource) => {
    const { data, error } = await supabase.from(resource).select('*').order('created_at', { ascending: false });
    guard(error);
    return camelRows(data);
  },

  get: async (resource, id) => {
    const { data, error } = await supabase.from(resource).select('*').eq('id', id).single();
    guard(error);
    return camelObj(data);
  },

  create: async (resource, item) => {
    const { data, error } = await supabase.from(resource).insert(snakeObj(item)).select().single();
    guard(error);
    return camelObj(data);
  },

  update: async (resource, id, item) => {
    const { data, error } = await supabase.from(resource).update(snakeObj(item)).eq('id', id).select().single();
    guard(error);
    return camelObj(data);
  },

  remove: async (resource, id) => {
    const { error } = await supabase.from(resource).delete().eq('id', id);
    guard(error);
    return { ok: true };
  },

  getSettings: async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    guard(error);
    return camelObj(data);
  },

  updateSettings: async (item) => {
    const payload = snakeObj(item);
    const { data, error } = await supabase.from('settings').update(payload).eq('id', 1).select().single();
    guard(error);
    return camelObj(data);
  },
};
