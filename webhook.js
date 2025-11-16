
// webhook.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "<YOUR_VERIFY_TOKEN>";
const WA_TOKEN = process.env.WA_TOKEN || "<YOUR_WA_TOKEN>";
const PHONE_ID = process.env.PHONE_ID || "<YOUR_PHONE_ID>";

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          const from = msg.from.replace(/\D/g, "");
          const type = msg.type;
          if (type === "text") {
            const userMsg = msg.text.body.toLowerCase();
            if (["hi","hello","hey","hii"].includes(userMsg)) {
              await sendWelcomeButtons(from);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
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

  console.log(await resp.json());
}

app.listen(3000, () => console.log("Webhook running on port 3000"));
