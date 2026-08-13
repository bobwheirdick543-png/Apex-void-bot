# Apex Void Bot

Telegram bot with Premium system + bulk email (Send Mail / Appeal).

**Bot:** @Apexvoid_00bot  
**Creator:** @Fredd091 (ID: 7926253634)

## Features

### Everyone
- `/start` and `/menu`
- Colored inline buttons + SMC font

### Premium Users
- Can use **Send Mail** → Mass Mail
- Can use **Appeal** → Mass Appeal
- Get success / failure notification after sending

### Admin Only
- Manage **Client Emails** (add / delete)
- Set / edit / delete **Custom Message**
- Manage **Appeal Emails**
- Set / edit / delete **Appeal Message**
- Full Premium management (give / revoke / list / total users)
- Bot Logs
- Commands: `/addprem`, `/delprem`, `/listprem`, `/totalusers`

### Email Sending
- Uses Gmail SMTP with App Passwords
- Sender accounts are hidden from premium users
- Tries both sender accounts automatically

## Notes
- Storage is in-memory (resets on cold start)
- Runtime is now **Node.js** (required for nodemailer)
- Vercel will install `nodemailer` automatically from `package.json`
