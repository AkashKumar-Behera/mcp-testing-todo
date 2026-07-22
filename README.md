# 🚀 MCP Smart Scheduler & Todo App (Vercel & Remote Ready)

A full-stack Scheduler & Todo web application powered by **Model Context Protocol (MCP)**. Works both locally and remotely on **Vercel** with **ChatGPT, Claude Code, Cursor, and Antigravity**.

---

## 📊 UI Table Format

| Time | Work | Done or Not |
| :--- | :--- | :--- |
| `10:00 AM` | Team Daily Standup Meeting | ✅ Done |
| `12:00 PM` | Meeting with Client | ⏳ Not Done |
| `04:30 PM` | Submit Weekly Progress Report | ⏳ Not Done |

---

## ☁️ How to Deploy to Vercel

### Option 1: Vercel CLI (Fastest)
1. Install Vercel CLI if not installed:
   ```bash
   npm i -g vercel
   ```
2. Deploy directly:
   ```bash
   vercel
   ```
   *Follow the prompts and your app will be live at `https://<your-project-name>.vercel.app`!*

### Option 2: GitHub Repository Integration
1. Push this project code to your GitHub Repository.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the repository and click **Deploy**. Vercel will automatically detect `vercel.json` and build the app.

---

## 🤖 Connecting Remote MCP (Vercel URL) to ChatGPT / Claude Code / Cursor

Once deployed to Vercel, your Remote MCP endpoints are:
* **SSE Endpoint:** `https://<your-app-name>.vercel.app/api/mcp/sse`
* **JSON-RPC Endpoint:** `https://<your-app-name>.vercel.app/api/mcp`

### 1. Claude Desktop / Cursor / Claude Code (`mcp-config.json`)

Add this configuration to your local MCP settings file:

```json
{
  "mcpServers": {
    "scheduler-todo-remote": {
      "url": "https://<your-app-name>.vercel.app/api/mcp/sse"
    }
  }
}
```

### 2. Testing via ChatGPT (Custom Actions / Remote HTTP)
ChatGPT Remote Actions can make POST requests to `https://<your-app-name>.vercel.app/api/mcp` with standard MCP JSON-RPC payloads:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "add_reminder",
    "arguments": {
      "time": "12:00 PM",
      "work": "Meeting with Team"
    }
  }
}
```
