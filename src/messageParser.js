function normalizePhone(phone) {
  if (!phone) return "";
  return phone.replace(/[^\d+]/g, "");
}

function extractIncomingMessages(body) {
  const entries = body.entry || [];
  const messages = [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const msg of value.messages || []) {
        const from = normalizePhone(msg.from);

        let text = "";
        let buttonId = null;

        if (msg.type === "text") {
          text = msg.text?.body || "";
        }

        if (msg.type === "interactive") {
          buttonId = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || null;
          text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || buttonId || "";
        }

        messages.push({
          from,
          text: text.trim(),
          buttonId,
          raw: msg
        });
      }
    }
  }

  return messages;
}

module.exports = { extractIncomingMessages, normalizePhone };
