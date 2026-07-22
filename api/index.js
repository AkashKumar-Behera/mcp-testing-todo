import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getAllReminders, addReminder, toggleReminder, deleteReminder } from '../server/store.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Locate Frontend static build folder (dist)
let __dirname;
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  __dirname = process.cwd();
}

const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
  ? path.join(process.cwd(), 'dist')
  : path.join(__dirname, '../dist');

if (fs.existsSync(distPath)) {
  console.log(`✨ Serving Frontend UI from: ${distPath}`);
  app.use(express.static(distPath));
}

// --- Shared MCP Core Tool Definitions & Logic ---
const TOOL_DEFINITIONS = [
  {
    name: "add_reminder",
    description: "Add a new scheduled task or reminder to the Todo list. Call when user asks to set a reminder.",
    inputSchema: {
      type: "object",
      properties: {
        time: { type: "string", description: "Time of reminder e.g. '12:00 PM'" },
        work: { type: "string", description: "Task description" }
      },
      required: ["time", "work"]
    }
  },
  {
    name: "get_reminders",
    description: "Get all current reminders from the Todo list with Time | Work | Done status.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "toggle_reminder_status",
    description: "Toggle completion status (Done/Not Done) of a reminder by ID.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Reminder ID" } },
      required: ["id"]
    }
  },
  {
    name: "delete_reminder",
    description: "Delete a reminder by ID.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Reminder ID" } },
      required: ["id"]
    }
  }
];

const handleToolExecution = async (name, args = {}) => {
  if (name === "add_reminder") {
    const created = addReminder(args.time, args.work);
    return {
      content: [{ type: "text", text: `✅ Reminder set: ${created.time} | ${created.work} (ID: ${created.id})` }]
    };
  }
  if (name === "get_reminders") {
    const list = getAllReminders();
    const rows = list.map((r, i) => `${i + 1}. [${r.id}] ${r.time} | ${r.work} | ${r.done ? "✅ Done" : "⏳ Pending"}`).join("\n");
    return { content: [{ type: "text", text: list.length ? `📋 Reminders:\n${rows}` : "No reminders found." }] };
  }
  if (name === "toggle_reminder_status") {
    const updated = toggleReminder(args.id);
    return updated
      ? { content: [{ type: "text", text: `Updated status for '${updated.work}' to: ${updated.done ? "Done" : "Pending"}` }] }
      : { isError: true, content: [{ type: "text", text: "Reminder not found" }] };
  }
  if (name === "delete_reminder") {
    const success = deleteReminder(args.id);
    return success
      ? { content: [{ type: "text", text: `Deleted reminder ${args.id}` }] }
      : { isError: true, content: [{ type: "text", text: "Reminder not found" }] };
  }
  throw new Error(`Unknown tool: ${name}`);
};

