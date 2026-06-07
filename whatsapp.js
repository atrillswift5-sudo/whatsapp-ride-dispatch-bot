const axios = require("axios");

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";

async function sendText(to, body) {
  if (!token || !phoneNumberId) {
    console.log("[MOCK WHATSAPP TEXT]", { to, body });
    return;
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
}

async function sendButtons(to, body, buttons) {
  if (!token || !phoneNumberId) {
    console.log("[MOCK WHATSAPP BUTTONS]", { to, body, buttons });
    return;
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map((button) => ({
            type: "reply",
            reply: {
              id: button.id,
              title: button.title
            }
          }))
        }
      }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
}

module.exports = { sendText, sendButtons };
