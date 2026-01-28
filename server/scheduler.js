const cron = require('node-cron');
const webpush = require('web-push');
const { db } = require('./db');

let telegramBot = null;
let initialized = false;

function initScheduler() {
  if (initialized) return;
  initialized = true;
  // Configure web push
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:user@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  // Configure Telegram bot
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const TelegramBot = require('node-telegram-bot-api');
    telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  }

  // Local dev: check every minute via node-cron
  if (!process.env.VERCEL) {
    cron.schedule('* * * * *', () => checkReminders());
    console.log('Scheduler started - checking every minute');
  }
}

async function sendNotifications(reminder) {
  const payload = JSON.stringify({
    title: reminder.title,
    body: reminder.message || 'Reminder is due!',
  });

  // Send web push to all subscribers
  try {
    const subs = await db.execute('SELECT * FROM push_subscriptions');
    for (const sub of subs.rows) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
      };
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (err) {
        if (err.statusCode === 410) {
          await db.execute({ sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?', args: [sub.endpoint] });
        }
      }
    }
  } catch (err) {
    console.error('Web push error:', err);
  }

  // Send Telegram message
  if (telegramBot && process.env.TELEGRAM_CHAT_ID) {
    try {
      await telegramBot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `🔔 *${reminder.title}*\n${reminder.message || 'Reminder is due!'}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Telegram error:', err);
    }
  }
}

async function handlePostNotify(reminder) {
  if (reminder.repeat === 'none') {
    await db.execute({ sql: 'UPDATE reminders SET notified = 1 WHERE id = ?', args: [reminder.id] });
  } else {
    // Calculate next occurrence
    const dt = new Date(reminder.datetime);
    if (reminder.repeat.startsWith('custom:')) {
      const [, num, unit] = reminder.repeat.split(':');
      const n = parseInt(num, 10);
      switch (unit) {
        case 'minutes': dt.setMinutes(dt.getMinutes() + n); break;
        case 'hours': dt.setHours(dt.getHours() + n); break;
        case 'days': dt.setDate(dt.getDate() + n); break;
        case 'weeks': dt.setDate(dt.getDate() + n * 7); break;
        case 'months': dt.setMonth(dt.getMonth() + n); break;
      }
    } else {
      switch (reminder.repeat) {
        case 'every_minute': dt.setMinutes(dt.getMinutes() + 1); break;
        case 'hourly': dt.setHours(dt.getHours() + 1); break;
        case 'daily': dt.setDate(dt.getDate() + 1); break;
        case 'weekly': dt.setDate(dt.getDate() + 7); break;
        case 'monthly': dt.setMonth(dt.getMonth() + 1); break;
      }
    }
    await db.execute({
      sql: 'UPDATE reminders SET datetime = ? WHERE id = ?',
      args: [dt.toISOString().slice(0, 16), reminder.id],
    });
  }
}

async function checkReminders() {
  try {
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 16);
    const result = await db.execute({
      sql: `SELECT * FROM reminders WHERE datetime <= ? AND notified = 0`,
      args: [nowStr],
    });
    for (const reminder of result.rows) {
      await sendNotifications(reminder);
      await handlePostNotify(reminder);
    }
    return result.rows.length;
  } catch (err) {
    console.error('Scheduler error:', err);
    throw err;
  }
}

module.exports = { initScheduler, checkReminders };
