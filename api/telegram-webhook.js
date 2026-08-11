// Apex Void Bot - Full Premium + Admin System
// Vercel Edge Function

const TOKEN = "8691945494:AAEAyCzR0YR9z1OvgKdz6nv_OXtwgeRdy6A";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const ADMIN_ID = 7926253634;
const CREATOR_USERNAME = "Fredd091";

// Optional: public image URL for menus (leave empty to send text only)
const WELCOME_IMAGE_URL = "";

export const config = {
  runtime: "edge",
};

// ====================== STORAGE (In-Memory) ======================
const users = new Map();       // userId -> { id, username, first_name, joined_at }
const premiumUsers = new Map(); // userId -> { id, username, granted_at, duration_days, expiry }
const userStates = new Map();  // userId -> { action, data }

// ====================== UNICODE SMC FONT ======================
function toSMC(text) {
  if (!text) return "";
  const boldSans = {
    A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜",
    J: "𝗝", K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥",
    S: "𝗦", T: "𝗧", U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭",
    a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶",
    j: "𝗷", k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿",
    s: "𝘀", t: "𝘁", u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇",
    "0": "𝟬", "1": "𝟭", "2": "𝟮", "3": "𝟯", "4": "𝟰",
    "5": "𝟱", "6": "𝟲", "7": "𝟳", "8": "𝟴", "9": "𝟵"
  };
  return text.split("").map(c => boldSans[c] || c).join("");
}

// ====================== HELPERS ======================
async function sendMessage(chatId, text, replyMarkup = null) {
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendPhoto(chatId, photoUrl, caption, replyMarkup = null) {
  const body = {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: "Markdown",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function answerCallback(callbackQueryId, text = "") {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
    }),
  });
}

function registerUser(from) {
  if (!from || !from.id) return;
  const id = from.id;
  if (!users.has(id)) {
    users.set(id, {
      id,
      username: from.username || null,
      first_name: from.first_name || "User",
      joined_at: Date.now(),
    });
  }
}

function isAdmin(userId) {
  return Number(userId) === ADMIN_ID;
}

function isPremium(userId) {
  const prem = premiumUsers.get(Number(userId));
  if (!prem) return false;
  if (Date.now() > prem.expiry) {
    premiumUsers.delete(Number(userId));
    return false;
  }
  return true;
}

function getUserRole(userId) {
  if (isAdmin(userId)) return "admin";
  if (isPremium(userId)) return "premium";
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

function daysRemaining(expiry) {
  const diff = expiry - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ====================== KEYBOARDS ======================
function mainMenuKeyboard(userId) {
  const role = getUserRole(userId);

  if (role === "admin") {
    return {
      inline_keyboard: [
        [
          { text: "🟢 Start", callback_data: "cmd_start", style: "success" },
          { text: "🔵 Menu", callback_data: "cmd_menu", style: "primary" },
        ],
        [
          { text: "🔴 Ban", callback_data: "cmd_ban", style: "danger" },
          { text: "🔵 Unban", callback_data: "cmd_unban", style: "primary" },
        ],
        [
          { text: "🟢 Prem", callback_data: "cmd_prem", style: "success" },
          { text: "📊 Bot Logs", callback_data: "admin_logs", style: "primary" },
        ],
      ],
    };
  }

  // Premium + Regular
  return {
    inline_keyboard: [
      [
        { text: "🟢 Start", callback_data: "cmd_start", style: "success" },
        { text: "🔵 Menu", callback_data: "cmd_menu", style: "primary" },
      ],
      [
        { text: "🔴 Ban", callback_data: "cmd_ban", style: "danger" },
        { text: "🔵 Unban", callback_data: "cmd_unban", style: "primary" },
      ],
      [
        { text: "🟢 Prem", callback_data: "cmd_prem", style: "success" },
      ],
    ],
  };
}

function premiumMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🟢 Give Premium", callback_data: "prem_give", style: "success" }],
      [{ text: "🔴 Revoke Premium", callback_data: "prem_revoke", style: "danger" }],
      [{ text: "🔵 List Premium Users", callback_data: "prem_list", style: "primary" }],
      [{ text: "🔵 Total Users", callback_data: "prem_total", style: "primary" }],
      [{ text: "🔙 Back to Menu", callback_data: "cmd_menu", style: "primary" }],
    ],
  };
}

function backToMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🔙 Back to Menu", callback_data: "cmd_menu", style: "primary" }],
    ],
  };
}

function contactCreatorKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "📩 Contact Creator",
          url: `https://t.me/${CREATOR_USERNAME}`,
          style: "primary",
        },
      ],
      [{ text: "🔙 Back to Menu", callback_data: "cmd_menu", style: "primary" }],
    ],
  };
}

