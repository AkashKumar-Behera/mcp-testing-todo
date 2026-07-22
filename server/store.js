import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let __dirname;
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  __dirname = process.cwd();
}

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'reminders.json');

// In-memory cache for serverless environments (like Vercel)
let inMemoryStore = [
  {
    id: "rem-1",
    time: "10:00 AM",
    work: "Team Daily Standup Meeting",
    done: true,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: "rem-2",
    time: "12:00 PM",
    work: "Project Review & Demo with Client",
    done: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "rem-3",
    time: "04:30 PM",
    work: "Submit Weekly Progress Report",
    done: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

function isWritableFs() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
    }
    return true;
  } catch (err) {
    // Read-only filesystem (Vercel serverless)
    return false;
  }
}

export function getAllReminders() {
  if (isWritableFs()) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      inMemoryStore = JSON.parse(raw);
    } catch (err) {
      console.error("Error reading file, falling back to memory:", err);
    }
  }
  return inMemoryStore;
}

export function addReminder(time, work) {
  const reminders = getAllReminders();
  
  const newReminder = {
    id: "rem-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    time: time || "12:00 PM",
    work: work || "New Scheduled Task",
    done: false,
    createdAt: new Date().toISOString()
  };

  reminders.unshift(newReminder); // latest on top
  inMemoryStore = reminders;

  if (isWritableFs()) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(reminders, null, 2), 'utf-8');
    } catch (e) {
      console.warn("Could not write to file in read-only environment.");
    }
  }

  return newReminder;
}

export function toggleReminder(id) {
  const reminders = getAllReminders();
  const index = reminders.findIndex(r => r.id === id);
  if (index !== -1) {
    reminders[index].done = !reminders[index].done;
    inMemoryStore = reminders;

    if (isWritableFs()) {
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(reminders, null, 2), 'utf-8');
      } catch (e) {}
    }
    return reminders[index];
  }
  return null;
}

export function deleteReminder(id) {
  let reminders = getAllReminders();
  const initialLength = reminders.length;
  reminders = reminders.filter(r => r.id !== id);
  if (reminders.length !== initialLength) {
    inMemoryStore = reminders;
    if (isWritableFs()) {
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(reminders, null, 2), 'utf-8');
      } catch (e) {}
    }
    return true;
  }
  return false;
}
