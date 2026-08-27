# Security Headers, CSP & HSTS — Casa Aurelia

This document consolidates how HTTP security headers are applied across the
application, and which ones must live at the hosting/reverse-proxy layer rather
than in the application. It documents the **CSP1 / F1 / F2 / HSTS** areas deferred
from Phases 8B.

## Model

There are two response classes, and they must not be confused:

1. **HTML documents** (the React SPA served from `frontend/dist`).
2. **API JSON and static uploads** (`/api/*`, `/uploads/*`).

A `Content-Security-Policy` is only meaningful on the HTML documents; putting it on
JSON/upload responses adds no protection. Therefore:

- **API-side headers** (JSON/requests) are set by the FastAPI middleware for
  defense-in-depth on every API/upload response.
- **Document-level CSP + HSTS** must be set by the reverse proxy on the HTML
  document (and HSTS on all `https` responses).

## 1. API/upload headers (set by the application)

Applied in `backend/app/main.py` on every response via a middleware:

| Header | Value | Rationale |
|--------|-------|-----------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-sniffing of uploads/JSON. |
| `X-Frame-Options` | `DENY` | Block clickjacking / frame embedding. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Trim referrer leakage. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Deny sensitive browser features. |

These are always added; the FastAPI app deliberately does **not** return a CSP.

## 2. Document-level headers (set by reverse proxy)

On the HTML document served by the proxy (see `Production_Deployment.md`):

| Header | Recommended value |
|--------|-------------------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (**HSTS**; only after TLS verified) |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com; connect-src 'self'; frame-ancestors 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

### CSP notes

- The application **requires** the following cross-origin sources, which MUST remain
  in the CSP or image/font rendering will break:
  - `https://images.unsplash.com` — hero/section/gallery/food images (see
    `frontend/src/utils/constants.ts` and the `<link rel="preload" as="image">` in
    `frontend/index.html`).
  - `https://fonts.googleapis.com` — the Google Fonts stylesheet (Cormorant Garamond
    + Inter, loaded in `frontend/index.html`).
  - `https://fonts.gstatic.com` — the font files themselves (`font-src`).
- `style-src 'unsafe-inline'` is required by the styling stack (Tailwind/Vite inline
  styles); tighten it to `'self'` only if the app is verified to build external CSS
  only. Do not remove `https://fonts.googleapis.com` from `style-src`.
- `connect-src 'self'` covers `/api/**` and `/uploads/**` (same origin).
- `frame-ancestors 'none'` plus `X-Frame-Options: DENY` together give robust
  clickjacking protection.
- No `unsafe-eval`, no inline-script allowance, and no WebSocket/worker allowance —
  the app does not require them and none are granted.
- Revisit the CSP whenever new third-party scripts, fonts, embeds, or image hosts are
  added.

### HSTS notes

- Set HSTS only **after** HTTPS is confirmed working and all traffic is TLS; an
  early/broken HSTS can lock users out of an `http` fallback.
- Add the site to the [HSTS preload list](https://hstspreload.org/) only when you
  are confident `https` is the only transport.

## 3. Why CSP/HSTS are not in the application

- The FastAPI app serves JSON/static uploads, where a CSP is ineffective and could
  break images served from `/uploads`.
- The HTML is produced by the frontend build (`frontend/dist`), served by the proxy
  (Nginx/Caddy/Traefik). The header layer that owns the HTML is the proxy.
- Centralizing HSTS at the proxy means a single, known termination point for TLS.

## 4. SPA fallback (F2)

Because the SPA uses client-side routing, deep links/refresh must return
`frontend/dist/index.html`. Configure the proxy `try_files $uri $uri/ /index.html`
(Nginx) or the equivalent. Without this, refreshing `/reservations` returns 404.

## 5. Verification checklist

- `curl -sI https://<host>/` returns `Strict-Transport-Security`,
  `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`.
- `curl -sI https://<host>/api/health` returns the API-side headers (and no CSP —
  correct).
- Refresh a deep link (e.g. `/admin`) → serves the SPA (200, `index.html`).
