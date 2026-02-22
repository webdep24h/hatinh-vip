/**
 * Cloudflare Pages Function: /api/registrations
 * Handles GET (list) and POST (create) for the registrations table in Supabase.
 *
 * Environment variables required (set in Cloudflare Pages dashboard):
 *   SUPABASE_URL   – e.g. https://xyzxyzxyz.supabase.co
 *   SUPABASE_ANON_KEY – your Supabase project anon/public key
 */

const TABLE = 'registrations';

// ─── CORS headers ────────────────────────────────────────────────────────────
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
  });
}

// ─── Supabase REST helpers ────────────────────────────────────────────────────
function supabaseHeaders(env) {
  return {
    'apikey': env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

function supabaseUrl(env, query = '') {
  return `${env.SUPABASE_URL}/rest/v1/${TABLE}${query}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  const method = request.method.toUpperCase();

  // Preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Validate env
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return jsonResponse(
      { error: 'Server misconfigured: SUPABASE_URL or SUPABASE_ANON_KEY missing.' },
      500, origin
    );
  }

  try {
    // ── GET: list registrations ───────────────────────────────────────────────
    if (method === 'GET') {
      const url    = new URL(request.url);
      const page   = parseInt(url.searchParams.get('page')  || '1',  10);
      const limit  = parseInt(url.searchParams.get('limit') || '100', 10);
      const search = url.searchParams.get('search') || '';
      const sort   = url.searchParams.get('sort')   || 'created_at';

      const offset = (page - 1) * limit;

      // Build Supabase query string
      let qs = `?order=${encodeURIComponent(sort)}.desc&limit=${limit}&offset=${offset}`;

      // Full-text search across store_name, address, phone
      if (search) {
        const s = encodeURIComponent(`%${search}%`);
        qs += `&or=(store_name.ilike.${s},address.ilike.${s},phone.ilike.${s})`;
      }

      // Fetch data + total count in parallel
      const [dataRes, countRes] = await Promise.all([
        fetch(supabaseUrl(env, qs), {
          headers: { ...supabaseHeaders(env), 'Prefer': 'return=representation' },
        }),
        fetch(supabaseUrl(env, `?order=${encodeURIComponent(sort)}.desc${search ? `&or=(store_name.ilike.${encodeURIComponent('%'+search+'%')},address.ilike.${encodeURIComponent('%'+search+'%')},phone.ilike.${encodeURIComponent('%'+search+'%')})` : ''}`), {
          headers: { ...supabaseHeaders(env), 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' },
          method: 'HEAD',
        }),
      ]);

      if (!dataRes.ok) {
        const err = await dataRes.text();
        return jsonResponse({ error: 'Supabase error', detail: err }, dataRes.status, origin);
      }

      const data  = await dataRes.json();
      const rangeHeader = countRes.headers.get('Content-Range') || '';
      // Content-Range: 0-99/1234  →  total = 1234
      const total = parseInt((rangeHeader.split('/')[1] || data.length), 10) || data.length;

      return jsonResponse({ data, total, page, limit, table: TABLE }, 200, origin);
    }

    // ── POST: create registration ─────────────────────────────────────────────
    if (method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
      }

      // Basic validation
      const { store_name, address, phone } = body;
      if (!store_name || !address || !phone) {
        return jsonResponse(
          { error: 'Missing required fields: store_name, address, phone' },
          422, origin
        );
      }

      // Sanitize & build record
      const record = {
        store_name:   String(store_name).trim().slice(0, 255),
        address:      String(address).trim().slice(0, 500),
        phone:        String(phone).trim().slice(0, 20),
        note:         body.note ? String(body.note).trim().slice(0, 2000) : null,
        status:       'new',
        submitted_at: body.submitted_at || new Date().toISOString(),
      };

      const sbRes = await fetch(supabaseUrl(env), {
        method:  'POST',
        headers: supabaseHeaders(env),
        body:    JSON.stringify(record),
      });

      if (!sbRes.ok) {
        const err = await sbRes.text();
        return jsonResponse({ error: 'Supabase error', detail: err }, sbRes.status, origin);
      }

      const created = await sbRes.json();
      // Supabase returns array when Prefer: return=representation
      const result = Array.isArray(created) ? created[0] : created;
      return jsonResponse(result, 201, origin);
    }

    // Method not allowed
    return jsonResponse({ error: `Method ${method} not allowed` }, 405, origin);

  } catch (err) {
    return jsonResponse({ error: 'Internal server error', detail: err.message }, 500, origin);
  }
}
