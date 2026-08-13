// Apex Void Bot - Node.js Runtime (Gmail SMTP)
// Send Mail + Appeal + Premium + Admin

const nodemailer = require("nodemailer");

const TOKEN = "8691945494:AAEAyCzR0YR9z1OvgKdz6nv_OXtwgeRdy6A";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const ADMIN_ID = 7926253634;
const CREATOR_USERNAME = "Fredd091";

// Gmail accounts for sending (Admin only – never shown to users)
const SENDER_ACCOUNTS = [
  {
    email: "banappealling101@gmail.com",
    pass: "iotu nwim okyv vpzo",
  },
  {
    email: "jamesakpos79@gmail.com",
    pass: "gvrp egbz slhj mopp",
  },
];

// ====================== IN-MEMORY STORAGE ======================
const users = new Map();
const premiumUsers = new Map();
const userStates = new Map();

// Admin-managed lists & templates
let clientEmails = [];
let appealEmails = [];
let customMessage = "";
let appealMessage = "";

// Simple logs
const logs = {
  successfulMails: [],
  failedMails: [],
  successfulAppeals: [],
  failedAppeals: [],
};

// ====================== UNICODE FONT ======================
function toSMC(text) {
  if (!text) return "";
  const map = {
    A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜",
    J: "𝗝", K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥",
    S: "𝗦", T: "𝗧", U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭",
    a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶",
    j: "𝗷", k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿",
    s: "𝘀", t: "𝘁", u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇",
    "0": "𝟬", "1": "𝟭", "2": "𝟮", "3": "𝟯", "4": "𝟰",
    "5": "𝟱", "6": "𝟲", "7": "𝟳", "8": "𝟴", "9": "𝟵",
  };
  return text.split("").map((c) => map[c] || c).join("");
}

// ====================== TELEGRAM HELPERS ======================
async function tg(method, body) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMessage(chatId, text, replyMarkup = null) {
  const body = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return tg("sendMessage", body);
}

async function answerCallback(id, text = "") {
  return tg("answerCallbackQuery", { callback_query_id: id, text });
}

// ====================== EMAIL SENDING ======================
function createTransporter(account) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: account.email,
      pass: account.pass.replace(/\s+/g, ""), // remove spaces from app password
    },
  });
}

async function sendBulkEmail(toList, subject, htmlBody) {
  if (!toList || toList.length === 0) {
    return { success: false, error: "No recipient emails configured" };
  }

  let lastError = null;

  // Try each sender account until one works
  for (const account of SENDER_ACCOUNTS) {
    try {
      const transporter = createTransporter(account);
      await transporter.sendMail({
        from: `\"Apex Void\" <${account.email}>`,
        to: toList.join(", "),
        subject: subject,
        html: htmlBody.replace(/\n/g, "<br>"),
      });
      return { success: true, used: account.email };
    } catch (err) {
      lastError = err.message || String(err);
      console.error(`Send failed with ${account.email}:`, lastError);
    }
  }

  return { success: false, error: lastError || "All sender accounts failed" };
}

// ====================== ROLE HELPERS ======================
function registerUser(from) {
  if (!from?.id) return;
  if (!users.has(from.id)) {
    users.set(from.id, {
      id: from.id,
      username: from.username || null,
      first_name: from.first_name || "User",
      joined_at: Date.now(),
    });
  }
}

function isAdmin(id) {
  return Number(id) === ADMIN_ID;
}

function isPremium(id) {
  const p = premiumUsers.get(Number(id));
  if (!p) return false;
  if (Date.now() > p.expiry) {
    premiumUsers.delete(Number(id));
    return false;
  }
  return true;
}

