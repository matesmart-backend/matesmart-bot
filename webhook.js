// webhook.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// Use env vars; fallback to explicit token only for local dev (change 'm_smart_123' if you use a different token)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "m_smart_123";
const WA_TOKEN     = process.env.WA_TOKEN     || "<YOUR_WA_TOKEN>";
const PHONE_ID     = process.env.PHONE_ID     || "<YOUR_PHONE_ID>";

// GET verification for Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }
  console.warn("❌ Webhook verification failed (tokens don't match)");
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  // always reply 200 quickly
  res.sendStatus(200);

  try {
    const body = req.body;
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          const from = (msg.from || "").replace(/\D/g, "");
          const type = msg.type;
          if (type === "text") {
            const userMsg = (msg.text?.body || "").toLowerCase().trim();
            if (["hi","hello","hey","hii"].includes(userMsg)) {
              await sendWelcomeButtons(from);
            }
          } else if (type === "interactive") {
            // handle button replies here if needed
            console.log("Interactive message:", msg);
          }
        }
      }
    }
  } catch (e) {
    console.error("POST /webhook error:", e);
  }
});

async function sendWelcomeButtons(to) {
  const url = `https://graph.facebook.com/v17.0/${PHONE_ID}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
`Hello! 👋 Welcome to MateSmart — Matelli’s Last Minute App! 🚀

We deliver groceries, medicines, fast food, and daily essentials quickly across Matelli & nearby areas.
Fresh products, fair prices, and super-fast doorstep delivery — everything you need, right when you need it.

📍 Store Location: Matelli Bazaar, Matelli, Jalpaiguri, West Bengal
📱 Facebook: facebook.com/MateSmart
📸 Instagram: instagram.com/MateSmart

Need help placing an order or tracking one? Just message us — we’re here to help! 😊`
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "groceries", title: "Groceries" } },
          { type: "reply", reply: { id: "food", title: "Food" } },
          { type: "reply", reply: { id: "medicine", title: "Medicine" } }
        ]
      }
    }
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await resp.json();
    console.log("sendWelcomeButtons response:", json);
  } catch (err) {
    console.error("sendWelcomeButtons error:", err);
  }
}

// IMPORTANT: Use Render's PORT if provided
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook running on port ${PORT}`));
