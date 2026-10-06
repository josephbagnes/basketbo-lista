const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { Resend } = require("resend");

// Same region as the Firestore database, so the triggers fire locally.
setGlobalOptions({ region: "asia-southeast1" });

initializeApp();
const db = getFirestore();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
// Must be an address on a domain verified in Resend, e.g.
// "basketbo-lista <noreply@basketbo-lista.com>".
const RESEND_FROM = defineString("RESEND_FROM");
const APP_URL = defineString("APP_URL", { default: "https://basketbo-lista.web.app" });
// HeatCheck's Supabase project, whose access tokens are accepted by
// exchangeHeatcheckToken: its URL (https://<ref>.supabase.co) and its
// anon/publishable key. The key is public (it ships in HeatCheck's frontend)
// but is kept in Secret Manager alongside other credentials anyway.
// An empty URL disables the HeatCheck sign-in handoff.
const HEATCHECK_SUPABASE_URL = defineString("HEATCHECK_SUPABASE_URL", { default: "" });
const HEATCHECK_SUPABASE_ANON_KEY = defineSecret("HEATCHECK_SUPABASE_ANON_KEY");

// Emails are only sent for: a registration that lands inside the event's max
// (not the waitlist), a waitlisted registration getting bumped up when
// someone ahead of it cancels, and cancellations. Each player email is
// exactly one recipient (Resend counts every to/cc/bcc recipient as a
// separate email). On top of that, each cancellation sends the main admin
// one summary of who cancelled and who got upgraded. All are decided here on
// the server from the registrations collection, so the client can't trigger
// arbitrary emails.

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const formatDate = (date) => new Date(date).toLocaleDateString("en-GB", {
  year: "numeric",
  month: "short",
  day: "numeric",
  weekday: "short",
  timeZone: "UTC",
}).toUpperCase().replace(",", "");

const formatTime = (time) => new Date(`1970-01-01T${time}:00Z`).toLocaleTimeString("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
}).toUpperCase();

// Mirrors generateEventLink in AdminDashboard.jsx.
const eventLink = (eventId, event) => {
  const url = new URL(APP_URL.value());
  url.pathname = "/events";
  if (event.useOpaqueLink) {
    url.searchParams.set("id", eventId);
  } else {
    url.searchParams.set("groupId", event.groupId);
    url.searchParams.set("date", event.date);
    url.searchParams.set("venue", event.venue);
    url.searchParams.set("startTime", event.startTime);
    url.searchParams.set("endTime", event.endTime);
  }
  return url.toString();
};

// Same ordering the listing page uses: first come, first served by timestamp.
const byTimestamp = (a, b) => (a.timestamp || "").localeCompare(b.timestamp || "") || a.id.localeCompare(b.id);

const getGroup = async (groupId) => {
  if (!groupId) return {};
  const snap = await db.collection("groups").where("groupId", "==", groupId).limit(1).get();
  return snap.empty ? {} : snap.docs[0].data();
};

const getSortedRegistrations = async (dateId) => {
  const snap = await db.collection("dates").doc(dateId).collection("registrations").get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((reg) => reg.name)
    .sort(byTimestamp);
};

// Lenient by a day so timezone differences between the server (UTC) and the
// players never suppress a same-day email.
const isPastEvent = (date) => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return !date || date < yesterday;
};

const eventDetailsHtml = (groupName, event) => `<b>Group</b>: ${escapeHtml(groupName)}`
  + `<br><b>Date</b>: ${escapeHtml(formatDate(event.date))}`
  + `<br><b>Time</b>: ${escapeHtml(`${formatTime(event.startTime)} - ${formatTime(event.endTime)}`)}`
  + `<br><b>Venue</b>: ${escapeHtml(event.venue)}`;

const deliver = async ({ to, subject, html, idempotencyKey }) => {
  const resend = new Resend(RESEND_API_KEY.value());
  const { error } = await resend.emails.send({ from: RESEND_FROM.value(), to, subject, html }, { idempotencyKey });
  if (error) {
    // Throwing lets the trigger retry (if retries are enabled); the
    // idempotency key keeps a retry from sending a duplicate.
    throw new Error(`Resend error: ${error.name}: ${error.message}`);
  }
  logger.info("Sent email", { subject, idempotencyKey });
};

