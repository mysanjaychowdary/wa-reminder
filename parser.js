const chrono = require('chrono-node');

/**
 * Parses free-text reminder messages like:
 *  - "remind meet at 12:30pm"
 *  - "call ravi in 15 min"
 *  - "remind me to call ravi at 5pm"
 *  - "team standup tomorrow 10am"
 *
 * Returns { task, time } or null if no time could be found.
 */
function parseReminder(text, referenceDate = new Date()) {
  const results = chrono.parse(text, referenceDate, { forwardDate: true });

  if (!results || results.length === 0) {
    return null;
  }

  const result = results[0];
  const time = result.start.date();

  // Remove the matched date/time text from the message to isolate the task description
  let task = text.slice(0, result.index) + text.slice(result.index + result.text.length);

  // Clean up leftover filler words
  task = task
    .replace(/^remind(\s+me\b)?(\s+to\b)?/i, '')
    .replace(/\b(at|on|in)\b\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!task) {
    task = 'Reminder';
  }

  // Capitalize first letter for nicer messages
  task = task.charAt(0).toUpperCase() + task.slice(1);

  return { task, time };
}

module.exports = { parseReminder };
