const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'reminders.json');

function loadAll() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return []; // file doesn't exist yet, or is empty/corrupt
  }
}

function saveAll(reminders) {
  fs.writeFileSync(DB_FILE, JSON.stringify(reminders, null, 2));
}

function addReminder(reminder) {
  const all = loadAll();
  all.push(reminder);
  saveAll(all);
  return reminder;
}

function updateReminder(id, updates) {
  const all = loadAll();
  const idx = all.findIndex(r => r.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  saveAll(all);
  return all[idx];
}

function getActiveReminders() {
  return loadAll().filter(r => r.status !== 'done' && r.status !== 'cancelled');
}

module.exports = { loadAll, saveAll, addReminder, updateReminder, getActiveReminders };
