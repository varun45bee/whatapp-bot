const { Client } = require("whatsapp-web.js");
const express = require("express");
const QRCode = require("qrcode");

const app = express();
app.use(express.json());

let isReady = false;
let latestQR = null;

// ✅ WhatsApp Client
const client = new Client({
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  },
});

// ✅ QR EVENT (store QR)
client.on("qr", (qr) => {
  console.log("📱 QR received → open /qr in browser");
  latestQR = qr;
});

// ✅ READY
client.on("ready", () => {
  isReady = true;
  console.log("✅ WhatsApp Bot is ready and connected!");
});

// ✅ AUTH DEBUG (optional but helpful)
client.on("authenticated", () => {
  console.log("✅ Authenticated successfully!");
});

// ✅ DISCONNECTED
client.on("disconnected", () => {
  isReady = false;
  console.log("❌ WhatsApp disconnected.");
});

// ✅ DELAY START (important for Railway)
setTimeout(() => {
  client.initialize();
}, 5000);

// ================= API =================

// ✅ SEND MESSAGE
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

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.json({ status: "WhatsApp bot running", ready: isReady });
});

// ✅ QR PAGE (MAIN FEATURE 🔥)
app.get("/qr", async (req, res) => {
  if (!latestQR) {
    return res.send("⏳ QR not generated yet. Refresh...");
  }

  const qrImage = await QRCode.toDataURL(latestQR);

  res.send(`
    <html>
      <head>
        <title>WhatsApp QR</title>
        <meta http-equiv="refresh" content="20">
      </head>
      <body style="text-align:center; font-family:sans-serif;">
        <h2>📱 Scan QR with WhatsApp</h2>
        <img src="${qrImage}" />
        <p>Auto-refresh every 20 seconds</p>
      </body>
    </html>
  `);
});

// ✅ PORT
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});