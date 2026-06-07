require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db");
const { extractIncomingMessages } = require("./messageParser");
const { handleRiderMessage, handleDriverMessage } = require("./conversation");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.get("/", (req, res) => {
  res.send("WhatsApp Ride Dispatch Bot is running.");
});

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
  try {
    const messages = extractIncomingMessages(req.body);

    for (const msg of messages) {
      const driverResult = await db.query("SELECT * FROM drivers WHERE phone = $1", [msg.from]);

      if (driverResult.rows[0]) {
        await handleDriverMessage(msg.from, msg.text, msg.buttonId);
      } else {
        if (msg.buttonId === "BOOK_RIDE") {
          await handleRiderMessage(msg.from, "BOOK", msg.buttonId);
        } else {
          await handleRiderMessage(msg.from, msg.text, msg.buttonId);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Ride bot server running on port ${PORT}`);
});
