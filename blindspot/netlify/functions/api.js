import { getDatabase } from '@netlify/database';

const db = getDatabase();

// snake_case (DB) <-> camelCase (frontend) converters
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toSnake = (s) => s.replace(/([A-Z])/g, '_$1').toLowerCase();
const camelObj = (row) => {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out;
};
const camelRows = (rows) => rows.map(camelObj);

// Map frontend camelCase keys to DB snake_case for inserts/updates
const snakeKeys = (obj) => {
  const out = {};
  for (const k of Object.keys(obj)) {
    if (k === 'id') continue; // never overwrite id from client payload
    out[toSnake(k)] = obj[k];
  }
  return out;
};

const TABLES = {
  customers: ['name', 'type', 'contact', 'phone', 'email', 'city', 'address', 'gst', 'notes'],
  leads: ['customer_id', 'title', 'stage', 'value', 'source', 'next_action', 'next_date', 'notes'],
  quotes: ['lead_id', 'customer_id', 'number', 'date', 'validity', 'status', 'items', 'notes'],
  orders: ['quote_id', 'customer_id', 'number', 'date', 'delivery_date', 'status', 'amount', 'paid', 'notes'],
  payments: ['order_id', 'customer_id', 'date', 'amount', 'mode', 'reference', 'notes'],
  inventory: ['sku', 'name', 'category', 'unit', 'stock', 'rate', 'gst'],
};

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// Filter incoming object to only allowed columns; coerce items to JSON string
const filterCols = (table, obj) => {
  const allowed = TABLES[table];
  const snake = snakeKeys(obj);
  const out = {};
  for (const col of allowed) {
    if (col in snake) {
      let v = snake[col];
      if (col === 'items' && typeof v !== 'string') v = JSON.stringify(v);
      // Convert empty strings on UUID FK columns to null so Postgres accepts them
      if ((col === 'customer_id' || col === 'lead_id' || col === 'quote_id' || col === 'order_id') && v === '') v = null;
      out[col] = v;
    }
  }
  return out;
};

export const handler = async (event) => {
  const path = event.path.replace(/^\/(\.netlify\/functions\/api|api)\/?/, '').replace(/^\/+|\/+$/g, '');
  const segments = path ? path.split('/') : [];
  const method = event.httpMethod;
  const body = event.body ? JSON.parse(event.body) : null;

  try {
    // Health
    if (segments.length === 0) return json(200, { ok: true, service: 'BlindSpot API' });

    const [resource, id] = segments;

    // Settings is a singleton
    if (resource === 'settings') {
      if (method === 'GET') {
        const rows = await db.sql`SELECT * FROM settings WHERE id = 1`;
        return json(200, camelObj(rows[0] || null));
      }
      if (method === 'PUT') {
        const cols = ['company', 'address', 'phone', 'email', 'gst', 'bank', 'terms'];
        const snake = snakeKeys(body);
        // Build SET clause dynamically but only with allowed cols
        await db.sql`
          UPDATE settings SET
            company = ${snake.company ?? null},
            address = ${snake.address ?? null},
            phone = ${snake.phone ?? null},
            email = ${snake.email ?? null},
            gst = ${snake.gst ?? null},
            bank = ${snake.bank ?? null},
            terms = ${snake.terms ?? null},
            updated_at = NOW()
          WHERE id = 1
        `;
        const rows = await db.sql`SELECT * FROM settings WHERE id = 1`;
        return json(200, camelObj(rows[0]));
      }
    }

    // Generic CRUD for the other tables
    if (!TABLES[resource]) return json(404, { error: 'Unknown resource' });

    const tableIdent = db.sql.identifier({ table: resource });

    // LIST
    if (method === 'GET' && !id) {
      const rows = await db.sql`SELECT * FROM ${tableIdent} ORDER BY created_at DESC`;
      return json(200, camelRows(rows));
    }

    // GET ONE
    if (method === 'GET' && id) {
      const rows = await db.sql`SELECT * FROM ${tableIdent} WHERE id = ${id}`;
      if (rows.length === 0) return json(404, { error: 'Not found' });
      return json(200, camelObj(rows[0]));
    }

    // CREATE
    if (method === 'POST' && !id) {
      const data = filterCols(resource, body);
      const cols = Object.keys(data);
      if (cols.length === 0) return json(400, { error: 'No valid fields' });
      const colIdents = cols.map(c => db.sql.identifier({ column: c }));
      const values = cols.map(c => data[c]);
      // Build VALUES list
      const valuesSql = db.sql.values([values]);
      const colsSql = db.sql.raw(cols.map(c => `"${c}"`).join(', '));
      const rows = await db.sql`
        INSERT INTO ${tableIdent} (${colsSql})
        VALUES ${valuesSql}
        RETURNING *
      `;
      return json(201, camelObj(rows[0]));
    }

    // UPDATE
    if (method === 'PUT' && id) {
      const data = filterCols(resource, body);
      const cols = Object.keys(data);
      if (cols.length === 0) return json(400, { error: 'No valid fields' });
      // Build SET clause
      const setParts = cols.map(c => `"${c}" = $${cols.indexOf(c) + 1}`).join(', ');
      const values = cols.map(c => data[c]);
      const result = await db.sql.unsafe(
        `UPDATE "${resource}" SET ${setParts} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
      );
      const rows = Array.isArray(result) ? result : (result.rows || []);
      if (rows.length === 0) return json(404, { error: 'Not found' });
      return json(200, camelObj(rows[0]));
    }

    // DELETE
    if (method === 'DELETE' && id) {
      await db.sql`DELETE FROM ${tableIdent} WHERE id = ${id}`;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return json(500, { error: err.message || 'Server error' });
  }
};

export const config = {
  path: '/api/*',
};
