# Apex Void Bot

Telegram bot with dark void aesthetic.

## Current Features

- `/start` – Greets user by first name + shows main menu
- `/menu` – Opens the control panel

### Inline Buttons (Bot API 9.4 colors)
- **Start** → green (`success`)
- **Menu** → blue (`primary`)
- **Ban** → red (`danger`)
- **Unban** → blue
- **Prem** → green

Ban / Unban / Prem are placeholders for now.

## Deploy to Vercel

1. Import this repository into Vercel
2. Deploy
3. Set the webhook (replace YOUR-VERCEL-APP with your actual URL):

```bash
curl -X POST "https://api.telegram.org/bot8691945494:AAEAyCzR0YR9z1OvgKdz6nv_OXtwgeRdy6A/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-VERCEL-APP.vercel.app/api/telegram-webhook"}'
```

## Notes

- Bot token is currently hard-coded as requested.
- For better security later, move it to a Vercel Environment Variable.