// Email to the player. Without a player email it goes to the main admin
// instead only when adminFallback is set; cancellations and upgrades skip it
// because the admin already gets sendAdminCancellation.
const sendPlayerEmail = async ({ subject, eventId, event, group, reg, includePin, adminFallback, idempotencyKey }) => {
  const to = reg.email || (adminFallback && group.adminEmail);
  if (!to) return;
  const groupName = group.name || "basketbo-lista";

  let html = eventDetailsHtml(groupName, event) + `<br><br><b>Name</b>: ${escapeHtml(reg.name)}`;
  // The PIN only ever goes to the player themselves, never the admin fallback.
  if (includePin && reg.pin && reg.email) {
    html += `<br><b>PIN</b>: ${escapeHtml(reg.pin)}`;
  }
  html += `<br><br><b>Link</b>: ${escapeHtml(eventLink(eventId, event))}`;

  await deliver({ to, subject: `[${groupName}] ${subject}`, html, idempotencyKey });
};

// One email to the main admin per cancellation, combining who cancelled and
// who (if anyone) moved up from the waitlist into the freed spot.
const sendAdminCancellation = async ({ eventId, event, group, cancelled, wasWaitlisted, promoted, remainingCount, idempotencyKey }) => {
  if (!group.adminEmail) return;
  const groupName = group.name || "basketbo-lista";
  const contact = (reg) => (reg.email ? ` (${escapeHtml(reg.email)})` : " (no email on file)");

  let html = eventDetailsHtml(groupName, event)
    + `<br><br><b>Cancelled</b>: ${escapeHtml(cancelled.name)}${contact(cancelled)}`
    + ` from the ${wasWaitlisted ? "waitlist" : "registered list"}`;
  if (promoted) {
    html += `<br><b>Upgraded from waitlist</b>: ${escapeHtml(promoted.name)}${contact(promoted)}`;
    if (!promoted.email) html += "<br><i>They have no email on file, so please let them know.</i>";
  } else if (!wasWaitlisted) {
    html += "<br><b>Upgraded from waitlist</b>: none (waitlist is empty)";
  }
  html += `<br><br><b>Registered</b>: ${Math.min(remainingCount, event.max)} / ${event.max}`
    + `<br><b>Waitlist</b>: ${Math.max(remainingCount - event.max, 0)}`
    + `<br><br><b>Link</b>: ${escapeHtml(eventLink(eventId, event))}`;

  const subject = promoted
    ? `${cancelled.name} cancelled, ${promoted.name} upgraded from waitlist`
    : `${cancelled.name} cancelled${wasWaitlisted ? " (waitlist)" : ""}`;
  await deliver({ to: group.adminEmail, subject: `[${groupName}] Admin: ${subject}`, html, idempotencyKey });
};

exports.onRegistrationCreated = onDocumentCreated(
  { document: "dates/{dateId}/registrations/{regId}", secrets: [RESEND_API_KEY] },
  async (e) => {
    const { dateId, regId } = e.params;
    const reg = { id: regId, ...e.data?.data() };

    const eventSnap = await db.collection("dates").doc(dateId).get();
    if (!eventSnap.exists) return;
    const event = eventSnap.data();

    const registrations = await getSortedRegistrations(dateId);
    const position = registrations.findIndex((r) => r.id === regId);
    // Waitlisted registrations get their email later, if and when they're
    // upgraded (see onRegistrationDeleted).
    if (position < 0 || position >= event.max) return;

    await sendPlayerEmail({
      subject: "Registration Confirmed",
      eventId: dateId,
      event,
      group: await getGroup(event.groupId),
      reg,
      includePin: true,
      adminFallback: true,
      idempotencyKey: `registered-${dateId}-${regId}`,
    });
  }
);

