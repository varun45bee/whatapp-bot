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

// ================= EVENTS =================

// ✅ QR EVENT
client.on("qr", (qr) => {
  console.log("📱 New QR generated");
  latestQR = qr;
});

// ✅ AUTHENTICATED
client.on("authenticated", () => {
  console.log("✅ Authenticated successfully!");
});

// ✅ READY
client.on("ready", () => {
  isReady = true;
  console.log("✅ WhatsApp Bot is ready and connected!");
});

// ✅ DISCONNECTED
client.on("disconnected", () => {
  isReady = false;
  console.log("❌ WhatsApp disconnected.");
});

// ================= START =================

// Delay start (important for Railway)
setTimeout(() => {
  client.initialize();
}, 5000);

// ================= API =================

// ✅ SEND MESSAGE API
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

// ================= ROUTES =================

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.json({ status: "WhatsApp bot running", ready: isReady });
});

// ✅ QR PAGE (AUTO REFRESH)
app.get("/qr", async (req, res) => {
  try {
    if (!latestQR) {
      return res.send(`
        <html>
          <body style="text-align:center;">
            <h2>⏳ Waiting for QR...</h2>
            <p>Refresh in 5 seconds</p>
          </body>
        </html>
      `);
    }

    const qrImage = await QRCode.toDataURL(latestQR);

    res.send(`
      <html>
        <head>
          <title>WhatsApp QR</title>
          <meta http-equiv="refresh" content="10">
        </head>
        <body style="text-align:center; font-family:sans-serif;">
          <h2>📱 Scan QR with WhatsApp</h2>
          <img src="${qrImage}" width="300"/>
          <p>Auto refresh every 10 seconds</p>
        </body>
      </html>
    `);
  } catch (err) {
    res.send("❌ Error generating QR");
  }
});

// ================= SERVER =================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});