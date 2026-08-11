// Apex Void Bot - Telegram Webhook (Vercel Edge Function)
// Bot token is hard-coded as requested. Move to environment variable later for better security.

const TOKEN = "8691945494:AAEAyCzR0YR9z1OvgKdz6nv_OXtwgeRdy6A";

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

export const config = {
  runtime: "edge",
};

async function sendMessage(chatId, text, replyMarkup = null) {
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.json();
}

async function answerCallbackQuery(callbackQueryId, text = "") {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
    }),
  });
}

function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "Start",
          callback_data: "cmd_start",
          style: "success", // green
        },
        {
          text: "Menu",
          callback_data: "cmd_menu",
          style: "primary", // blue
        },
      ],
      [
        {
          text: "Ban",
          callback_data: "cmd_ban",
          style: "danger", // red
        },
        {
          text: "Unban",
          callback_data: "cmd_unban",
          style: "primary", // blue
        },
      ],
      [
        {
          text: "Prem",
          callback_data: "cmd_prem",
          style: "success", // green
        },
      ],
    ],
  };
}

function getStartMessage(firstName) {
  const name = firstName || "there";
  return `*Welcome, ${name}!* ⚡\n\nYou have entered the void.\n\n⚡ *Apex Void Bot*\nUse the buttons below to navigate.`;
}

function getMenuMessage() {
  return `*⚡ Apex Void Menu*\n\nSelect an option below:`;
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const update = await req.json();

    // Handle regular messages (commands)
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = (msg.text || "").trim();
      const firstName = msg.from?.first_name || "there";

      // Extract command (handles /start@BotUsername)
      const command = text.split(" ")[0].toLowerCase().split("@")[0];

      if (command === "/start") {
        await sendMessage(chatId, getStartMessage(firstName), getMainMenuKeyboard());
      } else if (command === "/menu") {
        await sendMessage(chatId, getMenuMessage(), getMainMenuKeyboard());
      } else {
        await sendMessage(
          chatId,
          "Use /start or /menu to open the control panel.",
          getMainMenuKeyboard()
        );
      }
    }

    // Handle inline button presses
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const data = cb.data;
      const firstName = cb.from?.first_name || "there";

      await answerCallbackQuery(cb.id);

      if (data === "cmd_start") {
        await sendMessage(chatId, getStartMessage(firstName), getMainMenuKeyboard());
      } else if (data === "cmd_menu") {
        await sendMessage(chatId, getMenuMessage(), getMainMenuKeyboard());
      } else if (data === "cmd_ban") {
        await sendMessage(
          chatId,
          "🚫 *Ban* command is not fully configured yet.\nComing soon.",
          getMainMenuKeyboard()
        );
      } else if (data === "cmd_unban") {
        await sendMessage(
          chatId,
          "✅ *Unban* command is not fully configured yet.\nComing soon.",
          getMainMenuKeyboard()
        );
      } else if (data === "cmd_prem") {
        await sendMessage(
          chatId,
          "⭐ *Prem* command is not fully configured yet.\nComing soon.",
          getMainMenuKeyboard()
        );
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
