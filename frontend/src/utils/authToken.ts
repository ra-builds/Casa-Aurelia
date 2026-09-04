// In-memory (non-persistent) access-token store (P1 auth hardening).
//
// The access token is kept in memory only — never in localStorage/sessionStorage —
// so it is not exposed to other scripts or persisted across tabs/reloads. The
// refresh token is handled via an HttpOnly cookie by the backend and is never
// touched by JavaScript at all.
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}
