const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const Booking = require("../models/Booking");
const Partner = require("../models/Partner");
const Lead = require("../models/Lead");
const BroadcastCampaign = require("../models/BroadcastCampaign");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Ensure upload directory exists for communication assets
const uploadDir = path.join(__dirname, "../uploads/communication");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `festive-${uniqueSuffix}${ext}`);
  },
});

const uploadBanner = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WebP, GIF) are allowed"), false);
    }
  },
});

// Create reusable transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ─── FESTIVE TEMPLATES DEFINITION ───
const FESTIVE_TEMPLATES = [
  {
    id: "diwali",
    festivalType: "diwali",
    name: "Happy Diwali & Deepavali 🪔",
    themeColor: "#FF9900",
    gradient: "linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #7f1d1d 100%)",
    headerIcon: "🪔",
    subject: "✨ Happy Diwali from Engineers Parcel! Wishing You Peace & Prosperity 🪔",
    whatsappText: `*✨ Shubh Deepavali from Engineers Parcel! 🪔*

Dear *{{name}}*,

On this joyous and auspicious festival of lights, may your home and heart be illuminated with good health, happiness, peace, and abundance! ✨

Thank you for being a cherished part of the Engineers Parcel family. We are deeply grateful for your continued trust in our delivery and shifting services.

🎁 *Special Festive Treat for You:*
Enjoy special festive rates and seamless door-to-door courier on all campus & domestic parcels!

Need to send sweets, gifts, or shift your luggage this holiday?
📞 Call / WhatsApp us: 9708815717 / 9525801506
🌐 Visit: https://www.engineersparcel.in

*Wishing you and your family a safe, spark-filled, and prosperous Diwali!*

Warm regards,
*Team Engineers Parcel*
IIT (ISM) Dhanbad`,
    defaultBody: `May the divine lights of Diwali illuminate your life with boundless joy, prosperity, good health, and success.

As you celebrate with your family and loved ones, we at Engineers Parcel take this moment to thank you for your ongoing trust and partnership. It is always a pleasure serving your shipping, parcel, and luggage shifting needs.

May this festival of lights banish all shadows and bring endless opportunities and warmth to your home!`,
  },
  {
    id: "chhath_puja",
    festivalType: "chhath_puja",
    name: "Chhath Puja Shubhkamnaye ☀️",
    themeColor: "#EA580C",
    gradient: "linear-gradient(135deg, #451a03 0%, #7c2d12 50%, #ea580c 100%)",
    headerIcon: "☀️",
    subject: "☀️ Chhath Puja ki Hardik Shubhkamnaye | Engineers Parcel 🌅",
    whatsappText: `*🌅 Chhath Puja ki Hardik Shubhkamnaye! ☀️*

Dear *{{name}}*,

आस्था, शुचिता और सूर्योपासना के महापर्व छठ पूजा की आपको और आपके पूरे परिवार को इंजीनियर्स पार्सल परिवार की ओर से हार्दिक शुभकामनाएं! 

भगवान भास्कर और छठी मइया आप सभी पर अपनी असीम कृपा बरसाएं, और आपके जीवन में सुख, शांति, समृद्धि और उत्तम स्वास्थ्य का प्रकाश फैलाएं। 

Thank you for being our valued customer. We look forward to always serving you with dedication and care!

Warm wishes,
*Team Engineers Parcel*
📞 9708815717 / 9525801506
🌐 https://www.engineersparcel.in`,
    defaultBody: `आस्था, शुचिता, समर्पण और सूर्य उपासना के पावन महापर्व 'छठ पूजा' की आप सभी को Engineers Parcel परिवार की ओर से हार्दिक शुभकामनाएं।

भगवान भास्कर और छठी मइया की असीम अनुकंपा से आपके जीवन में सदैव खुशहाली, उत्तम स्वास्थ्य, यश और समृद्धि का वास हो।

Thank you for trusting Engineers Parcel. We are privileged to serve you!`,
  },
  {
    id: "new_year",
    festivalType: "new_year",
    name: "Happy New Year 🎉",
    themeColor: "#2563EB",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)",
    headerIcon: "🎉",
    subject: "🎉 Happy New Year! Wishing You 365 Days of Success & Joy | Engineers Parcel",
    whatsappText: `*🎉 Happy New Year from Engineers Parcel! 🚀*

Dear *{{name}}*,

As we step into a brand-new year, we wish you 365 days filled with great health, boundless happiness, milestone achievements, and new adventures! 

Thank you for trusting Engineers Parcel for your parcels, consignments, and luggage shifting. We are excited to keep delivering excellence to your doorstep throughout the year ahead.

✨ *New Year Courier Promise:*
Fast, reliable, and student-friendly logistics across all India pincodes!

📞 Booking & Tracking: 9708815717 / 9525801506
🌐 https://www.engineersparcel.in

*Cheers to an incredible year ahead!*
*Team Engineers Parcel*`,
    defaultBody: `As the new year dawns with fresh hope and endless possibilities, we want to wish you and your loved ones a phenomenal year ahead filled with happiness, sound health, and towering milestones!

Thank you for choosing Engineers Parcel as your trusted logistics partner. We remain dedicated to making every pickup, delivery, and luggage shifting journey as seamless and dependable as possible.

Here's to a prosperous and exciting journey together!`,
  },
  {
    id: "holi",
    festivalType: "holi",
    name: "Happy Holi & Rangotsav 🎨",
    themeColor: "#D946EF",
    gradient: "linear-gradient(135deg, #701a75 0%, #831843 50%, #be185d 100%)",
    headerIcon: "🎨",
    subject: "🎨 Wishing You a Colorful & Joyous Holi! | Engineers Parcel",
    whatsappText: `*🎨 Rangon ke Tyohar Holi ki Shubhkamnaye! 🌈*

Dear *{{name}}*,

May your life be painted with the vibrant hues of joy, laughter, good health, and sweet moments! Wishing you and your family a safe, colorful, and fun-filled Holi! 

Thank you for being with Engineers Parcel. Celebrate with your loved ones while we take care of your shipments across India!

Warm wishes,
*Team Engineers Parcel*
📞 9708815717 | 🌐 https://www.engineersparcel.in`,
    defaultBody: `May the festival of colors paint your life with the brightest shades of happiness, peace, success, and good health!

May your days be as sweet as gujiyas and as lively as spring flowers. We thank you for choosing Engineers Parcel and look forward to delivering your smiles all year round.

Have a safe, vibrant, and joyful Holi!`,
  },
  {
    id: "eid",
    festivalType: "eid",
    name: "Eid Mubarak 🌙",
    themeColor: "#059669",
    gradient: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
    headerIcon: "🌙",
    subject: "🌙 Eid Mubarak! Wishing You Peace, Joy & Abundance | Engineers Parcel",
    whatsappText: `*🌙 Eid Mubarak to you and your loved ones! ✨*

Dear *{{name}}*,

On this blessed and joyous occasion, may Allah shower your life with peace, happiness, success, and prosperity. 

Thank you for your warm trust and partnership with Engineers Parcel. It is our absolute honor to serve you.

*Eid Mubarak!*
*Team Engineers Parcel*
📞 9708815717 | 🌐 https://www.engineersparcel.in`,
    defaultBody: `On this auspicious and blessed occasion of Eid, may your heart be filled with serenity, your home with laughter, and your life with endless blessings.

Thank you for being a valued part of the Engineers Parcel family. May the joy of this holy day stay with you and your family throughout the year.

Eid Mubarak!`,
  },
  {
    id: "christmas",
    festivalType: "christmas",
    name: "Merry Christmas & Holiday Cheer 🎄",
    themeColor: "#DC2626",
    gradient: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #14532d 100%)",
    headerIcon: "🎄",
    subject: "🎄 Merry Christmas & Season's Greetings from Engineers Parcel! 🎁",
    whatsappText: `*🎄 Merry Christmas & Season's Greetings! 🎁*

Dear *{{name}}*,

Wishing you and your loved ones a magical Christmas season filled with warmth, love, peace, and happiness! May the festive cheer accompany you into a bright and prosperous new year.

Thank you for shipping with Engineers Parcel. We look forward to continuing our journey together!

Warm holiday wishes,
*Team Engineers Parcel*
📞 9708815717 | 🌐 https://www.engineersparcel.in`,
    defaultBody: `Warmest thoughts and best wishes for a wonderful holiday season! May the magic of Christmas bring peace, joy, and laughter to your home and loved ones.

As the year wraps up, we express our heartfelt appreciation for your trust in Engineers Parcel. May your holiday season be merry, bright, and restful!`,
  },
  {
    id: "offer",
    festivalType: "offer",
    name: "Festive Special Offer & Coupon 🎁",
    themeColor: "#7C3AED",
    gradient: "linear-gradient(135deg, #3b0764 0%, #581c87 50%, #6d28d9 100%)",
    headerIcon: "🎁",
    subject: "🎁 Special Festive Courier Offer: Flat Discounts on Your Shipments!",
    whatsappText: `*🎁 Special Festive Offer from Engineers Parcel! 🚚*

Dear *{{name}}*,

Celebrate this festive season with exclusive savings on all parcel and luggage deliveries!

🎟️ *Use Promo Code:* *FESTIVE10*
✨ Flat *10% OFF* on domestic parcel deliveries & luggage shifting
📦 Doorstep pickup & secure pan-India delivery
🚀 Fast, trackable, and safe

Book your shipment now or reach out to our team:
📞 Call / WhatsApp: 9708815717 / 9525801506
🌐 Instant Booking: https://www.engineersparcel.in

Offer valid for a limited period. Terms & Conditions apply.

Warm regards,
*Team Engineers Parcel*`,
    defaultBody: `This festive season, celebrate the joy of gifting, family visits, and college breaks with special discounts on all your courier and luggage shifting shipments!

Use coupon code **FESTIVE10** at checkout or mention it to our representative to get special discounted rates on doorstep pickup and delivery across India.

We are here to ensure your parcels arrive safely and on time!`,
  },
];

