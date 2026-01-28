# Reminder App

Web-based reminder app with push notifications (browser + Telegram).

## Quick Start (Local)

1. **Install dependencies**
   ```
   npm install
   ```

2. **Generate VAPID keys** (for browser push notifications)
   ```
   npx web-push generate-vapid-keys
   ```
   Copy the output keys into your `.env` file.

3. **Create `.env` file** (copy from `.env.example`)
   ```
   cp .env.example .env
   ```
   For local dev, you only need VAPID keys. Turso and Telegram are optional — without Turso config it uses a local SQLite file.

4. **Run**
   ```
   npm start
   ```
   Open http://localhost:3000 on your PC and iPhone (same Wi-Fi network).

## Telegram Bot Setup

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts to name your bot
3. Copy the **bot token** and set `TELEGRAM_BOT_TOKEN` in `.env`
4. **Get your Chat ID**: Send any message to your new bot, then open this URL in your browser:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
   Find `"chat":{"id": 123456789}` in the response — that number is your `TELEGRAM_CHAT_ID`.
5. Set `TELEGRAM_CHAT_ID` in `.env` and restart the app.

## Turso Database Setup (for cloud deployment)

1. Install Turso CLI: https://docs.turso.tech/cli/installation
2. Create a database:
   ```
   turso db create reminder-app
   turso db tokens create reminder-app
   ```
3. Set `TURSO_URL` and `TURSO_AUTH_TOKEN` in `.env`

## Deploy to Cloud

### Vercel
```
npm i -g vercel
vercel
```
Set environment variables in the Vercel dashboard.

**Note:** The cron scheduler runs in-process, so Vercel serverless functions won't keep it running. For persistent scheduling, use **Railway** or **Render** instead, which run a persistent Node.js process.

### Railway / Render
Push to GitHub and connect the repo. Set env vars in the dashboard. These platforms run the full Node.js server persistently.
