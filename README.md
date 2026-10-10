# mecmûa

A private archive for the things you want to keep.

A *mecmûa* is an Ottoman commonplace book — a personal anthology where someone
copied out the poems, notes and marginalia they didn't want to lose. It was
never made for an audience. This is that, rebuilt: a place to gather images and
writing, organise them, and send something out when you feel like it.

No likes. No followers. No counts of any kind. Just you, and quiet.

## Principles

These are load-bearing, not decoration — they decide what gets built and what
doesn't.

- **Private by default.** The archive is for its owner. Not unlisted, not
  soft-gated — actually closed.
- **No social metrics.** No like counts, view counts, follower counts or
  engagement surfaces, including for the owner. Nothing that turns keeping
  into performing.
- **Sharing is outbound.** You can send a piece to a social platform. Nothing
  comes back in — no comments, no replies, no notifications.
- **Quiet interface.** Deep midnight indigo, gold hairlines, generous space.
  Nothing blinks or demands attention.

## Structure

Hand-written HTML, no build step, no framework. Relative paths throughout, so
the tree is load-bearing — every interior page reaches the base stylesheet as
`../styles.css` and the shared files as `../shared/…`.

```
dist/
  index.html                landing page
  styles.css                base tokens — fonts, --grad-gold, --dur-fast, …
  shared/                   the one shared folder; every page loads from here
    midnight.css            dark overlay; link AFTER styles.css
    dark-toggle.js          floating ☾/☀ button, key "mecmua-theme"
    auth.js                 sign-in flow, session in localStorage
    nav-menu.js             collapsing "Menu ✦" nav — not referenced by any page
    astronomy-engine.min.js vendored ephemeris library (MIT, cosinekitty/astronomy)
    astro-calc.js           natal chart + astrocartography math, on window.MecmuaAstro
    world-land.js           low-res world coastline path, for the astrocartography map
  assets/
    brand/  fonts/  imagery/  reference/  video/
  account/  atelier/  boutique/  chart/  collection/  globepattern/
  library/  magazine/  mecmua/  mind/  museum/  tokens/  wheel/
```

Keep it one folder. There were briefly two (`shared/` and `_shared/`) holding
overlapping copies, and they drifted far enough apart to break the gold borders
on two pages. Anything shared belongs in `shared/` and nowhere else.

State lives in `localStorage` under these keys:

| Key                        | Holds                                  |
| -------------------------- | -------------------------------------- |
| `mecmua-session`           | signed-in name and email               |
| `mecmua-theme`             | `dark` or `light`                      |
| `mecmua-collection-saved`  | images marked as watched               |
| `mecmua-reading-list`      | pieces set aside from Library/Magazine |
| `mecmua-oracle-draws`      | kept oracle draws                      |
| `mecmua-birth-chart`       | birth details, optionally with exact coordinates and UTC offset saved from `/chart` |

## Running locally

Relative paths and `localStorage` both need a real origin, so open it through a
server rather than double-clicking the file:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/dist/`.

## Status

This is a working design prototype. The interface is real; the plumbing behind
it is not yet.

What works today:

- Full visual system — midnight palette, gold gradients, dark/light toggle
- Page structure and navigation across all sections
- Saving, reading lists, oracle draws and birth chart, per browser
- `/chart` — a real natal wheel and astrocartography map, computed client-side
  from an actual ephemeris (no server, no API key). The account page's quick
  "big three" reading now draws from the same engine instead of guesswork.

What is still a sketch:

- **Sign-in is a mockup.** `auth.js` writes a name to `localStorage` and has no
  backend. It does not authenticate anyone and secures nothing.
- **There is no server-side storage.** Everything lives in one browser, capped
  at a few megabytes, and is lost when the cache is cleared. Uploading and
  organising an image library needs real storage; `localStorage` cannot do it.
- **`nav-menu.js` is dead code.** No page references it, so the collapsing
  "Menu ✦" nav never appears. Either wire it into the page headers or delete it.

## Roadmap

To become the archive described at the top, in rough order:

1. ~~Get the full site into the repo~~ — done, so edits now ship incrementally
   instead of re-uploading every image on every change.
2. Private hosting with an access gate in front of the whole site — see below.
3. Real authentication and object storage — Supabase or equivalent — so uploads
   persist and sync across devices.
4. Outbound share-to-social, one piece at a time.

## Deploying

**Not GitHub Pages.** Pages serves publicly whatever the repository visibility
is — there is no private tier outside Enterprise — so it cannot host this. The
same goes for a plain `netlify.app` address. There is no deploy workflow in this
repo on purpose.

**Cloudflare Workers with static assets**, gated by Access. `wrangler.jsonc`
holds the whole deploy config — there is no build step. Static files in `dist/`
are served directly without invoking any code; only requests that match no file
reach `src/index.js`, which answers `/api/*` and hands everything else back to
the assets binding.

Not Cloudflare *Pages*, despite Pages looking like the obvious fit. Access only
protects hostnames that route through a Cloudflare zone, and a default
`*.pages.dev` address does not — it keeps answering unauthenticated requests and
silently defeats the policy.

Deploy by connecting the repo at **Workers & Pages → Create → Import a
repository**. The settings come from `wrangler.jsonc`, so there is nothing to
fill in by hand. Live at `mecmua.mistik.workers.dev`.

### Current state: closed

Both Worker URLs sit behind Cloudflare Access. Visitors must sign in and match
a policy before anything loads.

| Route | Hostname |
| --- | --- |
| Production | `mecmua.mistik.workers.dev` |
| Preview | `*-mecmua.mistik.workers.dev` |

No custom domain is involved. Access is switched on per route from
**Workers & Pages → mecmua → Domains**, and the option only becomes selectable
once Zero Trust is activated on the account — that, not the lack of a custom
domain, is what gates the gate.

`dist/robots.txt` additionally asks crawlers away. Redundant behind Access, but
harmless, and it still applies if a route is ever opened.

### Managing who gets in

**Zero Trust → Access controls → Applications**, then edit the policy for the
route. Allow policies list the emails permitted; an application with no policy
denies everyone.

Access protects the hostname, not the files — which the findings API now
depends on. `src/index.js` identifies the caller from the
`Cf-Access-Authenticated-User-Email` header Access injects, and that header is
only trustworthy because every route is gated. Open a route, or add a custom
domain, and it becomes something a caller can set by hand; at that point the
Worker must verify `Cf-Access-Jwt-Assertion` against the team JWKS instead. The
same caveat is written at the top of the Worker, where it will be read.

## Findings catalogue

An entry form at `/account/findings/` for logging research findings, stored in
Cloudflare D1.

| Endpoint | |
| --- | --- |
| `GET /api/findings` | every row, newest first |
| `POST /api/findings` | create; the server decides auto-publish |
| `PATCH /api/findings/:id` | edit fields, or flip draft ↔ published |
| `DELETE /api/findings/:id` | remove |
| `GET /api/catalogue` | published rows only, shaped for the site |

Six categories. `symbol` and `art` publish the moment they are saved; `book`,
`figure`, `ritual` and `quote` land as drafts until reviewed. That rule lives in
`AUTO_PUBLISH` in `src/index.js` — the form only describes it.

Schema is `schema.sql`, applied with:

```bash
npx wrangler d1 execute mecmua --remote --file=schema.sql
```
