# HeatCheck ↔ basketbo-lista sign-in handoff

Lets a user who is signed in with Google on one app open the other app already
signed in as the same Google account.

- **basketbo-lista** uses Firebase Auth (Google sign-in).
- **HeatCheck** uses Supabase Auth (Google sign-in).

In both directions, the app the user is on puts **its own login token** for
the user in the link's URL fragment (`#...`), and the receiving app verifies
that token **on its server** before signing the user in. Fragments are never
sent to any server in HTTP requests. The receiving app removes the token from
the address bar right after reading it.

Users are matched across the two apps by their **Google account**: the Google
user ID (`sub`), falling back to the verified email address.

---

## 1. basketbo-lista → HeatCheck ("See stats in HeatCheck")

### What basketbo-lista sends

The basketbo-lista event admin pastes the **HeatCheck stats link for that
game** into the event. Registered players signed in with Google then get a
"See stats in HeatCheck" button, which opens that link in a new tab with two additions:

```
<HeatCheck stats link>?source=basketbo-lista#blToken=<Firebase ID token>
```

| Part | Meaning |
|---|---|
| `<HeatCheck stats link>` | Exactly the link the admin pasted, e.g. a game-day link like `https://heatcheck.club/game-day/<id>`. Any existing query parameters are kept. It must be on HeatCheck's origin; basketbo-lista refuses to attach a token to any other site. |
| `source` | Always `basketbo-lista` |
| `blToken` | Firebase ID token (RS256 JWT) issued by the `basketbo-lista` Firebase project. Valid for up to 1 hour. |

So HeatCheck doesn't need to know basketbo-lista's event IDs. HeatCheck only
needs a shareable stats page per game that admins can copy, and every such
page must handle `#blToken` (simplest: handle it once in the app shell /
layout for every route).

### What HeatCheck needs to implement

**1. Client:** on page load, read `blToken` from `window.location.hash`,
immediately remove it from the URL (`history.replaceState`), and send it to a
server-side endpoint (e.g. a Supabase Edge Function).

**2. Server: verify the token.** It's a standard JWT. Verify it with any JWT
library against Google's public keys. Example for a Supabase Edge Function
(Deno) using `jose`:

```ts
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const FIREBASE_JWKS = createRemoteJWKSet(new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
));

const { payload } = await jwtVerify(blToken, FIREBASE_JWKS, {
  issuer: "https://securetoken.google.com/basketbo-lista",
  audience: "basketbo-lista",
  algorithms: ["RS256"],
}); // throws if the signature, issuer, audience or expiry is wrong

const firebase = payload.firebase as { sign_in_provider: string; identities?: Record<string, string[]> };
const isGoogle =
  firebase.sign_in_provider === "google.com" ||
  // Users who arrived on basketbo-lista from HeatCheck are signed in there
  // with a custom token that basketbo-lista only issues after verifying a
  // Google account; it carries this claim.
  (firebase.sign_in_provider === "custom" && payload.google_verified === true);

if (!isGoogle || !payload.email || payload.email_verified !== true) {
  throw new Error("Not a verified Google account"); // rejects anonymous sessions too
}

const email = payload.email as string;
const googleSub = firebase.identities?.["google.com"]?.[0]; // present for google.com sessions
```

> **Reject anonymous sessions** (`sign_in_provider === "anonymous"`).
> basketbo-lista gives visitors who haven't signed in an anonymous Firebase
> session. It only shows the "See stats in HeatCheck" button to Google-signed-in users,
> but HeatCheck must still check.

**3. Server: sign the user into Supabase.** Using the service-role key
(server only), find the HeatCheck user by email, create them if needed, then
issue a one-time sign-in token:

```ts
import { createClient } from "npm:@supabase/supabase-js@2";
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Create the user if they don't exist yet (ignore "already registered" errors).
await admin.auth.admin.createUser({ email, email_confirm: true });

const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (error) throw error;
return { tokenHash: data.properties.hashed_token };
```

**4. Client:** finish the sign-in:

```ts
await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
```

No email is sent in this flow. `generateLink` only returns the token.

**5.** If any step fails, show HeatCheck's normal sign-in.

---

## 2. HeatCheck → basketbo-lista

### What HeatCheck needs to send

A game-day page can link to its basketbo-lista event in either of two ways.
Use **A** when the HeatCheck admin has pasted a basketbo-lista link, otherwise
fall back to **B**.

**A. HeatCheck admin pastes the basketbo-lista event link (optional).**
Give game-days an optional "basketbo-lista event link" field. basketbo-lista
admins share event links like:

```
https://basketbo-lista.com/events?id=<eventId>
https://basketbo-lista.com/events?groupId=...&date=...&venue=...&startTime=...&endTime=...   (older events)
```

Link to the pasted URL as-is, with the token appended:

```ts
const url = new URL(pastedLink);
if (url.origin !== "https://basketbo-lista.com") throw new Error("Not a basketbo-lista link");
url.hash = new URLSearchParams({ hcToken }).toString();
```

> **Only attach `hcToken` to `https://basketbo-lista.com` links.** Check the
> origin when the admin saves the link **and** when the link is opened.
> Otherwise a mistyped or malicious link would send the user's HeatCheck
> token to another site.

**B. Automatic lookup (no HeatCheck setup).** If the basketbo-lista admin
pasted this game-day link into their event, pass **the game-day page's own
URL** in `heatcheck`:

```
https://basketbo-lista.com/events?heatcheck=<URL-encoded game-day URL>#hcToken=<Supabase access token>
```

```ts
const url = new URL("https://basketbo-lista.com/events");
url.searchParams.set("heatcheck", window.location.href);
url.hash = new URLSearchParams({ hcToken }).toString();
```

basketbo-lista opens the event whose admin pasted that game-day link. Only the
origin and path are compared, so query strings, fragments and a trailing
slash don't matter. If no event has that link yet, the page shows no event.

Other pages can link to `https://basketbo-lista.com/user#hcToken=...` (the
player's registered events). The `#hcToken` handling runs on every
basketbo-lista page.

- Get the token **when the user taps the link**, not when the page renders:
  ```ts
  const { data: { session } } = await supabase.auth.getSession();
  const hcToken = session?.access_token;
  ```
- The user must have signed in to HeatCheck with **Google**, and their email
  must be confirmed.
- Add `hcToken` only for signed-in users. Without it the link still opens the
  event; the user just isn't signed in automatically.

### What basketbo-lista does

Its server (`exchangeHeatcheckToken` Cloud Function) calls HeatCheck's
`GET <SUPABASE_URL>/auth/v1/user` with the token and HeatCheck's public anon
key. Supabase confirms the token is valid and returns the user. basketbo-lista
then requires a `google` identity with a confirmed email, finds or creates the
same Google user, and signs them in. Invalid or expired tokens fall back to
basketbo-lista's normal sign-in.

---

## What we need from HeatCheck

1. **Supabase project URL**, e.g. `https://abcdefgh.supabase.co`.
2. **Supabase anon / publishable key.** This is the public key already in
   HeatCheck's frontend. **Not** the service-role key.
3. **HeatCheck's site origin**, e.g. `https://heatcheck.club`. Only links on
   this origin can be pasted into events and opened with a token.