// ─── EMAIL HTML BUILDER ───
const buildFestiveHtml = ({
  festivalName,
  recipientName = "Valued Customer",
  bodyText,
  subject,
  themeColor = "#FF9900",
  gradient = "linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #7f1d1d 100%)",
  headerIcon = "✨",
  couponCode = "",
  bannerUrl = "",
  bannerCid = "",
}) => {
  const formattedBody = (bodyText || "")
    .split("\n\n")
    .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.7; font-size: 15px; color: #334155;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const imageSrc = bannerCid ? `cid:${bannerCid}` : bannerUrl;
  const imageSection = imageSrc
    ? `
    <div style="text-align: center; margin: 0 0 24px 0;">
      <img src="${imageSrc}" alt="Festive Greeting" style="max-width: 100%; height: auto; border-radius: 14px; display: block; margin: 0 auto; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;" />
    </div>
  `
    : "";

  const couponSection = couponCode
    ? `
    <div style="background: #F8FAFC; border: 2px dashed ${themeColor}; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;">
      <span style="font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1.5px; color: #64748B;">Exclusive Festive Gift</span>
      <div style="margin: 10px 0;">
        <span style="display: inline-block; font-family: monospace; font-size: 22px; font-weight: 900; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; padding: 8px 24px; border-radius: 8px; letter-spacing: 2px;">${couponCode}</span>
      </div>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B;">Use this code on your next shipment for special festive discounts!</p>
    </div>
  `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 620px; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;" cellspacing="0" cellpadding="0">
          
          <!-- Official Company Logo Top Header -->
          <tr>
            <td align="center" style="background-color: #FFFFFF; padding: 26px 20px 20px 20px; border-bottom: 1px solid #F1F5F9; text-align: center;">
              <img src="cid:companyLogo" alt="Engineers Parcel" style="height: 50px; max-height: 50px; width: auto; max-width: 280px; display: block; margin: 0 auto; object-fit: contain;" />
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 17px; font-weight: 700; color: #0F172A;">
                Dear ${recipientName},
              </p>

              ${imageSection}
              
              <div style="font-size: 15px; color: #334155;">
                ${formattedBody}
              </div>

              ${couponSection}

              <!-- Action Call to Action Button -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="https://www.engineersparcel.in" target="_blank" style="display: inline-block; background: #0D233A; color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(13,35,58,0.2); letter-spacing: 0.5px;">
                  Apply 🎁 FESTIVE10 at final checkout to Get Exclusive Discount
                </a>
              </div>

              <!-- Sign-off Block -->
              <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 24px;">
                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0F172A;">
                  Warm regards,
                </p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">
                  <strong>Team Engineers Parcel</strong><br/>
                  <span style="font-size: 12px; color: #64748B;">IIT (ISM) Dhanbad - 826004, Jharkhand</span>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background-color: #0F172A; padding: 24px 30px; text-align: center; color: #94A3B8; font-size: 12px; border-top: 1px solid #1E293B;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #E2E8F0;">
                📞 Need Assistance? Contact Support:
              </p>
              <p style="margin: 0 0 12px 0; color: #CBD5E1;">
                Phone / WhatsApp: <a href="tel:+919708815717" style="color: #38BDF8; text-decoration: none; font-weight: 600;">+91 9708815717</a> / <a href="tel:+919525801506" style="color: #38BDF8; text-decoration: none; font-weight: 600;">+91 9525801506</a><br/>
                Email: <a href="mailto:info.engineersparcel@gmail.com" style="color: #38BDF8; text-decoration: none;">info.engineersparcel@gmail.com</a> | Website: <a href="https://www.engineersparcel.in" style="color: #38BDF8; text-decoration: none;">www.engineersparcel.in</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                © ${new Date().getFullYear()} SRQ Engineers Parcel and Haul Pvt. Ltd. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// ─── ROUTE 0: POST /api/communication/upload-banner ───
router.post("/upload-banner", authMiddleware, uploadBanner.single("banner"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }
    const relativeUrl = `/uploads/communication/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get("host")}${relativeUrl}`;
    res.json({
      success: true,
      imageUrl: relativeUrl,
      fullUrl: fullUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (err) {
    console.error("Banner upload error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ROUTE 1: GET /api/communication/templates ───
router.get("/templates", authMiddleware, async (req, res) => {
  try {
    res.json({ success: true, templates: FESTIVE_TEMPLATES });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ROUTE 2: GET /api/communication/contacts ───
// Aggregates unique customers from Booking (senders & receivers), Partners, and Leads
router.get("/contacts", authMiddleware, async (req, res) => {
  try {
    const { audience = "all", search = "", limit = 500 } = req.query;

    const contactMap = new Map(); // Key: normalized phone, Value: contact object

    const normalizePhone = (phone) => {
      if (!phone) return "";
      const cleaned = String(phone).replace(/\D/g, "");
      if (cleaned.length === 10) return cleaned;
      if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned.slice(2);
      return cleaned;
    };

    // 1. Booking Senders & Receivers
    if (audience === "all" || audience === "senders" || audience === "receivers") {
      const bookings = await Booking.find(
        {},
        "senderDetails receiverDetails createdAt bookingId serviceType"
      )
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean();

      bookings.forEach((b) => {
        // Senders
        if ((audience === "all" || audience === "senders") && b.senderDetails) {
          const s = b.senderDetails;
          const phone = normalizePhone(s.phone);
          if (phone && phone.length === 10) {
            if (!contactMap.has(phone)) {
              contactMap.set(phone, {
                id: `sender_${phone}`,
                name: (s.name || "Customer").trim(),
                phone: phone,
                email: (s.email || "").trim().toLowerCase(),
                city: s.city || "",
                pincode: s.pincode || "",
                source: "Booking (Sender)",
                bookingsCount: 1,
                lastActive: b.createdAt,
              });
            } else {
              const existing = contactMap.get(phone);
              existing.bookingsCount++;
              if (!existing.email && s.email) existing.email = s.email.trim().toLowerCase();
              if (!existing.city && s.city) existing.city = s.city;
            }
          }
        }

        // Receivers
        if ((audience === "all" || audience === "receivers") && b.receiverDetails) {
          const r = b.receiverDetails;
          const phone = normalizePhone(r.phone);
          if (phone && phone.length === 10) {
            if (!contactMap.has(phone)) {
              contactMap.set(phone, {
                id: `receiver_${phone}`,
                name: (r.name || "Customer").trim(),
                phone: phone,
                email: (r.email || "").trim().toLowerCase(),
                city: r.city || "",
                pincode: r.pincode || "",
                source: "Booking (Receiver)",
                bookingsCount: 1,
                lastActive: b.createdAt,
              });
            } else {
              const existing = contactMap.get(phone);
              if (!existing.email && r.email) existing.email = r.email.trim().toLowerCase();
            }
          }
        }
      });
    }

    // 2. Corporate Partners
    if (audience === "all" || audience === "partners") {
      const partners = await Partner.find({}, "name email phone partnerId createdAt").lean();
      partners.forEach((p) => {
        const phone = normalizePhone(p.phone);
        if (phone) {
          contactMap.set(phone, {
            id: `partner_${p._id}`,
            name: (p.name || "Corporate Partner").trim(),
            phone: phone,
            email: (p.email || "").trim().toLowerCase(),
            city: "Corporate",
            source: "Corporate Partner",
            bookingsCount: 0,
            lastActive: p.createdAt,
          });
        }
      });
    }

    // 3. Leads
    if (audience === "all" || audience === "leads") {
      const leads = await Lead.find({}, "name phone email source createdAt").lean();
      leads.forEach((l) => {
        const phone = normalizePhone(l.phone);
        if (phone && !contactMap.has(phone)) {
          contactMap.set(phone, {
            id: `lead_${l._id}`,
            name: (l.name || "Lead").trim(),
            phone: phone,
            email: (l.email || "").trim().toLowerCase(),
            city: "",
            source: `Lead (${l.source || "Web"})`,
            bookingsCount: 0,
            lastActive: l.createdAt,
          });
        }
      });
    }

    let allContacts = Array.from(contactMap.values());

    // Search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allContacts = allContacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q)
      );
    }

    // Sort by recent activity or booking count
    allContacts.sort((a, b) => b.bookingsCount - a.bookingsCount);

    const stats = {
      total: allContacts.length,
      withEmail: allContacts.filter((c) => c.email && c.email.includes("@")).length,
      withPhone: allContacts.filter((c) => c.phone).length,
    };

    res.json({
      success: true,
      stats,
      contacts: allContacts.slice(0, parseInt(limit, 10) || 500),
    });
  } catch (err) {
    console.error("Error in GET /contacts:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ROUTE 3: POST /api/communication/send-test-email ───
router.post("/send-test-email", authMiddleware, async (req, res) => {
  try {
    const { testEmail, subject, bodyText, festivalType, couponCode, imageUrl } = req.body;

    if (!testEmail || !testEmail.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid test email address required" });
    }

    const tpl = FESTIVE_TEMPLATES.find((t) => t.festivalType === festivalType) || FESTIVE_TEMPLATES[0];

    let attachments = [];
    // Attach Official Company Logo
    const logoPath = path.join(__dirname, "..", "public", "company-logo.jpg");
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: "company-logo.jpg",
        path: logoPath,
        cid: "companyLogo",
      });
    }
    let bannerCid = "";
    if (imageUrl) {
      let localPath = "";
      if (imageUrl.startsWith("/uploads/")) {
        localPath = path.join(__dirname, "..", imageUrl);
      } else if (imageUrl.includes("/uploads/")) {
        const rel = imageUrl.substring(imageUrl.indexOf("/uploads/"));
        localPath = path.join(__dirname, "..", rel);
      }

      if (localPath && fs.existsSync(localPath)) {
        bannerCid = "festiveBannerImage";
        attachments.push({
          filename: path.basename(localPath),
          path: localPath,
          cid: bannerCid,
        });
      }
    }

    const html = buildFestiveHtml({
      festivalName: tpl.name,
      recipientName: "Test Recipient",
      bodyText: bodyText || tpl.defaultBody,
      subject: subject || tpl.subject,
      themeColor: tpl.themeColor,
      gradient: tpl.gradient,
      headerIcon: tpl.headerIcon,
      couponCode: couponCode || "",
      bannerUrl: imageUrl || "",
      bannerCid: bannerCid || "",
    });

    const transporter = getTransporter();

    const mailOptions = {
      from: `"Engineers Parcel" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: `[TEST PREVIEW] ${subject || tpl.subject}`,
      html,
      attachments: attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Test email sent successfully:", info.messageId);

    res.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}!`,
      messageId: info.messageId,
    });
  } catch (err) {
    console.error("Error sending test email:", err);
    res.status(500).json({ success: false, message: `Failed to send test email: ${err.message}` });
  }
});

// ─── ROUTE 4: POST /api/communication/send-bulk-email ───
router.post("/send-bulk-email", authMiddleware, async (req, res) => {
  try {
    const {
      recipients, // Array of { name, email, phone }
      subject,
      bodyText,
      campaignTitle,
      festivalType,
      couponCode,
      imageUrl,
    } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: "No recipients provided" });
    }

    const validRecipients = recipients.filter((r) => r.email && r.email.includes("@"));

    if (validRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "None of the selected recipients have a valid email address.",
      });
    }

    const tpl = FESTIVE_TEMPLATES.find((t) => t.festivalType === festivalType) || FESTIVE_TEMPLATES[0];
    const finalSubject = subject || tpl.subject;
    const finalBody = bodyText || tpl.defaultBody;

    let attachments = [];
    // Attach Official Company Logo
    const logoPath = path.join(__dirname, "..", "public", "company-logo.jpg");
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: "company-logo.jpg",
        path: logoPath,
        cid: "companyLogo",
      });
    }
    let bannerCid = "";
    if (imageUrl) {
      let localPath = "";
      if (imageUrl.startsWith("/uploads/")) {
        localPath = path.join(__dirname, "..", imageUrl);
      } else if (imageUrl.includes("/uploads/")) {
        const rel = imageUrl.substring(imageUrl.indexOf("/uploads/"));
        localPath = path.join(__dirname, "..", rel);
      }

      if (localPath && fs.existsSync(localPath)) {
        bannerCid = "festiveBannerImage";
        attachments.push({
          filename: path.basename(localPath),
          path: localPath,
          cid: bannerCid,
        });
      }
    }

    // Create Campaign Record
    const campaign = await BroadcastCampaign.create({
      title: campaignTitle || `${tpl.name} Broadcast`,
      festivalType: festivalType || "diwali",
      channel: "email",
      subject: finalSubject,
      messageText: finalBody,
      couponCode: couponCode || "",
      bannerUrl: imageUrl || "",
      totalRecipients: validRecipients.length,
      status: "in_progress",
      createdByName: req.admin?.username || req.user?.name || "Admin",
      createdBy: req.user?._id || req.admin?._id,
    });

    const transporter = getTransporter();

    let sentCount = 0;
    let failedCount = 0;
    const logs = [];

    // Send emails in batches of 5 with small delays to ensure smooth delivery
    for (const recipient of validRecipients) {
      try {
        const personalizedHtml = buildFestiveHtml({
          festivalName: tpl.name,
          recipientName: recipient.name || "Valued Customer",
          bodyText: finalBody.replace(/\{\{name\}\}/g, recipient.name || "Valued Customer"),
          subject: finalSubject,
          themeColor: tpl.themeColor,
          gradient: tpl.gradient,
          headerIcon: tpl.headerIcon,
          couponCode: couponCode || "",
          bannerUrl: imageUrl || "",
          bannerCid: bannerCid || "",
        });

        await transporter.sendMail({
          from: `"Engineers Parcel" <${process.env.EMAIL_USER}>`,
          to: recipient.email,
          subject: finalSubject,
          html: personalizedHtml,
          attachments: attachments,
        });

        sentCount++;
        logs.push({
          name: recipient.name,
          email: recipient.email,
          phone: recipient.phone,
          channel: "email",
          status: "sent",
        });
      } catch (sendErr) {
        failedCount++;
        logs.push({
          name: recipient.name,
          email: recipient.email,
          phone: recipient.phone,
          channel: "email",
          status: "failed",
          error: sendErr.message,
        });
      }

      // Small throttle pause every 5 emails
      if ((sentCount + failedCount) % 5 === 0) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    campaign.emailsSent = sentCount;
    campaign.emailsFailed = failedCount;
    campaign.status = sentCount > 0 ? "completed" : "failed";
    campaign.logs = logs;
    await campaign.save();

    res.json({
      success: true,
      message: `Broadcast finished: ${sentCount} sent, ${failedCount} failed.`,
      sentCount,
      failedCount,
      campaignId: campaign._id,
    });
  } catch (err) {
    console.error("Error in /send-bulk-email:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ROUTE 5: POST /api/communication/log-whatsapp-send ───
router.post("/log-whatsapp-send", authMiddleware, async (req, res) => {
  try {
    const { campaignId, recipient, messageText, festivalType } = req.body;

    let campaign;
    if (campaignId) {
      campaign = await BroadcastCampaign.findById(campaignId);
    }

    if (!campaign) {
      campaign = await BroadcastCampaign.create({
        title: `WhatsApp Broadcast - ${new Date().toLocaleDateString()}`,
        festivalType: festivalType || "custom",
        channel: "whatsapp",
        messageText: messageText || "WhatsApp Greeting",
        totalRecipients: 1,
        whatsappSent: 1,
        status: "in_progress",
        createdByName: req.admin?.username || req.user?.name || "Admin",
      });
    } else {
      campaign.whatsappSent = (campaign.whatsappSent || 0) + 1;
    }

    if (recipient) {
      campaign.logs.push({
        name: recipient.name,
        phone: recipient.phone,
        email: recipient.email || "",
        channel: "whatsapp",
        status: "sent",
        sentAt: new Date(),
      });
    }

    await campaign.save();
    res.json({ success: true, campaignId: campaign._id, whatsappSent: campaign.whatsappSent });
  } catch (err) {
    console.error("Error logging WhatsApp send:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ROUTE 6: GET /api/communication/campaigns ───
router.get("/campaigns", authMiddleware, async (req, res) => {
  try {
    const campaigns = await BroadcastCampaign.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .select("-logs");

    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

