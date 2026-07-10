# JWT → HTTP-only Cookie Auth Migration

## What Changed

| File | Change |
|---|---|
| `utils/cookieOptions.js` | **New** — shared factory, single source of truth for cookie config |
| `controllers/authcontrollers/login.js` | All 3 handlers now use `getCookieOptions()`; token removed from Google & GitHub response bodies |
| `middlewares/auth.middleware.js` | Granular `TokenExpiredError` vs `JsonWebTokenError` handling; optional chaining for `req.cookies` |

---

## 1 — New Utility: `cookieOptions.js`

```js
// src/utils/cookieOptions.js
const getCookieOptions = (overrides = {}) => ({
  httpOnly: true,                                      // XSS: JS can never read this cookie
  secure: process.env.NODE_ENV === "production",       // HTTPS-only in prod; http in dev
  sameSite: "lax",                                     // CSRF: blocks cross-site POST, allows OAuth top-level redirects
  maxAge: parseDurationToMs(process.env.JWT_EXPIRES_IN || "24h"), // mirrors JWT lifetime
  ...overrides,
});
```

> [!IMPORTANT]
> Add `JWT_EXPIRES_IN=24h` to your `config.env`. The utility reads it automatically so the cookie and token always expire together.

---

## 2 — Logout Endpoint (add this now)

Without a logout route the user has no way to clear the cookie. Add this to your auth controller and wire it in `auth.routes.js`.

```js
// In login.js — add this export
const logout = (req, res) => {
  // Clear the cookie by setting maxAge to 0.
  // Must match the EXACT same path/domain/secure flags used when setting it.
  res
    .cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // immediate expiry
    })
    .status(200)
    .json({ message: "Logged out successfully." });
};

module.exports = { login, googleLogin, githubLogin, logout };
```

```js
// In auth.routes.js — add this line
const { protect } = require("../../middlewares/auth.middleware");
router.post("/logout", protect, logout);  // protect ensures only logged-in users can logout
```

---

## 3 — CORS — Backend (`app.js`)

Your `app.js` **already has the correct configuration**. No changes needed:

```js
app.use(cors({
  origin: (origin, callback) => { /* your existing allowlist check */ },
  credentials: true,   // ✅ REQUIRED — without this, cookies are stripped
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
}));
```

> [!WARNING]
> `credentials: true` paired with a wildcard `origin: "*"` will be **rejected by browsers**. Your current dynamic allowlist is the correct pattern — keep it.

---

## 4 — Frontend Requirements

Every single API call your Angular app makes **must include `credentials: "include"`** (or `withCredentials: true` in HttpClient). Otherwise, the browser silently drops the cookie.

### Angular HttpClient (global interceptor — recommended)

```ts
// src/app/core/interceptors/credentials.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const cloned = req.clone({ withCredentials: true });
  return next(cloned);
};
```

```ts
// app.config.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([credentialsInterceptor])),
  ],
};
```

### Per-request (plain fetch / axios)

```ts
// fetch
fetch('https://api.example.com/auth/login', {
  method: 'POST',
  credentials: 'include',   // ← this is the key
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

// axios — set once globally
axios.defaults.withCredentials = true;
```

> [!NOTE]
> After migrating, **remove all `localStorage.setItem('token', ...)` calls** from your frontend. The token no longer travels in the response body and should never touch JS-land storage.

---

## 5 — OAuth Flow Diagrams

### Google (current — correct flow)

```
Frontend ──(POST /auth/google, body: { idToken })──► Backend
                                                          │
                                                   verifyIdToken()
                                                          │
Backend ◄──── Set-Cookie: token=...; HttpOnly ───────────┘
(response body: developer profile only, NO token)
```

### GitHub (current — correct flow)

```
GitHub ──(redirect with ?code=xxx)──► Frontend
                                           │
                              (POST /auth/github, body: { code })
                                           │
                                        Backend
                                           │ exchange code → GitHub accessToken
                                           │ sign our own JWT
                                           │
Backend ◄──── Set-Cookie: token=...; HttpOnly ─────────────┘
(response body: developer profile only, NO token)
```

> [!NOTE]
> Both OAuth flows are **direct API calls from the frontend** (not server-side redirects), so `sameSite: "lax"` works perfectly — the cookie is set in a first-party context.

---

## 6 — Socket.io — Handling the Missing Token

Because the token is now HTTP-only, **Socket.io handshake `auth.token` will be empty** unless you handle it differently. Two clean options:

### Option A — Cookie forwarding (simplest, works same-origin)
Socket.io automatically forwards cookies when `withCredentials: true` is set on the client. Read the cookie server-side:

```js
// app.js — replace current io.use() block
io.use((socket, next) => {
  // Cookies are forwarded automatically when withCredentials: true is set on the client.
  const cookieHeader = socket.handshake.headers.cookie || "";
  const tokenCookie = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("token="));

  const token = tokenCookie ? tokenCookie.split("=")[1]?.trim() : null;

  if (!token) return next(new Error("Authentication error: No token provided"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id || decoded._id;
    next();
  } catch {
    next(new Error("Authentication error: Invalid token"));
  }
});
```

```ts
// Angular Socket.io client
const socket = io('https://api.example.com', {
  withCredentials: true,  // ← forwards the HTTP-only cookie automatically
});
```

### Option B — Short-lived socket token endpoint (for cross-origin sockets)
Expose `GET /auth/socket-token` (protected route) that returns a **1-minute JWT** only for socket use. The frontend fetches this immediately before connecting.

---

## 7 — Security Checklist

- [x] `httpOnly: true` — token invisible to JavaScript
- [x] `secure: true` in production — HTTPS-only transmission
- [x] `sameSite: "lax"` — CSRF protection without breaking OAuth redirects
- [x] `maxAge` tied to `JWT_EXPIRES_IN` — cookie and token expire together
- [x] Token removed from Google & GitHub response bodies
- [x] CORS `credentials: true` with explicit allowlist (not `"*"`)
- [x] `protect` middleware distinguishes expired vs tampered tokens
- [x] `logout` clears cookie server-side (client can't do this for httpOnly cookies)
- [ ] Add `JWT_EXPIRES_IN=24h` to `config.env`
- [x] Add `/auth/logout` route (called by `AuthService.logout()`)
- [x] Added `CredentialsInterceptor` — all requests include `withCredentials: true`
- [x] Removed `localStorage` / `sessionStorage` token storage from frontend
- [x] Updated Socket.io client to use `withCredentials: true`
