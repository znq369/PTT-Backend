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
    await webpush.sendNotification(subscription, payload);
    console.log(`Successfully buzzed from ${senderName}`);
    res.status(200).send("Buzzed successfully!");
  } catch (error) {
    console.error("Push failed:", error);
    res.status(500).send("Push failed.");
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Push server listening on port " + listener.address().port);
});