function confirmRevokeKeyboard(targetId) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Yes, Revoke", callback_data: `prem_revoke_confirm_${targetId}`, style: "success" },
        { text: "❌ Cancel", callback_data: "prem_revoke", style: "danger" },
      ],
    ],
  };
}

// ====================== MESSAGE BUILDERS ======================
function getWelcomeText(firstName) {
  const name = firstName || "User";
  return (
    `*${toSMC("APEX VOID BOT")}* ⚡\n\n` +
    `Welcome, *${name}*\n\n` +
    `You have entered the void.\n` +
    `Use the buttons below to navigate.`
  );
}

function getMenuText(userId) {
  const role = getUserRole(userId);
  let roleText = "Regular User";
  if (role === "admin") roleText = "👑 Admin";
  if (role === "premium") roleText = "⭐ Premium";

  return (
    `*${toSMC("APEX VOID MENU")}* ⚡\n\n` +
    `Role: *${roleText}*\n\n` +
    `Select an option below:`
  );
}

function getPremiumRequiredText() {
  return (
    `*${toSMC("PREMIUM FEATURE")}* ⭐\n\n` +
    `This feature requires Premium access.\n\n` +
    `To get premium, contact the creator:\n` +
    `@${CREATOR_USERNAME}`
  );
}

// ====================== CORE HANDLERS ======================
async function sendMenu(chatId, userId, firstName, isStart = false) {
  const text = isStart ? getWelcomeText(firstName) : getMenuText(userId);
  const keyboard = mainMenuKeyboard(userId);

  if (WELCOME_IMAGE_URL) {
    await sendPhoto(chatId, WELCOME_IMAGE_URL, text, keyboard);
  } else {
    await sendMessage(chatId, text, keyboard);
  }
}

async function handlePremiumGive(chatId, userId) {
  userStates.set(userId, { action: "waiting_prem_id" });
  await sendMessage(
    chatId,
    `*${toSMC("GIVE PREMIUM")}*\n\nSend the Telegram User ID of the person you want to give Premium to.\n\nExample: \`123456789\``,
    backToMenuKeyboard()
  );
}

async function handlePremiumRevokeList(chatId) {
  if (premiumUsers.size === 0) {
    await sendMessage(
      chatId,
      `*${toSMC("REVOKE PREMIUM")}*\n\nNo premium users found.`,
      premiumMenuKeyboard()
    );
    return;
  }

  let text = `*${toSMC("REVOKE PREMIUM")}*\n\nSelect a number to revoke:\n\n`;
  let i = 1;
  const map = [];

  for (const [id, data] of premiumUsers) {
    const remaining = daysRemaining(data.expiry);
    text += `*${i}.* @${data.username || "unknown"} (ID: \`${id}\`)\n`;
    text += `   Days left: ${remaining}\n\n`;
    map.push(id);
    i++;
  }

  // Store the ordered list temporarily
  userStates.set(chatId, { action: "waiting_revoke_number", list: map });

  await sendMessage(chatId, text, premiumMenuKeyboard());
}

async function handlePremiumList(chatId) {
  if (premiumUsers.size === 0) {
    await sendMessage(
      chatId,
      `*${toSMC("PREMIUM USERS")}*\n\nNo premium users at the moment.`,
      premiumMenuKeyboard()
    );
    return;
  }

  let text = `*${toSMC("PREMIUM USERS")}*\n\n`;
  let i = 1;

  for (const [id, data] of premiumUsers) {
    const remaining = daysRemaining(data.expiry);
    const used = data.duration_days - remaining;

    text += `━━━━━━━━━━━━━━━━\n`;
    text += `*${i}.* @${data.username || "unknown"}\n`;
    text += `ID: \`${id}\`\n`;
    text += `Duration: ${data.duration_days} days\n`;
    text += `Used: ${used} | Remaining: ${remaining}\n`;
    text += `Expires: ${formatDate(data.expiry)}\n`;
    i++;
  }

  text += `━━━━━━━━━━━━━━━━\nTotal: *${premiumUsers.size}* premium users`;

  await sendMessage(chatId, text, {
    inline_keyboard: [
      [{ text: "🔄 Refresh", callback_data: "prem_list", style: "primary" }],
      [{ text: "🔙 Back", callback_data: "cmd_prem", style: "primary" }],
    ],
  });
}

async function handleTotalUsers(chatId) {
  const total = users.size;
  let text = `*${toSMC("TOTAL USERS")}*\n\nTotal users who started the bot: *${total}*\n\n`;

  if (total > 0) {
    text += `*Recent users:*\n`;
    const recent = Array.from(users.values())
      .sort((a, b) => b.joined_at - a.joined_at)
      .slice(0, 10);

    recent.forEach((u, idx) => {
      text += `${idx + 1}. @${u.username || "unknown"} (\`${u.id}\`)\n`;
    });
  }

  await sendMessage(chatId, text, {
    inline_keyboard: [
      [{ text: "🔄 Refresh", callback_data: "prem_total", style: "primary" }],
      [{ text: "🔙 Back", callback_data: "cmd_prem", style: "primary" }],
    ],
  });
}