exports.onRegistrationDeleted = onDocumentDeleted(
  { document: "dates/{dateId}/registrations/{regId}", secrets: [RESEND_API_KEY] },
  async (e) => {
    const { dateId } = e.params;
    const deleted = { id: e.params.regId, ...e.data?.data() };

    const eventSnap = await db.collection("dates").doc(dateId).get();
    if (!eventSnap.exists) return;
    const event = eventSnap.data();
    if (isPastEvent(event.date)) return;

    const remaining = await getSortedRegistrations(dateId);
    // Where the cancelled registration sat among those still on the list. If
    // it was inside the max, everyone behind it moved up one, and whoever is
    // now in the last confirmed slot came off the waitlist.
    const deletedPosition = remaining.filter((r) => byTimestamp(r, deleted) < 0).length;
    const wasWaitlisted = deletedPosition >= event.max;

    const group = await getGroup(event.groupId);
    const promoted = !wasWaitlisted && remaining.length >= event.max ? remaining[event.max - 1] : null;

    const sends = [
      sendPlayerEmail({
        subject: `${wasWaitlisted ? "Waitlist " : ""}Cancellation`,
        eventId: dateId,
        event,
        group,
        reg: deleted,
        idempotencyKey: `cancelled-${dateId}-${deleted.id}`,
      }),
      sendAdminCancellation({
        eventId: dateId,
        event,
        group,
        cancelled: deleted,
        wasWaitlisted,
        promoted,
        remainingCount: remaining.length,
        idempotencyKey: `admin-cancelled-${dateId}-${deleted.id}`,
      }),
    ];
    if (promoted) {
      sends.push(sendPlayerEmail({
        subject: "Waitlist upgraded to registered",
        eventId: dateId,
        event,
        group,
        reg: promoted,
        idempotencyKey: `upgraded-${dateId}-${promoted.id}`,
      }));
    }

    // One failing send shouldn't stop the other; rethrow afterwards so the
    // trigger can still retry.
    const failed = (await Promise.allSettled(sends)).find((r) => r.status === "rejected");
    if (failed) throw failed.reason;
  }
);

// Cross-app sign-in from HeatCheck. HeatCheck links here with its Supabase
// access token for the user (#hcToken=...); the client hands it to this
// function, which asks HeatCheck's Supabase who the token belongs to, requires
// a verified Google identity, finds or creates the same Google user here, and
// returns a custom token the client signs in with.
const getHeatcheckUser = async (token) => {
  // Supabase validates the token itself (signature, expiry, revoked
  // sessions), so this works whichever JWT signing keys HeatCheck uses and
  // needs no HeatCheck secrets.
  const response = await fetch(`${HEATCHECK_SUPABASE_URL.value().replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: HEATCHECK_SUPABASE_ANON_KEY.value(), Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    logger.warn("Rejected HeatCheck token", { status: response.status });
    throw new HttpsError("unauthenticated", "Invalid or expired HeatCheck token.");
  }
  return response.json();
};

exports.exchangeHeatcheckToken = onCall({ secrets: [HEATCHECK_SUPABASE_ANON_KEY] }, async (request) => {
  if (!HEATCHECK_SUPABASE_URL.value() || !HEATCHECK_SUPABASE_ANON_KEY.value()) {
    throw new HttpsError("failed-precondition", "HeatCheck sign-in is not configured.");
  }
  const token = request.data?.token;
  if (typeof token !== "string" || !token) {
    throw new HttpsError("invalid-argument", "Missing token.");
  }

  const heatcheckUser = await getHeatcheckUser(token);
  const google = heatcheckUser.identities?.find((identity) => identity.provider === "google");
  const googleUid = google?.identity_data?.sub || google?.id;
  const email = google?.identity_data?.email || heatcheckUser.email;
  if (!googleUid || !email || !heatcheckUser.email_confirmed_at) {
    throw new HttpsError("permission-denied", "Only verified Google accounts can sign in from HeatCheck.");
  }
  const displayName = google.identity_data?.full_name || google.identity_data?.name;
  const photoURL = google.identity_data?.avatar_url || google.identity_data?.picture;

  const auth = getAuth();
  let user = await auth.getUserByProviderUid("google.com", googleUid).catch(() => null);
  user ??= await auth.getUserByEmail(email).catch(() => null);
  if (!user) {
    user = await auth.createUser({
      email,
      emailVerified: true,
      ...(displayName && { displayName }),
      ...(photoURL && { photoURL }),
    });
    // Linking the Google identity means a later "Sign in with Google" here
    // lands on this same account instead of creating a second one.
    user = await auth.updateUser(user.uid, {
      providerToLink: { providerId: "google.com", uid: googleUid, email, ...(displayName && { displayName }) },
    });
  }

  // Custom-token sessions report sign_in_provider "custom", so this claim is
  // what firestore.rules checks to treat them like a Google sign-in. Only
  // this server can mint custom tokens, so the claim can't be forged.
  return { customToken: await auth.createCustomToken(user.uid, { google_verified: true }) };
});