function getRole(id) {
  if (isAdmin(id)) return "admin";
  if (isPremium(id)) return "premium";
  return "regular";
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysLeft(expiry) {
  return Math.max(0, Math.ceil((expiry - Date.now()) / 86400000));
}

// ====================== KEYBOARDS ======================
function mainMenu(userId) {
  const role = getRole(userId);
  const rows = [
    [
      { text: "🟢 Start", callback_data: "cmd_start", style: "success" },
      { text: "🔵 Menu", callback_data: "cmd_menu", style: "primary" },
    ],
    [
      { text: "🔴 Send Mail", callback_data: "cmd_sendmail", style: "danger" },
      { text: "🔵 Appeal", callback_data: "cmd_appeal", style: "primary" },
    ],
    [{ text: "🟢 Prem", callback_data: "cmd_prem", style: "success" }],
  ];

  if (role === "admin") {
    rows.push([{ text: "📊 Bot Logs", callback_data: "admin_logs", style: "primary" }]);
  }

  return { inline_keyboard: rows };
}

function sendMailMenu(isAdminUser) {
  const rows = [
    [{ text: "🔴 Mass Mail", callback_data: "mail_mass", style: "danger" }],
  ];

  if (isAdminUser) {
    rows.push(
      [{ text: "📋 Client Emails", callback_data: "mail_emails", style: "primary" }],
      [{ text: "✏️ Custom Message", callback_data: "mail_message", style: "primary" }]
    );
  }

  rows.push([{ text: "🔙 Back to Menu", callback_data: "cmd_menu", style: "primary" }]);
  return { inline_keyboard: rows };
}

function appealMenu(isAdminUser) {
  const rows = [
    [{ text: "🔴 Mass Appeal", callback_data: "appeal_mass", style: "danger" }],
  ];

  if (isAdminUser) {
    rows.push(
      [{ text: "📋 Appeal Emails", callback_data: "appeal_emails", style: "primary" }],
      [{ text: "✏️ Appeal Message", callback_data: "appeal_message", style: "primary" }]
    );
  }

  rows.push([{ text: "🔙 Back to Menu", callback_data: "cmd_menu", style: "primary" }]);
  return { inline_keyboard: rows };
}

function premiumMenu() {
  return {
    inline_keyboard: [
      [{ text: "🟢 Give Premium", callback_data: "prem_give", style: "success" }],
      [{ text: "🔴 Revoke Premium", callback_data: "prem_revoke", style: "danger" }],
      [{ text: "🔵 List Premium", callback_data: "prem_list", style: "primary" }],
      [{ text: "🔵 Total Users", callback_data: "prem_total", style: "primary" }],
      [{ text: "🔙 Back", callback_data: "cmd_menu", style: "primary" }],
    ],
  };
}

function backMenu() {
  return {
    inline_keyboard: [[{ text: "🔙 Back to Menu", callback_data: "cmd_menu", style: "primary" }]],
  };
}

function contactCreator() {
  return {
    inline_keyboard: [
      [{ text: "📩 Contact Creator", url: `https://t.me/${CREATOR_USERNAME}`, style: "primary" }],
      [{ text: "🔙 Back", callback_data: "cmd_menu", style: "primary" }],
    ],
  };
}

// ====================== TEXT HELPERS ======================
function welcomeText(name) {
  return `*${toSMC("APEX VOID BOT")}* ⚡\n\nWelcome, *${name || "User"}*\n\nYou have entered the void.\nUse the buttons below.`;
}

function menuText(userId) {
  const role = getRole(userId);
  let r = "Regular User";
  if (role === "admin") r = "👑 Admin";
  if (role === "premium") r = "⭐ Premium";
  return `*${toSMC("APEX VOID MENU")}* ⚡\n\nRole: *${r}*\n\nSelect an option:`;
}

function premiumRequired() {
  return `*${toSMC("PREMIUM FEATURE")}* ⭐\n\nThis feature requires Premium access.\n\nContact the creator:\n@${CREATOR_USERNAME}`;
}

// ====================== EMAIL MANAGEMENT HELPERS ======================
function listEmailsText(title, list) {
  if (list.length === 0) return `*${toSMC(title)}*\n\nNo emails saved yet.`;
  let t = `*${toSMC(title)}*\n\n`;
  list.forEach((e, i) => {
    t += `${i + 1}. \`${e}\`\n`;
  });
  return t;
}

// ====================== MAIN HANDLER ======================
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // ---------- MESSAGE ----------
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const from = msg.from;
      const userId = from.id;
      const text = (msg.text || "").trim();
      const firstName = from.first_name || "User";

      registerUser(from);
      const state = userStates.get(userId);

      // ---- Multi-step states ----
      if (state) {
        // Give Premium – waiting for ID
        if (state.action === "waiting_prem_id") {
          const targetId = parseInt(text);
          if (isNaN(targetId)) {
            await sendMessage(chatId, "❌ Invalid ID. Send a numeric Telegram User ID.", backMenu());
            return res.status(200).send("OK");
          }
          userStates.set(userId, { action: "waiting_prem_days", targetId });
          await sendMessage(
            chatId,
            `*${toSMC("GIVE PREMIUM")}*\n\nID: \`${targetId}\`\n\nSend duration in days (1-30). Default 7.`,
            backMenu()
          );
          return res.status(200).send("OK");
        }

        if (state.action === "waiting_prem_days") {
          let days = parseInt(text);
          if (isNaN(days) || days < 1 || days > 30) days = 7;
          const targetId = state.targetId;
          const expiry = Date.now() + days * 86400000;
          const u = users.get(targetId);
          premiumUsers.set(targetId, {
            id: targetId,
            username: u?.username || null,
            granted_at: Date.now(),
            duration_days: days,
            expiry,
          });
          userStates.delete(userId);
          await sendMessage(
            chatId,
            `✅ Premium granted to \`${targetId}\` for *${days} days*.\nExpires: ${formatDate(expiry)}`,
            premiumMenu()
          );
          try {
            await sendMessage(targetId, `⭐ You received Premium for *${days} days*!`);
          } catch (e) {}
          return res.status(200).send("OK");
        }

        // Add client emails
        if (state.action === "add_client_emails") {
          const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
          const valid = [];
          const invalid = [];
          for (const line of lines.slice(0, 10)) {
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line)) valid.push(line.toLowerCase());
            else invalid.push(line);
          }
          clientEmails = [...new Set([...clientEmails, ...valid])];
          userStates.delete(userId);
          let reply = `✅ Added *${valid.length}* email(s).`;
          if (invalid.length) reply += `\n❌ Invalid: ${invalid.join(", ")}`;
          await sendMessage(chatId, reply, sendMailMenu(true));
          return res.status(200).send("OK");
        }

        // Add appeal emails
        if (state.action === "add_appeal_emails") {
          const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
          const valid = [];
          const invalid = [];
          for (const line of lines.slice(0, 10)) {
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line)) valid.push(line.toLowerCase());
            else invalid.push(line);
          }
          appealEmails = [...new Set([...appealEmails, ...valid])];
          userStates.delete(userId);
          let reply = `✅ Added *${valid.length}* appeal email(s).`;
          if (invalid.length) reply += `\n❌ Invalid: ${invalid.join(", ")}`;
          await sendMessage(chatId, reply, appealMenu(true));
          return res.status(200).send("OK");
        }

        // Set custom message
        if (state.action === "set_custom_message") {
          if (text.length < 5) {
            await sendMessage(chatId, "❌ Message too short. Try again.", backMenu());
            return res.status(200).send("OK");
          }
          customMessage = text;
          userStates.delete(userId);
          await sendMessage(
            chatId,
            `✅ Custom message saved.\n\nPreview:\n${customMessage}`,
            sendMailMenu(true)
          );
          return res.status(200).send("OK");
        }

        // Set appeal message
        if (state.action === "set_appeal_message") {
          if (text.length < 5) {
            await sendMessage(chatId, "❌ Message too short. Try again.", backMenu());
            return res.status(200).send("OK");
          }
          appealMessage = text;
          userStates.delete(userId);
          await sendMessage(
            chatId,
            `✅ Appeal message saved.\n\nPreview:\n${appealMessage}`,
            appealMenu(true)
          );
          return res.status(200).send("OK");
        }

        // Delete client emails by numbers
        if (state.action === "delete_client_emails") {
          const nums = text.split(/[,\s]+/).map((n) => parseInt(n)).filter((n) => !isNaN(n));
          const toRemove = nums
            .filter((n) => n >= 1 && n <= clientEmails.length)
            .map((n) => clientEmails[n - 1]);
          clientEmails = clientEmails.filter((e) => !toRemove.includes(e));
          userStates.delete(userId);
          await sendMessage(chatId, `✅ Removed *${toRemove.length}* email(s).`, sendMailMenu(true));
          return res.status(200).send("OK");
        }

        // Delete appeal emails by numbers
        if (state.action === "delete_appeal_emails") {
          const nums = text.split(/[,\s]+/).map((n) => parseInt(n)).filter((n) => !isNaN(n));
          const toRemove = nums
            .filter((n) => n >= 1 && n <= appealEmails.length)
            .map((n) => appealEmails[n - 1]);
          appealEmails = appealEmails.filter((e) => !toRemove.includes(e));
          userStates.delete(userId);
          await sendMessage(chatId, `✅ Removed *${toRemove.length}* appeal email(s).`, appealMenu(true));
          return res.status(200).send("OK");
        }
      }

      // ---- Commands ----
      const cmd = text.split(" ")[0].toLowerCase().split("@")[0];

      if (cmd === "/start") {
        await sendMessage(chatId, welcomeText(firstName), mainMenu(userId));
        return res.status(200).send("OK");
      }

      if (cmd === "/menu") {
        await sendMessage(chatId, menuText(userId), mainMenu(userId));
        return res.status(200).send("OK");
      }

      // Admin shortcut commands
      if (isAdmin(userId)) {
        if (cmd === "/addprem") {
          const parts = text.split(/\s+/);
          const targetId = parseInt(parts[1]);
          let days = parseInt(parts[2]) || 7;
          if (days < 1 || days > 30) days = 7;
          if (isNaN(targetId)) {
            await sendMessage(chatId, "Usage: `/addprem user_id [days]`");
            return res.status(200).send("OK");
          }
          const expiry = Date.now() + days * 86400000;
          const u = users.get(targetId);
          premiumUsers.set(targetId, {
            id: targetId,
            username: u?.username || null,
            granted_at: Date.now(),
            duration_days: days,
            expiry,
          });
          await sendMessage(chatId, `✅ Premium given to \`${targetId}\` for *${days}* days.`);
          try {
            await sendMessage(targetId, `⭐ You received Premium for *${days} days*!`);
          } catch (e) {}
          return res.status(200).send("OK");
        }

        if (cmd === "/delprem") {
          const targetId = parseInt(text.split(/\s+/)[1]);
          if (isNaN(targetId)) {
            await sendMessage(chatId, "Usage: `/delprem user_id`");
            return res.status(200).send("OK");
          }
          if (premiumUsers.has(targetId)) {
            premiumUsers.delete(targetId);
            await sendMessage(chatId, `✅ Premium revoked from \`${targetId}\``);
            try {
              await sendMessage(targetId, "❌ Your Premium has been revoked.");
            } catch (e) {}
          } else {
            await sendMessage(chatId, "User is not premium.");
          }
          return res.status(200).send("OK");
        }

        if (cmd === "/listprem") {
          if (premiumUsers.size === 0) {
            await sendMessage(chatId, "No premium users.");
          } else {
            let t = `*${toSMC("PREMIUM USERS")}*\n\n`;
            let i = 1;
            for (const [id, p] of premiumUsers) {
              t += `${i}. @${p.username || "?"} (\`${id}\`) – ${daysLeft(p.expiry)} days left\n`;
              i++;
            }
            await sendMessage(chatId, t);
          }
          return res.status(200).send("OK");
        }

        if (cmd === "/totalusers") {
          await sendMessage(chatId, `Total users: *${users.size}*`);
          return res.status(200).send("OK");
        }
      }

      await sendMessage(chatId, "Use /start or /menu.", mainMenu(userId));
      return res.status(200).send("OK");
    }

    // ---------- CALLBACK ----------
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const userId = cb.from.id;
      const data = cb.data;
      const firstName = cb.from.first_name || "User";

      registerUser(cb.from);
      await answerCallback(cb.id);

      // Clear state on main navigation
      if (["cmd_start", "cmd_menu", "cmd_sendmail", "cmd_appeal", "cmd_prem"].includes(data)) {
        userStates.delete(userId);
      }

      if (data === "cmd_start") {
        await sendMessage(chatId, welcomeText(firstName), mainMenu(userId));
        return res.status(200).send("OK");
      }

      if (data === "cmd_menu") {
        await sendMessage(chatId, menuText(userId), mainMenu(userId));
        return res.status(200).send("OK");
      }

      // ---- SEND MAIL ----
      if (data === "cmd_sendmail") {
        const role = getRole(userId);
        if (role === "regular") {
          await sendMessage(chatId, premiumRequired(), contactCreator());
        } else {
          await sendMessage(
            chatId,
            `*${toSMC("SEND MAIL")}* 📧\n\nChoose an option:`,
            sendMailMenu(isAdmin(userId))
          );
        }
        return res.status(200).send("OK");
      }

      // ---- APPEAL ----
      if (data === "cmd_appeal") {
        const role = getRole(userId);
        if (role === "regular") {
          await sendMessage(chatId, premiumRequired(), contactCreator());
        } else {
          await sendMessage(
            chatId,
            `*${toSMC("APPEAL")}* 📧\n\nChoose an option:`,
            appealMenu(isAdmin(userId))
          );
        }
        return res.status(200).send("OK");
      }

      // ---- MASS MAIL (Premium + Admin) ----
      if (data === "mail_mass") {
        if (!isAdmin(userId) && !isPremium(userId)) {
          await sendMessage(chatId, premiumRequired(), contactCreator());
          return res.status(200).send("OK");
        }
        if (!customMessage) {
          await sendMessage(
            chatId,
            "❌ No custom message set by admin yet.",
            sendMailMenu(isAdmin(userId))
          );
          return res.status(200).send("OK");
        }
        if (clientEmails.length === 0) {
          await sendMessage(
            chatId,
            "❌ No client emails configured by admin yet.",
            sendMailMenu(isAdmin(userId))
          );
          return res.status(200).send("OK");
        }

        await sendMessage(chatId, "⏳ Sending emails... please wait.");

        const result = await sendBulkEmail(
          clientEmails,
          "Message from Apex Void",
          customMessage
        );

        if (result.success) {
          logs.successfulMails.push({
            userId,
            time: Date.now(),
            count: clientEmails.length,
          });
          await sendMessage(
            chatId,
            `✅ *Mass Mail Sent Successfully!*\n\nRecipients: *${clientEmails.length}*\nStatus: Delivered`,
            sendMailMenu(isAdmin(userId))
          );
        } else {
          logs.failedMails.push({
            userId,
            time: Date.now(),
            error: result.error,
          });
          await sendMessage(
            chatId,
            `❌ *Mass Mail Failed*\n\nError: ${result.error}\n\nPlease try again later or contact admin.`,
            sendMailMenu(isAdmin(userId))
          );
        }
        return res.status(200).send("OK");
      }

      // ---- MASS APPEAL ----
      if (data === "appeal_mass") {
        if (!isAdmin(userId) && !isPremium(userId)) {
          await sendMessage(chatId, premiumRequired(), contactCreator());
          return res.status(200).send("OK");
        }
        if (!appealMessage) {
          await sendMessage(
            chatId,
            "❌ No appeal message set by admin yet.",
            appealMenu(isAdmin(userId))
          );
          return res.status(200).send("OK");
        }
        if (appealEmails.length === 0) {
          await sendMessage(
            chatId,
            "❌ No appeal emails configured by admin yet.",
            appealMenu(isAdmin(userId))
          );
          return res.status(200).send("OK");
        }

        await sendMessage(chatId, "⏳ Sending appeal emails... please wait.");

        const result = await sendBulkEmail(
          appealEmails,
          "Appeal from Apex Void",
          appealMessage
        );

        if (result.success) {
          logs.successfulAppeals.push({
            userId,
            time: Date.now(),
            count: appealEmails.length,
          });
          await sendMessage(
            chatId,
            `✅ *Mass Appeal Sent Successfully!*\n\nRecipients: *${appealEmails.length}*\nStatus: Delivered`,
            appealMenu(isAdmin(userId))
          );
        } else {
          logs.failedAppeals.push({
            userId,
            time: Date.now(),
            error: result.error,
          });
          await sendMessage(
            chatId,
            `❌ *Mass Appeal Failed*\n\nError: ${result.error}`,
            appealMenu(isAdmin(userId))
          );
        }
        return res.status(200).send("OK");
      }

      // ---- ADMIN: Client Emails management ----
      if (data === "mail_emails" && isAdmin(userId)) {
        await sendMessage(
          chatId,
          listEmailsText("CLIENT EMAILS", clientEmails) +
            "\n\nOptions:",
          {
            inline_keyboard: [
              [{ text: "🟢 Add Emails", callback_data: "mail_add_emails", style: "success" }],
              [{ text: "🔴 Delete Emails", callback_data: "mail_del_emails", style: "danger" }],
              [{ text: "🔙 Back", callback_data: "cmd_sendmail", style: "primary" }],
            ],
          }
        );
        return res.status(200).send("OK");
      }

      if (data === "mail_add_emails" && isAdmin(userId)) {
        userStates.set(userId, { action: "add_client_emails" });
        await sendMessage(
          chatId,
          "Send up to 10 client emails (one per line):\n\nExample:\nclient1@domain.com\nclient2@domain.com",
          backMenu()
        );
        return res.status(200).send("OK");
      }

      if (data === "mail_del_emails" && isAdmin(userId)) {
        if (clientEmails.length === 0) {
          await sendMessage(chatId, "No emails to delete.", sendMailMenu(true));
          return res.status(200).send("OK");
        }
        userStates.set(userId, { action: "delete_client_emails" });
        await sendMessage(
          chatId,
          listEmailsText("CLIENT EMAILS", clientEmails) +
            "\n\nEnter the number(s) to delete (e.g. 1,3):",
          backMenu()
        );
        return res.status(200).send("OK");
      }

      // ---- ADMIN: Custom Message ----
      if (data === "mail_message" && isAdmin(userId)) {
        const preview = customMessage || "(not set)";
        await sendMessage(
          chatId,
          `*${toSMC("CUSTOM MESSAGE")}*\n\nCurrent:\n${preview}`,
          {
            inline_keyboard: [
              [{ text: "🟢 Set / Change Message", callback_data: "mail_set_message", style: "success" }],
              [{ text: "🔴 Delete Message", callback_data: "mail_del_message", style: "danger" }],
              [{ text: "🔙 Back", callback_data: "cmd_sendmail", style: "primary" }],
            ],
          }
        );
        return res.status(200).send("OK");
      }

      if (data === "mail_set_message" && isAdmin(userId)) {
        userStates.set(userId, { action: "set_custom_message" });
        await sendMessage(
          chatId,
          "Send the new custom message that will be emailed to all client emails:",
          backMenu()
        );
        return res.status(200).send("OK");
      }

      if (data === "mail_del_message" && isAdmin(userId)) {
        customMessage = "";
        await sendMessage(chatId, "✅ Custom message deleted.", sendMailMenu(true));
        return res.status(200).send("OK");
      }

      // ---- ADMIN: Appeal Emails ----
      if (data === "appeal_emails" && isAdmin(userId)) {
        await sendMessage(
          chatId,
          listEmailsText("APPEAL EMAILS", appealEmails) +
            "\n\nOptions:",
          {
            inline_keyboard: [
              [{ text: "🟢 Add Emails", callback_data: "appeal_add_emails", style: "success" }],
              [{ text: "🔴 Delete Emails", callback_data: "appeal_del_emails", style: "danger" }],
              [{ text: "🔙 Back", callback_data: "cmd_appeal", style: "primary" }],
            ],
          }
        );
        return res.status(200).send("OK");
      }

      if (data === "appeal_add_emails" && isAdmin(userId)) {
        userStates.set(userId, { action: "add_appeal_emails" });
        await sendMessage(
          chatId,
          "Send up to 10 appeal emails (one per line):",
          backMenu()
        );
        return res.status(200).send("OK");
      }

      if (data === "appeal_del_emails" && isAdmin(userId)) {
        if (appealEmails.length === 0) {
          await sendMessage(chatId, "No emails to delete.", appealMenu(true));
          return res.status(200).send("OK");
        }
        userStates.set(userId, { action: "delete_appeal_emails" });
        await sendMessage(
          chatId,
          listEmailsText("APPEAL EMAILS", appealEmails) +
            "\n\nEnter the number(s) to delete (e.g. 1,3):",
          backMenu()
        );
        return res.status(200).send("OK");
      }

      // ---- ADMIN: Appeal Message ----
      if (data === "appeal_message" && isAdmin(userId)) {
        const preview = appealMessage || "(not set)";
        await sendMessage(
          chatId,
          `*${toSMC("APPEAL MESSAGE")}*\n\nCurrent:\n${preview}`,
          {
            inline_keyboard: [
              [{ text: "🟢 Set / Change Message", callback_data: "appeal_set_message", style: "success" }],
              [{ text: "🔴 Delete Message", callback_data: "appeal_del_message", style: "danger" }],
              [{ text: "🔙 Back", callback_data: "cmd_appeal", style: "primary" }],
            ],
          }
        );
        return res.status(200).send("OK");
      }

      if (data === "appeal_set_message" && isAdmin(userId)) {
        userStates.set(userId, { action: "set_appeal_message" });
        await sendMessage(
          chatId,
          "Send the new appeal message:",
          backMenu()
        );
        return res.status(200).send("OK");
      }

      if (data === "appeal_del_message" && isAdmin(userId)) {
        appealMessage = "";
        await sendMessage(chatId, "✅ Appeal message deleted.", appealMenu(true));
        return res.status(200).send("OK");
      }

      // ---- PREMIUM ----
      if (data === "cmd_prem") {
        if (isAdmin(userId)) {
          await sendMessage(chatId, `*${toSMC("PREMIUM MANAGEMENT")}* ⭐`, premiumMenu());
        } else if (isPremium(userId)) {
          const p = premiumUsers.get(userId);
          await sendMessage(
            chatId,
            `*${toSMC("YOUR PREMIUM")}* ⭐\n\nDays left: *${daysLeft(p.expiry)}*\nExpires: ${formatDate(p.expiry)}`,
            backMenu()
          );
        } else {
          await sendMessage(chatId, premiumRequired(), contactCreator());
        }
        return res.status(200).send("OK");
      }

      if (isAdmin(userId)) {
        if (data === "prem_give") {
          userStates.set(userId, { action: "waiting_prem_id" });
          await sendMessage(
            chatId,
            `*${toSMC("GIVE PREMIUM")}*\n\nSend the Telegram User ID:`,
            backMenu()
          );
          return res.status(200).send("OK");
        }

        if (data === "prem_revoke") {
          if (premiumUsers.size === 0) {
            await sendMessage(chatId, "No premium users.", premiumMenu());
            return res.status(200).send("OK");
          }
          let t = `*${toSMC("REVOKE PREMIUM")}*\n\n`;
          let i = 1;
          const list = [];
          for (const [id, p] of premiumUsers) {
            t += `*${i}.* @${p.username || "?"} (\`${id}\`) – ${daysLeft(p.expiry)}d left\n`;
            list.push(id);
            i++;
          }
          userStates.set(userId, { action: "waiting_revoke_number", list });
          await sendMessage(chatId, t + "\nSend the number to revoke:", premiumMenu());
          return res.status(200).send("OK");
        }

        if (data === "prem_list") {
          if (premiumUsers.size === 0) {
            await sendMessage(chatId, "No premium users.", premiumMenu());
          } else {
            let t = `*${toSMC("PREMIUM USERS")}*\n\n`;
            let i = 1;
            for (const [id, p] of premiumUsers) {
              t += `${i}. @${p.username || "?"} (\`${id}\`)\n   ${daysLeft(p.expiry)} days left | Expires ${formatDate(p.expiry)}\n`;
              i++;
            }
            await sendMessage(chatId, t, premiumMenu());
          }
          return res.status(200).send("OK");
        }

        if (data === "prem_total") {
          let t = `*${toSMC("TOTAL USERS")}*\n\nTotal: *${users.size}*\n\n`;
          const recent = Array.from(users.values())
            .sort((a, b) => b.joined_at - a.joined_at)
            .slice(0, 10);
          recent.forEach((u, i) => {
            t += `${i + 1}. @${u.username || "?"} (\`${u.id}\`)\n`;
          });
          await sendMessage(chatId, t, premiumMenu());
          return res.status(200).send("OK");
        }

        if (data === "admin_logs") {
          const s = logs.successfulMails.length;
          const f = logs.failedMails.length;
          const sa = logs.successfulAppeals.length;
          const fa = logs.failedAppeals.length;
          await sendMessage(
            chatId,
            `*${toSMC("BOT LOGS")}*\n\n✅ Successful Mails: *${s}*\n❌ Failed Mails: *${f}*\n✅ Successful Appeals: *${sa}*\n❌ Failed Appeals: *${fa}*`,
            backMenu()
          );
          return res.status(200).send("OK");
        }
      }
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("Internal Server Error");
  }
};
