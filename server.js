require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { parseReminder } = require('./parser');
const { addReminder, loadAll } = require('./store');
const { sendWhatsAppMessage } = require('./whatsappApi');
const { runTick } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const TICK_SECRET = process.env.TICK_SECRET || ''; // optional, set this to protect /tick from random hits

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));

// ------------------------------------------------------------------
// Health check
// ------------------------------------------------------------------
app.get('/', (req, res) => res.send('WhatsApp Reminder Bot is running.'));

// ------------------------------------------------------------------
// Webhook verification (GET) - same challenge logic as before
// ------------------------------------------------------------------
app.get('/webhook.php', (req, res) => {
  const challenge = req.query.challenge || req.query.challange;
  if (challenge) {
    res.set('Content-Type', 'text/html');
    res.status(200).send(challenge);
  } else {
    res.status(200).send('no challenge parameter found');
  }
});

// ------------------------------------------------------------------
// Webhook receiver (POST) - incoming WhatsApp messages
// ------------------------------------------------------------------
app.post('/webhook.php', async (req, res) => {
  res.status(200).json({ status: 'received' }); // ack immediately

  try {
    const data = req.body;
    const value = data?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message) return; // e.g. this was a status update, not an incoming message

    const from = message.from;             // sender's WhatsApp number
    const text = message.text?.body || '';
    const wamid = message.id;

    console.log(`Incoming from ${from}: ${text}`);

    // Handle "done" / "queue" replies to a follow-up check
    const lower = text.trim().toLowerCase();
    if (lower === 'done' || lower === 'queue') {
      // (Optional enhancement: match this to their most recent awaiting_confirmation reminder)
      await sendWhatsAppMessage(from, lower === 'done'
        ? "Great, marked as done ✅"
        : "Ok, I'll keep it in the queue 📋", wamid);
      return;
    }

    // Otherwise, try to parse it as a new reminder request
    const parsed = parseReminder(text);

    if (!parsed) {
      await sendWhatsAppMessage(
        from,
        `Sorry, I couldn't understand a time in that. Try something like:\n"remind call ravi at 5pm" or "meet John in 15 min"`,
        wamid
      );
      return;
    }

    const reminder = addReminder({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      to: from,
      task: parsed.task,
      time: parsed.time.toISOString(),
      status: 'pending',
      sent10: false,
      sent5: false,
      sentAt: false,
      sentFollowup: false,
      createdFromMessageId: wamid,
    });

    const timeStr = parsed.time.toLocaleString('en-IN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
      timeZone: 'Asia/Kolkata'
    });

    await sendWhatsAppMessage(
      from,
      `✅ Got it! I'll remind you: "${reminder.task}" at ${timeStr}`,
      wamid
    );
  } catch (err) {
    console.error('Error handling incoming message:', err.message);
  }
});

// ------------------------------------------------------------------
// /tick - called every minute by an external cron service (e.g. cron-job.org)
// This is what actually fires reminders. It also doubles as a keep-alive ping.
// ------------------------------------------------------------------
app.get('/tick', async (req, res) => {
  if (TICK_SECRET && req.query.secret !== TICK_SECRET) {
    return res.status(403).send('forbidden');
  }
  await runTick();
  res.status(200).send('ok');
});

// ------------------------------------------------------------------
// View all reminders (for debugging)
// ------------------------------------------------------------------
app.get('/reminders', (req, res) => {
  res.json(loadAll());
});

// ------------------------------------------------------------------
// Also run an internal cron every minute as a backup, in case the
// external pinger isn't set up yet. This won't fire while the free
// Render instance is asleep, which is exactly why the external /tick
// ping (above) is the more reliable mechanism.
// ------------------------------------------------------------------
cron.schedule('* * * * *', () => {
  runTick().catch(err => console.error('Internal tick error:', err.message));
});

app.listen(PORT, () => {
  console.log(`Reminder bot listening on port ${PORT}`);
});
