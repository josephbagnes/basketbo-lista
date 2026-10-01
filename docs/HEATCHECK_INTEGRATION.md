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

## 1. basketbo-lista → HeatCheck ("View my stats")

### What basketbo-lista sends

basketbo-lista opens this URL in a new tab:

```
<HEATCHECK_URL>?source=basketbo-lista&eventId=<id>#blToken=<Firebase ID token>
```

| Part | Meaning |
|---|---|
| `<HEATCHECK_URL>` | The HeatCheck page you give us (see "What we need from HeatCheck") |
| `eventId` | basketbo-lista event ID (stable, opaque). HeatCheck should store it with the game so it can look up the stats. |
| `blToken` | Firebase ID token (RS256 JWT) issued by the `basketbo-lista` Firebase project. Valid for up to 1 hour. |

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
> session. It only shows the "My Stats" button to Google-signed-in users,
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

Link to a basketbo-lista page with the user's **Supabase access token** in the
fragment:

```
https://basketbo-lista.com/events?id=<eventId>#hcToken=<Supabase access token>
https://basketbo-lista.com/user#hcToken=<Supabase access token>       (the user's registrations)
```

- Get the token **when the user taps the link**, not when the page renders:
  ```ts
  const { data: { session } } = await supabase.auth.getSession();
  const hcToken = session?.access_token;
  ```
- The user must have signed in to HeatCheck with **Google**, and their email
  must be confirmed.
- Build the link only for signed-in users. Without `hcToken` the link still
  works; the user just isn't signed in automatically.

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
3. **The HeatCheck URL** that should receive "My Stats" links (section 1).
