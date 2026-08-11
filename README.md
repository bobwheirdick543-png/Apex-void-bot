# Apex Void Bot

Telegram bot with dark void aesthetic + Premium system.

**Bot:** @Apexvoid_00bot  
**Creator:** @Fredd091

## Features

### For Everyone
- `/start` – Welcome + main menu
- `/menu` – Control panel
- Colored inline buttons (green / blue / red)
- SMC Unicode font styling

### Premium System
- Regular users see “Premium Required” on Ban / Unban / Prem
- Premium users can see their remaining days
- Admin can fully manage premium

### Admin Only (ID: 7926253634)
- Full Premium Management panel
- Give Premium (with duration 1-30 days)
- Revoke Premium (with confirmation)
- List all premium users
- Total users + recent users
- Admin commands:
  - `/addprem [user_id] [days]`
  - `/delprem [user_id]`
  - `/listprem`
  - `/totalusers`

### Permission Levels
- **Admin** → Full access
- **Premium** → Can access Ban/Unban (feature placeholder) + view own premium status
- **Regular** → Only Start / Menu + Contact Creator

## Notes
- Storage is currently **in-memory** (resets on Vercel cold start)
- Ban / Unban features are gated but the actual reporting logic is not implemented
- Welcome image support is ready (set `WELCOME_IMAGE_URL` in the code if you want photos on every menu)

## Deploy
Just push to the connected Vercel project. Webhook should already be set to:

```
https://apex-void-bot.vercel.app/api/telegram-webhook
```
