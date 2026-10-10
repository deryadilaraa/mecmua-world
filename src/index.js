import { handleLibrary } from './library-api.mjs';
/* ===========================================================================
   mecmûa · Worker
   Serves the static site from dist/ and a small JSON API for the findings
   catalogue, backed by D1.

   AUTH — read this before adding routes.
   Every hostname this Worker answers on sits behind Cloudflare Access, so a
   request only reaches here after Access has authenticated someone and matched
   a policy. Access then injects the signed-in address as
   Cf-Access-Authenticated-User-Email, which is what identify() below trusts.

   That trust holds only while EVERY route is gated. Add a custom domain, or an
   ungated route, and the header becomes attacker-controllable — anyone could
   set it by hand. If that ever happens, verify Cf-Access-Jwt-Assertion against
   the team JWKS instead of trusting the email header.
   =========================================================================== */

const AUTO_PUBLISH = new Set(['symbol', 'art']);
const CATEGORIES = ['book', 'symbol', 'figure', 'art', 'ritual', 'quote'];
const TRADITIONS = ['Stoic', 'Sufi', 'Both', 'Visual', 'Other'];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/* Who is asking. Null when the request did not come through Access. */
function identify(request) {
  return request.headers.get('Cf-Access-Authenticated-User-Email') || null;
}

/* Trim to a string, or null for anything empty. Keeps '' out of the database. */
function str(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return max && trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/* Validate a submitted finding. Returns { data } or { error }. */
function readFinding(body) {
  const title = str(body.title, 300);
  if (!title) return { error: 'A title is required.' };

  const category = str(body.category);
  if (!CATEGORIES.includes(category)) {
    return { error: `Category must be one of: ${CATEGORIES.join(', ')}.` };
  }

  const tradition = str(body.tradition);
  if (tradition && !TRADITIONS.includes(tradition)) {
    return { error: `Tradition must be one of: ${TRADITIONS.join(', ')}.` };
  }

  // Only http(s) links. Anything else — javascript:, data: — is rejected
  // rather than stored, since these are rendered as hrefs later.
  const sourceUrl = str(body.source_url, 2000);
  if (sourceUrl) {
    let parsed;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      return { error: 'Source must be a valid URL.' };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: 'Source must be an http or https link.' };
    }
  }

  return {
    data: {
      title,
      category,
      tradition,
      source_url: sourceUrl,
      notes: str(body.notes, 20000),
      image_url: str(body.image_url, 2000),
    },
  };
}

async function createFinding(env, body) {
  const { data, error } = readFinding(body);
  if (error) return json({ error }, 400);

  const now = Date.now();
  const published = AUTO_PUBLISH.has(data.category);

  const row = {
    id: crypto.randomUUID(),
    ...data,
    status: published ? 'published' : 'draft',
    created_at: now,
    published_at: published ? now : null,
  };

  await env.DB.prepare(
    `INSERT INTO findings
       (id, category, title, notes, source_url, tradition, status, image_url, created_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      row.id, row.category, row.title, row.notes, row.source_url,
      row.tradition, row.status, row.image_url, row.created_at, row.published_at
    )
    .run();

  return json(row, 201);
}

async function updateFinding(env, id, body) {
  const existing = await env.DB.prepare('SELECT * FROM findings WHERE id = ?')
    .bind(id).first();
  if (!existing) return json({ error: 'No such finding.' }, 404);

  // Status is the only field with side effects, so it is handled on its own.
  if (body.status !== undefined) {
    if (body.status !== 'draft' && body.status !== 'published') {
      return json({ error: "Status must be 'draft' or 'published'." }, 400);
    }
    const publishing = body.status === 'published';
    await env.DB.prepare(
      `UPDATE findings SET status = ?, published_at = ? WHERE id = ?`
    )
      // Keep the original publish time if it is already published; clear it
      // when a row is pulled back to draft.
      .bind(body.status, publishing ? (existing.published_at ?? Date.now()) : null, id)
      .run();
  }

  const editable = ['title', 'notes', 'source_url', 'tradition', 'image_url'];
  const supplied = editable.filter((f) => body[f] !== undefined);
  if (supplied.length) {
    const merged = { ...existing };
    for (const f of supplied) merged[f] = body[f];
    const { data, error } = readFinding({ ...merged, category: existing.category });
    if (error) return json({ error }, 400);

    await env.DB.prepare(
      `UPDATE findings SET title = ?, notes = ?, source_url = ?, tradition = ?, image_url = ?
       WHERE id = ?`
    )
      .bind(data.title, data.notes, data.source_url, data.tradition, data.image_url, id)
      .run();
  }

  const updated = await env.DB.prepare('SELECT * FROM findings WHERE id = ?')
    .bind(id).first();
  return json(updated);
}

async function handleApi(request, env, url) {
  const who = identify(request);
  if (!who) return json({ error: 'Not signed in.' }, 401);

  const path = url.pathname;
  const method = request.method;

  // Body is only read for methods that carry one.
  let body = {};
  if (method === 'POST' || method === 'PATCH') {
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Expected a JSON body.' }, 400);
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return json({ error: 'Expected a JSON object.' }, 400);
    }
  }

  if (path === '/api/library' || path.startsWith('/api/library/')) return handleLibrary(path, method, env, body);

  if (path === '/api/findings') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM findings ORDER BY created_at DESC'
      ).all();
      return json(results);
    }
    if (method === 'POST') return createFinding(env, body);
    return json({ error: 'Method not allowed.' }, 405);
  }

  const single = path.match(/^\/api\/findings\/([A-Za-z0-9-]+)$/);
  if (single) {
    const id = single[1];
    if (method === 'PATCH') return updateFinding(env, id, body);
    if (method === 'DELETE') {
      const { meta } = await env.DB.prepare('DELETE FROM findings WHERE id = ?')
        .bind(id).run();
      if (!meta.changes) return json({ error: 'No such finding.' }, 404);
      return new Response(null, { status: 204 });
    }
    return json({ error: 'Method not allowed.' }, 405);
  }

  // Published rows, shaped for the site's Library and Museum pages.
  if (path === '/api/catalogue' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT id, category, title, notes, source_url, tradition, image_url, published_at
         FROM findings WHERE status = 'published' ORDER BY published_at DESC`
    ).all();
    return json(results);
  }

  return json({ error: 'No such endpoint.' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (!env.DB) {
        return json({ error: 'Database is not bound to this Worker.' }, 503);
      }
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        // Never leak SQL or stack traces to the client.
        console.error('api error', err);
        return json({ error: 'Something went wrong.' }, 500);
      }
    }

    // Everything else is the static site.
    return env.ASSETS.fetch(request);
  },
};
