const { Client } = require("whatsapp-web.js");
const express = require("express");
const qrcode = require("qrcode-terminal");

const app = express();
app.use(express.json());

let isReady = false;

// ✅ WhatsApp Client (MINIMAL + STABLE)
const client = new Client({
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  },
});

// ✅ QR Code
client.on("qr", (qr) => {
  console.log("\n📱 Scan this QR code with Dr. Pratima's WhatsApp:\n");
  qrcode.generate(qr, { small: true });
});

// ✅ Ready
client.on("ready", () => {
  isReady = true;
  console.log("✅ WhatsApp Bot is ready and connected!");
});

// ✅ Disconnected
client.on("disconnected", () => {
  isReady = false;
  console.log("❌ WhatsApp disconnected.");
});

// ✅ DELAYED START (VERY IMPORTANT FIX)
setTimeout(() => {
  client.initialize();
}, 5000);

// ✅ API Endpoint
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

// ✅ Health check
app.get("/", (req, res) => {
  res.json({ status: "WhatsApp bot running", ready: isReady });
});

// ✅ PORT (Railway compatible)
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});