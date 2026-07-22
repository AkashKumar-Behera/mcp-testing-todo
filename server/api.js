import express from 'express';
import cors from 'cors';
import { getAllReminders, addReminder, toggleReminder, deleteReminder } from './store.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// GET all reminders
app.get('/api/reminders', (req, res) => {
  const reminders = getAllReminders();
  res.json({ success: true, count: reminders.length, reminders });
});

// POST add reminder
app.post('/api/reminders', (req, res) => {
  const { time, work } = req.body;
  if (!work) {
    return res.status(400).json({ success: false, error: 'Work description is required.' });
  }
  const created = addReminder(time || '12:00 PM', work);
  res.json({ success: true, reminder: created });
});

// PATCH toggle status
app.patch('/api/reminders/:id/toggle', (req, res) => {
  const { id } = req.params;
  const updated = toggleReminder(id);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Reminder not found' });
  }
  res.json({ success: true, reminder: updated });
});

// DELETE reminder
app.delete('/api/reminders/:id', (req, res) => {
  const { id } = req.params;
  const deleted = deleteReminder(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Reminder not found' });
  }
  res.json({ success: true, deleted: true });
});

// POST simulated MCP Natural Language Interpreter
// Parses prompts like "set a reminder for meeting at 12 pm" into MCP tool parameters
app.post('/api/mcp-natural-prompt', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  // Regex rules for parsing time & work from natural language
  let time = "12:00 PM";
  let work = prompt;

  // Extract time patterns like "at 12 pm", "at 3:30 pm", "at 9am", "for 5 pm"
  const timeRegex = /(?:at|for|around)\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm|AM|PM)?)/i;
  const timeMatch = prompt.match(timeRegex);

  if (timeMatch) {
    time = timeMatch[1].trim().toUpperCase();
    if (!time.includes("AM") && !time.includes("PM")) {
      time += " PM";
    }
  }

  // Clean up work string by removing "set a reminder", "add todo", "reminder for", "at 12 pm"
  let cleanedWork = prompt
    .replace(/^set\s+a?\s*reminder\s*(for|to)?/i, '')
    .replace(/^add\s+a?\s*todo\s*(for|to)?/i, '')
    .replace(/^remind\s+me\s+to/i, '')
    .replace(timeRegex, '')
    .trim();

  if (!cleanedWork) {
    cleanedWork = "Scheduled Task";
  }

  // Capitalize first letter
  cleanedWork = cleanedWork.charAt(0).toUpperCase() + cleanedWork.slice(1);

  // Invoke store action (same as MCP tool call)
  const created = addReminder(time, cleanedWork);

  res.json({
    success: true,
    mcpToolCalled: "add_reminder",
    toolArguments: { time, work: cleanedWork },
    createdReminder: created,
    mcpLog: `[MCP Executed Tool: add_reminder] Args: time="${time}", work="${cleanedWork}"`
  });
});

app.listen(PORT, () => {
  console.log(`📡 Scheduler API Server listening at http://localhost:${PORT}`);
});
