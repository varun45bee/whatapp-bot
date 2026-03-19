const { Client, RemoteAuth } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");
const express = require("express");
const QRCode = require("qrcode");

const app = express();
app.use(express.json());

// Hardcoded as fallback (remove after Railway env var is confirmed working)
process.env.MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://varun45j_db_user:dRLMrExDHOLNh0P9@cluster0.hccmxyx.mongodb.net/whatsappbot?appName=Cluster0";

let isReady = false;
let latestQR = null;
let client = null;

// ================= MONGODB + CLIENT INIT =================

async function startBot() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected!");

    const store = new MongoStore({ mongoose });

    client = new Client({
      authStrategy: new RemoteAuth({
        store: store,
        backupSyncIntervalMs: 300000,
      }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-software-rasterizer",
          "--ignore-certificate-errors",
          "--window-size=1280,720",
        ],
      },
    });

    // ================= EVENTS =================

    client.on("qr", async (qr) => {
      console.log("📱 New QR generated — visit /qr to scan");
      latestQR = qr;
    });

    client.on("remote_session_saved", () => {
      console.log("💾 Session saved to MongoDB!");
    });

    client.on("authenticated", () => {
      console.log("✅ Authenticated successfully!");
      latestQR = null;
    });

    client.on("ready", () => {
      isReady = true;
      latestQR = null;
      console.log("✅ WhatsApp Bot is ready and connected!");
    });

    client.on("disconnected", async (reason) => {
      isReady = false;
      console.log("❌ WhatsApp disconnected:", reason);
      console.log("🔄 Restarting in 10 seconds...");
      setTimeout(async () => {
        try {
          await client.initialize();
        } catch (err) {
          console.error("Restart failed:", err);
        }
      }, 10000);
    });

    client.on("auth_failure", (msg) => {
      console.error("❌ Auth failure:", msg);
    });

    await client.initialize();
    console.log("🚀 WhatsApp client initialized!");
  } catch (err) {
    console.error("❌ Failed to start bot:", err);
    process.exit(1);
  }
}

// ================= API =================

app.post("/send", async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: "WhatsApp not connected yet" });
  }

  const { name, phone, email, condition, date, time, lang, message } = req.body;

  if (!name || !phone || !condition) {
    return res
      .status(400)
      .json({ error: "Missing required fields: name, phone, condition" });
  }

  const langLabel =
    lang === "en" ? "English" : lang === "hi" ? "Hindi" : "Marathi";

  // ========== DOCTOR MESSAGE ==========
  const doctorMsg = `🌿 *New Consultation Request*
━━━━━━━━━━━━━━━━━━━━
👤 *Patient Details*
• Name      : ${name}
• Phone     : ${phone}
• Email     : ${email || "Not provided"}

🩺 *Medical Info*
• Condition : ${condition}
• Date      : ${date || "Not specified"}
• Time      : ${time || "Not specified"}
• Language  : ${langLabel}
• Message   : ${message || "None"}
━━━━━━━━━━━━━━━━━━━━
_Sent via Dr. Pratima Agale Website_`;

  // ========== PATIENT MESSAGE ==========
  const patientMsg = `🌿 *Consultation Request Received!*
━━━━━━━━━━━━━━━━━━━━
Hello *${name}*! 👋

Your consultation request has been successfully received.

🩺 *Your Booking Details*
• Condition : ${condition}
• Date      : ${date || "Not specified"}
• Time      : ${time || "Not specified"}
• Language  : ${langLabel}

✅ Dr. Pratima Agale will contact you shortly on this number.

Thank you for choosing us! 🙏
━━━━━━━━━━━━━━━━━━━━
_Dr. Pratima Agale Clinic_`;

  try {
    // Doctor's WhatsApp number
    const doctorNumber = "918446104790@c.us";

    // Clean patient phone — remove +, spaces, dashes
    const cleanPhone = phone.replace(/[\s\+\-]/g, "");

    // Build patient number with India code 91
    const patientNumber = cleanPhone.startsWith("0")
      ? `91${cleanPhone.slice(1)}@c.us`
      : cleanPhone.startsWith("91")
      ? `${cleanPhone}@c.us`
      : `91${cleanPhone}@c.us`;

    console.log(`📤 Sending to doctor: ${doctorNumber}`);
    await client.sendMessage(doctorNumber, doctorMsg);
    console.log("✅ Doctor message sent!");

    console.log(`📤 Sending to patient: ${patientNumber}`);
    await client.sendMessage(patientNumber, patientMsg);
    console.log("✅ Patient message sent!");

    res.json({ success: true, message: "Messages sent to doctor and patient" });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.json({
    status: "WhatsApp bot running",
    ready: isReady,
    qrAvailable: !!latestQR,
  });
});

app.get("/qr", async (req, res) => {
  try {
    if (isReady) {
      return res.send(`
        <html>
          <body style="text-align:center; font-family:sans-serif; padding:40px; background:#f0f9f0;">
            <h2>✅ WhatsApp Already Connected!</h2>
            <p>Bot is live and ready to send messages.</p>
            <p style="color:green; font-size:20px;">🟢 Online</p>
          </body>
        </html>
      `);
    }

    if (!latestQR) {
      return res.send(`
        <html>
          <head><meta http-equiv="refresh" content="5"></head>
          <body style="text-align:center; font-family:sans-serif; padding:40px;">
            <h2>⏳ Waiting for QR code...</h2>
            <p>Auto-refreshing every 5 seconds. Please wait.</p>
          </body>
        </html>
      `);
    }

    const qrImage = await QRCode.toDataURL(latestQR);

    res.send(`
      <html>
        <head>
          <title>WhatsApp QR - Dr. Pratima Agale</title>
          <meta http-equiv="refresh" content="20">
        </head>
        <body style="text-align:center; font-family:sans-serif; padding:40px; background:#f0f9f0;">
          <h2>📱 Scan with WhatsApp</h2>
          <p>Open WhatsApp → Linked Devices → Link a Device</p>
          <img src="${qrImage}" width="300" style="border:4px solid #25D366; border-radius:12px; margin:20px auto; display:block;"/>
          <p style="color:gray;">Auto-refreshes every 20 seconds. Scan quickly!</p>
          <p style="color:#25D366; font-weight:bold;">Dr. Pratima Agale WhatsApp Bot</p>
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
  startBot();
});