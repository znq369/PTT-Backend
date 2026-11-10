const express = require("express");
const webpush = require("web-push");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const PUBLIC_KEY = "BCPTdBcEXkGuQTtLehEmXp7KkN5jqhAyp4VbL7GZn1ixXAyt_AOXq6qAzzSJO8BM47YnfdGmLc990m0P3ER_2RA";
const PRIVATE_KEY = "xTVTs7JuPjlzaSS8UnEEYBtCpFMlihslX9_9SIph1sU";

webpush.setVapidDetails(
  "mailto:888znq@Gmail.com", 
  PUBLIC_KEY,
  PRIVATE_KEY
);

app.get("/", (req, res) => {
  res.send("Live Line push relay server is active.");
});

function pickIceServers(list) {
  const entries = [].concat(list || []);
  const urlsOf = (e) => [].concat((e && e.urls) || []);
  const stunUrl = entries.flatMap(urlsOf).find((u) => /^stun:/.test(u) && !/:53(\?|$)/.test(u));
  const t = entries.find((e) => urlsOf(e).some((u) => /^turns?:/.test(u)) && e.username && e.credential);
  const out = [];
  if (stunUrl) out.push({ urls: stunUrl });
  if (t) {
    const u = urlsOf(t);
    const pick = [
      u.find((x) => /^turn:/.test(x) && /transport=udp/.test(x) && /:3478/.test(x)),
      u.find((x) => /^turns:/.test(x) && /:443/.test(x)) || u.find((x) => /^turns:/.test(x))
    ].filter(Boolean);
    if (pick.length) out.push({ urls: pick, username: t.username, credential: t.credential });
  }
  if (!out.some((x) => x.username)) throw new Error("no usable TURN entry");
  return out;
}

let turnCache = { at: 0, data: null };
app.get("/turn-credentials", async (req, res) => {
  const id = process.env.CF_TURN_KEY_ID, token = process.env.CF_TURN_API_TOKEN;
  if (!id || !token) return res.status(204).end();
  try {
    if (!turnCache.data || Date.now() - turnCache.at > 3600 * 1000) {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttl: 86400 })
      });
      if (!r.ok) throw new Error("cloudflare " + r.status);
      const d = await r.json();
      turnCache = { at: Date.now(), data: { iceServers: pickIceServers(d.iceServers) } };
    }
    res.set("Cache-Control", "no-store").json(turnCache.data);
  } catch (e) {
    console.error("TURN creds failed:", e.message);
    res.status(204).end();
  }
});

app.post("/buzz", async (req, res) => {
  const { subscription, senderName } = req.body;
  
  if (!subscription) {
    return res.status(400).send("No subscription provided.");
  }

  const payload = JSON.stringify({
    title: "Live Line Alert",
    body: `${senderName || 'An Agent'} is buzzing you!`
  });

  try {
    await webpush.sendNotification(subscription, payload, { urgency: "high", TTL: 30 });
    console.log(`Successfully buzzed from ${senderName}`);
    res.status(200).send("Buzzed successfully!");
  } catch (error) {
    console.error("Push failed:", error);
    if (error.statusCode === 404 || error.statusCode === 410) return res.status(410).send("Subscription expired.");
    res.status(500).send("Push failed.");
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Push server listening on port " + listener.address().port);
});
