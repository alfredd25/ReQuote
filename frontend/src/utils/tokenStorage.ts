/**
 * tokenStorage.ts – Client-side JWT access token management.
 *
 * TOKEN STORAGE STRATEGY & SECURITY ANALYSIS:
 * -------------------------------------------
 * 1. Current Architecture:
 *    The FastAPI backend issues Bearer tokens via OAuth2 JSON payloads (`TokenResponse.access_token`).
 *    It does not currently set `Set-Cookie` with `HttpOnly`, `Secure`, and `SameSite` flags.
 *
 * 2. Security Trade-offs (localStorage vs. Cookies):
 *    - HttpOnly Cookies: Provide strong defense against token exfiltration via Cross-Site
 *      Scripting (XSS) because JavaScript cannot read document.cookie. However, they require
 *      cookie-issuing endpoints on the backend and introduce Cross-Site Request Forgery (CSRF)
 *      considerations that require anti-CSRF tokens.
 *    - Web Storage (localStorage / sessionStorage):
 *      WARNING: Web Storage is NOT fully secure against XSS. Any malicious script executed
 *      within the application's origin (e.g., via compromised third-party dependencies or unescaped
 *      user input) can read `window.localStorage` and exfiltrate the access token.
 *
 * 3. Mitigations in this Application:
 *    - All React components use standard JSX escaping to prevent injection vulnerabilities.
 *    - Tokens stored here are restricted to the API client request interceptor.
 *    - In addition to localStorage persistence, an in-memory token state is kept in `AuthContext`.
 *    - Tokens are wiped immediately upon any HTTP 401 Unauthorized response or explicit logout.
 *    - Short token expiration lifetimes on the backend limit the blast radius if a token is intercepted.
 */

const TOKEN_KEY = 'requote_access_token'

/**
 * Retrieve the stored JWT token, if available.
 */
export function getStoredToken(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(TOKEN_KEY)
    }
  } catch (err) {
    console.warn('Unable to access localStorage for JWT retrieval:', err)
  }
  return null
}

/**
 * Persist the JWT token to local storage.
 */
export function setStoredToken(token: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TOKEN_KEY, token)
    }
  } catch (err) {
    console.warn('Unable to persist JWT in localStorage:', err)
  }
}

/**
 * Remove the stored JWT token on logout or session expiration.
 */
export function removeStoredToken(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(TOKEN_KEY)
    }
  } catch (err) {
    console.warn('Unable to remove JWT from localStorage:', err)
  }
}