// --- Root Endpoint: Serves React UI if built, else fallback status page ---
app.get('/', (req, res, next) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>MCP Remote Scheduler Server - LIVE</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #090d16; color: #f3f4f6; padding: 3rem; text-align: center; }
          .card { max-width: 600px; margin: 0 auto; background: #121a2b; padding: 2rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); }
          h1 { color: #06b6d4; margin-bottom: 0.5rem; }
          p { color: #9ca3af; line-height: 1.6; }
          .badge { display: inline-block; background: rgba(16,185,129,0.2); color: #10b981; padding: 0.4rem 1rem; border-radius: 9999px; font-weight: bold; margin-bottom: 1.5rem; }
          code { background: #030712; padding: 0.4rem 0.8rem; border-radius: 6px; color: #a7f3d0; font-family: monospace; display: block; margin: 1rem 0; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● REMOTE MCP SERVER IS LIVE</div>
          <h1>MCP Smart Scheduler Server</h1>
          <p>The Model Context Protocol (MCP) server is running and ready for SSE remote connections.</p>
          <h3>Your Remote MCP SSE Endpoint:</h3>
          <code>https://mcp-testing-todo.onrender.com/api/mcp/sse</code>
          <p>Connect this URL in Claude Desktop, Claude Code, Cursor, or ChatGPT!</p>
        </div>
      </body>
    </html>
  `);
});

// --- REST API Endpoints ---
app.get('/api/reminders', (req, res) => {
  const reminders = getAllReminders();
  res.json({ success: true, count: reminders.length, reminders });
});

app.post('/api/reminders', (req, res) => {
  const { time, work } = req.body;
  if (!work) {
    return res.status(400).json({ success: false, error: 'Work description is required.' });
  }
  const created = addReminder(time || '12:00 PM', work);
  res.json({ success: true, reminder: created });
});

app.patch('/api/reminders/:id/toggle', (req, res) => {
  const { id } = req.params;
  const updated = toggleReminder(id);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Reminder not found' });
  }
  res.json({ success: true, reminder: updated });
});

app.delete('/api/reminders/:id', (req, res) => {
  const { id } = req.params;
  const deleted = deleteReminder(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Reminder not found' });
  }
  res.json({ success: true, deleted: true });
});

// Natural language interpreter for Web UI prompt box
app.post('/api/mcp-natural-prompt', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  let time = "12:00 PM";
  let work = prompt;

  const timeRegex = /(?:at|for|around)\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm|AM|PM)?)/i;
  const timeMatch = prompt.match(timeRegex);

  if (timeMatch) {
    time = timeMatch[1].trim().toUpperCase();
    if (!time.includes("AM") && !time.includes("PM")) {
      time += " PM";
    }
  }

  let cleanedWork = prompt
    .replace(/^set\s+a?\s*reminder\s*(for|to)?/i, '')
    .replace(/^add\s+a?\s*todo\s*(for|to)?/i, '')
    .replace(/^remind\s+me\s+to/i, '')
    .replace(timeRegex, '')
    .trim();

  if (!cleanedWork) {
    cleanedWork = "Scheduled Task";
  }

  cleanedWork = cleanedWork.charAt(0).toUpperCase() + cleanedWork.slice(1);
  const created = addReminder(time, cleanedWork);

  res.json({
    success: true,
    mcpToolCalled: "add_reminder",
    toolArguments: { time, work: cleanedWork },
    createdReminder: created,
    mcpLog: `[Remote MCP Executed Tool: add_reminder] Args: time="${time}", work="${cleanedWork}"`
  });
});

// --- Remote HTTP / SSE MCP Protocol Endpoint ---

const createMcpServer = () => {
  const mcpServer = new Server(
    {
      name: "remote-scheduler-todo-mcp",
      version: "1.0.0",
    },
    {
      capabilities: { tools: {} },
    }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOL_DEFINITIONS };
  });

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await handleToolExecution(name, args);
  });

  return mcpServer;
};

// SSE Transport Active Connections
const transports = new Map();

app.get('/api/mcp/sse', async (req, res) => {
  const mcpServer = createMcpServer();
  
  // Construct absolute message URL so MCP Clients (Cursor/Roo/Claude) receive full POST URL
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'mcp-testing-todo.onrender.com';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const messageUrl = `${protocol}://${host}/api/mcp/message`;

  const transport = new SSEServerTransport(messageUrl, res);
  transports.set(transport.sessionId, transport);

  res.on('close', () => {
    transports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
});

app.post('/api/mcp/message', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);
  if (!transport) {
    return res.status(404).json({ error: "Session not found" });
  }
  await transport.handlePostMessage(req, res);
});

// Direct JSON-RPC HTTP POST handler for Remote MCP clients
app.post('/api/mcp', async (req, res) => {
  const { jsonrpc, id, method, params } = req.body || {};

  if (jsonrpc !== "2.0") {
    return res.status(400).json({ jsonrpc: "2.0", id: id || null, error: { code: -32600, message: "Invalid Request" } });
  }

  try {
    if (method === "tools/list") {
      return res.json({ jsonrpc: "2.0", id, result: { tools: TOOL_DEFINITIONS } });
    }
    if (method === "tools/call") {
      const { name, arguments: args } = params || {};
      const result = await handleToolExecution(name, args);
      return res.json({ jsonrpc: "2.0", id, result });
    }
    res.status(404).json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
  } catch (err) {
    res.status(500).json({ jsonrpc: "2.0", id, error: { code: -32603, message: err.message } });
  }
});

// SPA fallback for frontend routes
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('Page not found');
});

// Start HTTP server unless running as serverless function on Vercel
const PORT = process.env.PORT || 3001;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 MCP Scheduler Web & SSE Server listening on port ${PORT}`);
  });
}

export default app;