// ====================== MAIN HANDLER ======================
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const update = await req.json();

    // ========== MESSAGE HANDLER ==========
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const from = msg.from;
      const userId = from.id;
      const text = (msg.text || "").trim();
      const firstName = from.first_name || "User";

      registerUser(from);

      // Check conversation state first
      const state = userStates.get(userId);

      if (state && state.action === "waiting_prem_id") {
        const targetId = parseInt(text);
        if (isNaN(targetId)) {
          await sendMessage(chatId, "❌ Invalid ID. Please send a valid numeric Telegram User ID.", backToMenuKeyboard());
          return new Response("OK", { status: 200 });
        }
        userStates.set(userId, { action: "waiting_prem_days", targetId });
        await sendMessage(
          chatId,
          `*${toSMC("GIVE PREMIUM")}*\n\nUser ID: \`${targetId}\`\n\nNow send the duration in days (1-30).\nDefault is 7 if you just send anything invalid.`,
          backToMenuKeyboard()
        );
        return new Response("OK", { status: 200 });
      }

      if (state && state.action === "waiting_prem_days") {
        let days = parseInt(text);
        if (isNaN(days) || days < 1 || days > 30) days = 7;

        const targetId = state.targetId;
        const expiry = Date.now() + days * 24 * 60 * 60 * 1000;

        // Try to get username from users map
        const targetUser = users.get(targetId);
        const username = targetUser ? targetUser.username : null;

        premiumUsers.set(targetId, {
          id: targetId,
          username,
          granted_at: Date.now(),
          duration_days: days,
          expiry,
        });

        userStates.delete(userId);

        await sendMessage(
          chatId,
          `✅ *Premium Granted*\n\nUser: \`${targetId}\`\nDuration: *${days} days*\nExpires: ${formatDate(expiry)}`,
          premiumMenuKeyboard()
        );

        // Notify the user if possible
        try {
          await sendMessage(
            targetId,
            `⭐ *You have received Premium access!*\n\nDuration: *${days} days*\nExpires: ${formatDate(expiry)}\n\nEnjoy the void.`
          );
        } catch (e) {}

        return new Response("OK", { status: 200 });
      }

      if (state && state.action === "waiting_revoke_number") {
        const num = parseInt(text);
        const list = state.list || [];
        if (isNaN(num) || num < 1 || num > list.length) {
          await sendMessage(chatId, "❌ Invalid number. Please try again.", premiumMenuKeyboard());
          return new Response("OK", { status: 200 });
        }

        const targetId = list[num - 1];
        const data = premiumUsers.get(targetId);

        userStates.delete(userId);

        await sendMessage(
          chatId,
          `*Confirm Revoke*\n\nUser: @${data?.username || "unknown"} (\`${targetId}\`)\n\nAre you sure you want to revoke Premium?`,
          confirmRevokeKeyboard(targetId)
        );
        return new Response("OK", { status: 200 });
      }

      // Commands
      const command = text.split(" ")[0].toLowerCase().split("@")[0];

      if (command === "/start") {
        await sendMenu(chatId, userId, firstName, true);
        return new Response("OK", { status: 200 });
      }

      if (command === "/menu") {
        await sendMenu(chatId, userId, firstName, false);
        return new Response("OK", { status: 200 });
      }

      // Admin commands
      if (isAdmin(userId)) {
        if (command === "/addprem") {
          const parts = text.split(/\s+/);
          const targetId = parseInt(parts[1]);
          let days = parseInt(parts[2]) || 7;
          if (days < 1 || days > 30) days = 7;

          if (isNaN(targetId)) {
            await sendMessage(chatId, "Usage: `/addprem user_id [days]`");
            return new Response("OK", { status: 200 });
          }

          const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
          const targetUser = users.get(targetId);

          premiumUsers.set(targetId, {
            id: targetId,
            username: targetUser?.username || null,
            granted_at: Date.now(),
            duration_days: days,
            expiry,
          });

          await sendMessage(
            chatId,
            `✅ Premium granted to \`${targetId}\` for *${days} days*.`
          );

          try {
            await sendMessage(
              targetId,
              `⭐ You received Premium for *${days} days*!`
            );
          } catch (e) {}

          return new Response("OK", { status: 200 });
        }

        if (command === "/delprem") {
          const targetId = parseInt(text.split(/\s+/)[1]);
          if (isNaN(targetId)) {
            await sendMessage(chatId, "Usage: `/delprem user_id`");
            return new Response("OK", { status: 200 });
          }

          if (premiumUsers.has(targetId)) {
            premiumUsers.delete(targetId);
            await sendMessage(chatId, `✅ Premium revoked from \`${targetId}\``);
            try {
              await sendMessage(targetId, "❌ Your Premium access has been revoked.");
            } catch (e) {}
          } else {
            await sendMessage(chatId, "User is not premium.");
          }
          return new Response("OK", { status: 200 });
        }

        if (command === "/listprem") {
          await handlePremiumList(chatId);
          return new Response("OK", { status: 200 });
        }

        if (command === "/totalusers") {
          await handleTotalUsers(chatId);
          return new Response("OK", { status: 200 });
        }
      }

      // Default
      await sendMessage(
        chatId,
        "Use /start or /menu to open the control panel.",
        mainMenuKeyboard(userId)
      );
    }

    // ========== CALLBACK HANDLER ==========
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const userId = cb.from.id;
      const data = cb.data;
      const firstName = cb.from.first_name || "User";

      registerUser(cb.from);
      await answerCallback(cb.id);

      // Clear any previous state when navigating menus
      if (["cmd_start", "cmd_menu", "cmd_prem", "cmd_ban", "cmd_unban"].includes(data)) {
        userStates.delete(userId);
      }

      if (data === "cmd_start") {
        await sendMenu(chatId, userId, firstName, true);
        return new Response("OK", { status: 200 });
      }

      if (data === "cmd_menu") {
        await sendMenu(chatId, userId, firstName, false);
        return new Response("OK", { status: 200 });
      }

      // BAN / UNBAN - Premium gate
      if (data === "cmd_ban" || data === "cmd_unban") {
        const role = getUserRole(userId);
        if (role === "regular") {
          await sendMessage(chatId, getPremiumRequiredText(), contactCreatorKeyboard());
        } else {
          // Premium or Admin - feature not implemented (as agreed)
          const feature = data === "cmd_ban" ? "Ban" : "Unban";
          await sendMessage(
            chatId,
            `*${toSMC(feature.toUpperCase())}*\n\nThis feature is not available yet.`,
            backToMenuKeyboard()
          );
        }
        return new Response("OK", { status: 200 });
      }

      // PREM BUTTON
      if (data === "cmd_prem") {
        if (isAdmin(userId)) {
          await sendMessage(
            chatId,
            `*${toSMC("PREMIUM MANAGEMENT")}* ⭐\n\nChoose an option:`,
            premiumMenuKeyboard()
          );
        } else if (isPremium(userId)) {
          const prem = premiumUsers.get(userId);
          const remaining = daysRemaining(prem.expiry);
          await sendMessage(
            chatId,
            `*${toSMC("YOUR PREMIUM")}* ⭐\n\nStatus: Active\nDays remaining: *${remaining}*\nExpires: ${formatDate(prem.expiry)}`,
            backToMenuKeyboard()
          );
        } else {
          await sendMessage(chatId, getPremiumRequiredText(), contactCreatorKeyboard());
        }
        return new Response("OK", { status: 200 });
      }

      // ADMIN ONLY PREMIUM ACTIONS
      if (isAdmin(userId)) {
        if (data === "prem_give") {
          await handlePremiumGive(chatId, userId);
          return new Response("OK", { status: 200 });
        }

        if (data === "prem_revoke") {
          await handlePremiumRevokeList(chatId);
          return new Response("OK", { status: 200 });
        }

        if (data === "prem_list") {
          await handlePremiumList(chatId);
          return new Response("OK", { status: 200 });
        }

        if (data === "prem_total") {
          await handleTotalUsers(chatId);
          return new Response("OK", { status: 200 });
        }

        if (data.startsWith("prem_revoke_confirm_")) {
          const targetId = parseInt(data.replace("prem_revoke_confirm_", ""));
          if (premiumUsers.has(targetId)) {
            premiumUsers.delete(targetId);
            await sendMessage(
              chatId,
              `✅ Premium revoked from \`${targetId}\``,
              premiumMenuKeyboard()
            );
            try {
              await sendMessage(targetId, "❌ Your Premium access has been revoked by the admin.");
            } catch (e) {}
          } else {
            await sendMessage(chatId, "User is no longer premium.", premiumMenuKeyboard());
          }
          return new Response("OK", { status: 200 });
        }

        if (data === "admin_logs") {
          await sendMessage(
            chatId,
            `*${toSMC("BOT LOGS")}*\n\nLogs system is ready for future features.\nCurrently no mass-report activity is being tracked.`,
            backToMenuKeyboard()
          );
          return new Response("OK", { status: 200 });
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
