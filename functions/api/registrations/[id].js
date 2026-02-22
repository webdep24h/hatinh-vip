/**
 * Cloudflare Pages Function: /api/registrations/[id]
 * Handles GET (single), PATCH (update status), DELETE for a specific registration.
 *
 * Route param: [id] → context.params.id
 *
 * Environment variables required:
 *   SUPABASE_URL      – e.g. https://xyzxyzxyz.supabase.co
 *   SUPABASE_ANON_KEY – your Supabase project anon/public key
 */

const TABLE = 'registrations';

// ─── CORS headers ─────────────────────────────────────────────────────────────
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, PUT, DELETE, OPTIONS',
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

// ─── Supabase helpers ─────────────────────────────────────────────────────────
function supabaseHeaders(env) {
  return {
    'apikey':        env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
  };
}

function supabaseUrl(env, id) {
  // Filter by id: /rest/v1/registrations?id=eq.UUID
  return `${env.SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function onRequest(context) {
  const { request, env, params } = context;
  const origin = request.headers.get('Origin') || '*';
  const method = request.method.toUpperCase();
  const id     = params.id;

  // Preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (!id) {
    return jsonResponse({ error: 'Missing record id' }, 400, origin);
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return jsonResponse(
      { error: 'Server misconfigured: SUPABASE_URL or SUPABASE_ANON_KEY missing.' },
      500, origin
    );
  }

  try {
    // ── GET: fetch single record ──────────────────────────────────────────────
    if (method === 'GET') {
      const sbRes = await fetch(supabaseUrl(env, id), {
        headers: supabaseHeaders(env),
      });
      if (!sbRes.ok) {
        return jsonResponse({ error: 'Supabase error' }, sbRes.status, origin);
      }
      const rows = await sbRes.json();
      if (!rows || rows.length === 0) {
        return jsonResponse({ error: 'Record not found' }, 404, origin);
      }
      return jsonResponse(rows[0], 200, origin);
    }

    // ── PATCH: partial update (e.g. status) ──────────────────────────────────
    if (method === 'PATCH' || method === 'PUT') {
      let body;
      try { body = await request.json(); } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
      }

      // Whitelist updatable fields
      const ALLOWED = ['status', 'note', 'store_name', 'address', 'phone'];
      const update  = {};
      ALLOWED.forEach(f => { if (f in body) update[f] = body[f]; });

      if (Object.keys(update).length === 0) {
        return jsonResponse({ error: 'No updatable fields provided' }, 422, origin);
      }

      // Validate status value
      if (update.status && !['new', 'done', 'skip'].includes(update.status)) {
        return jsonResponse({ error: 'Invalid status value' }, 422, origin);
      }

      const sbRes = await fetch(supabaseUrl(env, id), {
        method:  'PATCH',
        headers: supabaseHeaders(env),
        body:    JSON.stringify(update),
      });

      if (!sbRes.ok) {
        const err = await sbRes.text();
        return jsonResponse({ error: 'Supabase error', detail: err }, sbRes.status, origin);
      }

      const rows = await sbRes.json();
      const result = Array.isArray(rows) ? rows[0] : rows;
      return jsonResponse(result || { id, ...update }, 200, origin);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      const sbRes = await fetch(supabaseUrl(env, id), {
        method:  'DELETE',
        headers: supabaseHeaders(env),
      });

      if (!sbRes.ok) {
        const err = await sbRes.text();
        return jsonResponse({ error: 'Supabase error', detail: err }, sbRes.status, origin);
      }

      // 204 No Content
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    return jsonResponse({ error: `Method ${method} not allowed` }, 405, origin);

  } catch (err) {
    return jsonResponse({ error: 'Internal server error', detail: err.message }, 500, origin);
  }
}
