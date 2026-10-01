// Cross-app sign-in with HeatCheck (stats app, on Supabase). Each direction
// passes the sending app's own login token in the URL fragment, which
// browsers never send to any server, and the receiving side verifies it on
// its own backend: our Firebase ID token as #blToken, HeatCheck's Supabase
// access token as #hcToken. See docs/HEATCHECK_INTEGRATION.md.
import { getFunctions, httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";

const HEATCHECK_URL = import.meta.env.VITE_HEATCHECK_URL;
export const isHeatcheckEnabled = Boolean(HEATCHECK_URL);

// HeatCheck → basketbo-lista: if this page was opened with #hcToken=..., strip
// it from the address bar right away (so it isn't left in history or copied
// along with the link) and exchange it for a session here.
export const signInFromHeatcheckLink = async (app, auth) => {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("hcToken");
  if (!token) return;

  params.delete("hcToken");
  const hash = params.toString();
  window.history.replaceState(null, "", window.location.pathname + window.location.search + (hash ? `#${hash}` : ""));

  try {
    const exchange = httpsCallable(getFunctions(app, "asia-southeast1"), "exchangeHeatcheckToken");
    const { data } = await exchange({ token });
    await signInWithCustomToken(auth, data.customToken);
  } catch (error) {
    // Falls back to the normal flow; the user can still sign in with Google.
    console.error("HeatCheck sign-in failed:", error);
  }
};

// basketbo-lista → HeatCheck: open HeatCheck for this event with the user's
// ID token attached. The tab is opened synchronously so popup blockers allow
// it, then pointed at HeatCheck once the token is ready.
export const openHeatcheckStats = async (user, event) => {
  const tab = window.open("", "_blank");
  try {
    const token = await user.getIdToken();
    const url = new URL(HEATCHECK_URL);
    url.searchParams.set("source", "basketbo-lista");
    url.searchParams.set("eventId", event.id);
    url.hash = new URLSearchParams({ blToken: token }).toString();
    tab.location.href = url.toString();
  } catch (error) {
    console.error("Error opening HeatCheck:", error);
    tab?.close();
  }
};
