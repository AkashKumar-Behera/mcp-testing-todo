import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getAllReminders, addReminder, toggleReminder, deleteReminder } from './store.js';

// Initialize MCP Server instance
const server = new Server(
  {
    name: "scheduler-todo-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add_reminder",
        description: "Add a new scheduled task or reminder to the Todo list. Call this when user requests setting a reminder (e.g. 'set a reminder for meeting at 12 pm').",
        inputSchema: {
          type: "object",
          properties: {
            time: {
              type: "string",
              description: "Time of the reminder/work (e.g., '12:00 PM', '03:30 PM', 'Tomorrow 9:00 AM')",
            },
            work: {
              type: "string",
              description: "The description of work, meeting, or task to be done.",
            },
          },
          required: ["time", "work"],
        },
      },
      {
        name: "get_reminders",
        description: "Get all current reminders from the Scheduler Todo list with their status (Time | Work | Done).",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "toggle_reminder_status",
        description: "Toggle or update the completion status (Done / Not Done) of a reminder by ID.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The unique ID of the reminder (e.g. 'rem-1')",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "delete_reminder",
        description: "Delete a reminder from the Todo list by ID.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the reminder to delete",
            },
          },
          required: ["id"],
        },
      },
    ],
  };
});

// Handle Tool Executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "add_reminder") {
      const { time, work } = args;
      const created = addReminder(time, work);
      return {
        content: [
          {
            type: "text",
            text: `✅ Reminder successfully set!\nTime: ${created.time}\nWork: ${created.work}\nStatus: ${created.done ? "Done" : "Not Done"}\nID: ${created.id}`,
          },
        ],
      };
    }

    if (name === "get_reminders") {
      const reminders = getAllReminders();
      if (reminders.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No reminders found in the Todo list.",
            },
          ],
        };
      }

      const tableRows = reminders.map(
        (r, idx) => `${idx + 1}. [ID: ${r.id}] ${r.time} | ${r.work} | ${r.done ? "✅ Done" : "⏳ Pending"}`
      ).join("\n");

      return {
        content: [
          {
            type: "text",
            text: `📋 Current Scheduler Todo List:\n\n${tableRows}`,
          },
        ],
      };
    }

    if (name === "toggle_reminder_status") {
      const { id } = args;
      const updated = toggleReminder(id);
      if (!updated) {
        return {
          isError: true,
          content: [{ type: "text", text: `Reminder with ID ${id} not found.` }],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Updated status for '${updated.work}' (${updated.time}) to: ${updated.done ? "✅ Done" : "⏳ Pending"}`,
          },
        ],
      };
    }

    if (name === "delete_reminder") {
      const { id } = args;
      const success = deleteReminder(id);
      if (!success) {
        return {
          isError: true,
          content: [{ type: "text", text: `Reminder with ID ${id} not found.` }],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `🗑️ Deleted reminder ${id} from Todo list.`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Scheduler MCP Server is running over Stdio...");
}

main().catch((err) => {
  console.error("Fatal error starting MCP Server:", err);
  process.exit(1);
});
