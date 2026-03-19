const { Client } = require("whatsapp-web.js");
const express = require("express");
const QRCode = require("qrcode"); // ✅ UPDATED

const app = express();
app.use(express.json());

let isReady = false;

const client = new Client({
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// ✅ NEW QR HANDLER
client.on("qr", async (qr) => {
  console.log("\n📱 Scan this QR code (open link below):\n");

  try {
    const qrUrl = await QRCode.toDataURL(qr);
    console.log("👉 Copy & open in browser:");
    console.log(qrUrl);
  } catch (err) {
    console.error("QR generation failed:", err);
  }
});

client.on("ready", () => {
  isReady = true;
  console.log("✅ WhatsApp Bot is ready and connected!");
});

client.on("disconnected", () => {
  isReady = false;
  console.log("❌ WhatsApp disconnected.");
});

setTimeout(() => {
  client.initialize();
}, 5000);

// API
app.post("/send", async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: "WhatsApp not connected yet" });
  }

  const { name, phone, email, condition, date, time, lang, message } = req.body;

  const msg = `🌿 *New Consultation Request*
━━━━━━━━━━━━━━━━━━━━
👤 *Patient Details*
• Name      : ${name}
• Phone     : ${phone}
• Email     : ${email || "Not provided"}

🩺 *Medical Info*
• Condition : ${condition}
• Date      : ${date || "Not specified"}
• Time      : ${time || "Not specified"}
• Language  : ${
    lang === "en"
      ? "English"
      : lang === "hi"
      ? "Hindi"
      : "Marathi"
  }
• Message   : ${message || "None"}
━━━━━━━━━━━━━━━━━━━━
_Sent via Dr. Pratima Agale Website_`;

  try {
    const toNumber = "919359875511@c.us";
    await client.sendMessage(toNumber, msg);
    res.json({ success: true });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "WhatsApp bot running", ready: isReady });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});