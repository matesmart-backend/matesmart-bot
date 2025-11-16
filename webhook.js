// webhook.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// Read tokens and IDs from env (must be set in Render)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "m_smart_123";
const WA_TOKEN = process.env.WA_TOKEN || "<YOUR_WA_TOKEN>";
const PHONE_ID = process.env.PHONE_ID || "<YOUR_PHONE_ID>";

// GET verification used by Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("GET /webhook called", { mode, token, challenge: !!challenge });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified ✅");
    return res.status(200).send(challenge);
  }
  console.warn("Webhook verification failed (tokens don't match).");
  return res.sendStatus(403);
});

// POST handler for incoming messages
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // acknowledge quickly
  try {
    const body = req.body;
    console.log("Incoming webhook POST", JSON.stringify(body).slice(0,1000));

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          const from = (msg.from || "").replace(/\D/g, "");
          const type = msg.type;
          if (type === "text") {
            const userMsg = (msg.text?.body || "").toLowerCase();
            if (["hi","hello","hey","hii"].includes(userMsg)) {
              await sendWelcomeButtons(from);
            }
          }
          // handle reply-button payloads (if user taps a reply)
          if (type === "button") {
            const payload = msg.button?.payload;
            console.log("User tapped button payload:", payload);
            // add logic here to respond based on payload (groceries/food/medicine)
          }
        }
      }
    }
  } catch (e) {
    console.error("Error handling webhook POST:", e);
  }
});

async function sendWelcomeButtons(to) {
  try {
    const url = `https://graph.facebook.com/v17.0/${PHONE_ID}/messages`;
    const body = {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text:
"Hello! 👋 Welcome to MateSmart — Matelli’s Last Minute App! 🚀\n\nWe deliver groceries, medicines, fast food, and daily essentials quickly across Matelli & nearby areas.\nFresh products, fair prices, and super-fast doorstep delivery — everything you need, right when you need it.\n\n📍 Store Location: Matelli Bazaar, Matelli, Jalpaiguri, West Bengal\n📱 Facebook: facebook.com/MateSmart\n📸 Instagram: instagram.com/MateSmart\n\nNeed help placing an order or tracking one? Just message us — we’re here to help! 😊"
        },
        action: {
          buttons: [
            { type: "reply", reply: { id: "groceries", title: "Groceries" }},
            { type: "reply", reply: { id: "food", title: "Food" }},
            { type: "reply", reply: { id: "medicine", title: "Medicine" }}
          ]
        }
      }
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const j = await resp.json();
    console.log("sendWelcomeButtons response:", j);
  } catch (err) {
    console.error("Error sending welcome buttons:", err);
  }
}

// use Render port if present
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook running on port ${PORT}`));
