const { getActiveReminders, updateReminder } = require('./store');
const { sendWhatsAppMessage } = require('./whatsappApi');

const TEN_MIN = 10 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

/**
 * Call this on every "tick" (e.g. every minute, triggered internally or by an external cron ping).
 * Checks all active reminders and sends the appropriate message for whichever stage they're at.
 */
async function runTick() {
  const now = Date.now();
  const reminders = getActiveReminders();

  for (const reminder of reminders) {
    const remindAt = new Date(reminder.time).getTime();

    try {
      // Stage 1: 10 minutes before
      if (!reminder.sent10 && now >= remindAt - TEN_MIN && now < remindAt) {
        await sendWhatsAppMessage(reminder.to, `⏰ Reminder in 10 min: ${reminder.task}`);
        updateReminder(reminder.id, { sent10: true });
        continue;
      }

      // Stage 2: 5 minutes before
      if (!reminder.sent5 && now >= remindAt - FIVE_MIN && now < remindAt) {
        await sendWhatsAppMessage(reminder.to, `⏰ Reminder in 5 min: ${reminder.task}`);
        updateReminder(reminder.id, { sent5: true });
        continue;
      }

      // Stage 3: at the exact time
      if (!reminder.sentAt && now >= remindAt) {
        await sendWhatsAppMessage(reminder.to, `🔔 It's time: ${reminder.task}`);
        updateReminder(reminder.id, { sentAt: true, status: 'fired' });
        continue;
      }

      // Stage 4: 10 minutes after - follow-up check
      if (reminder.sentAt && !reminder.sentFollowup && now >= remindAt + TEN_MIN) {
        await sendWhatsAppMessage(
          reminder.to,
          `✅ Did you complete "${reminder.task}"? Reply "done" or "queue" to let me know.`
        );
        updateReminder(reminder.id, { sentFollowup: true, status: 'awaiting_confirmation' });
      }
    } catch (err) {
      // Already logged inside sendWhatsAppMessage - continue with other reminders
      console.error(`Failed processing reminder ${reminder.id}:`, err.message);
    }
  }
}

module.exports = { runTick };
