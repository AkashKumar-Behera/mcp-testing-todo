import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Trash2, 
  Cpu, 
  Terminal, 
  PlusCircle, 
  Check, 
  Hourglass 
} from 'lucide-react';

export default function App() {
  const [reminders, setReminders] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [mcpLog, setMcpLog] = useState('');
  const [manualTime, setManualTime] = useState('12:00 PM');
  const [manualWork, setManualWork] = useState('');

  // Sample quick prompt chips
  const promptExamples = [
    "set a reminder for meeting at 12 pm",
    "remind me to review PR at 3:30 pm",
    "set a reminder for Doctor Appointment at 10:00 AM",
    "remind me for Gym Session at 6:00 PM"
  ];

  // Fetch reminders from API
  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/reminders');
      const data = await res.json();
      if (data.success) {
        setReminders(data.reminders);
      }
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    }
  };

  // Auto-refresh every 2 seconds to catch updates from MCP server calls
  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 2000);
    return () => clearInterval(interval);
  }, []);

  // Submit Natural Language Prompt (Simulating MCP Natural Language Tool Execution)
  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/mcp-natural-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (data.success) {
        setMcpLog(`🤖 MCP Tool Invoked: ${data.mcpToolCalled}(time: "${data.toolArguments.time}", work: "${data.toolArguments.work}")`);
        setPrompt('');
        fetchReminders();
      }
    } catch (err) {
      setMcpLog(`❌ Error executing MCP tool call: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle status (Done / Not Done)
  const handleToggle = async (id) => {
    try {
      const res = await fetch(`/api/reminders/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setMcpLog(`🤖 MCP Tool Invoked: toggle_reminder_status(id: "${id}", newStatus: "${data.reminder.done ? 'Done' : 'Not Done'}")`);
        fetchReminders();
      }
    } catch (err) {
      console.error("Error toggling reminder:", err);
    }
  };

  // Delete reminder
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMcpLog(`🤖 MCP Tool Invoked: delete_reminder(id: "${id}")`);
        fetchReminders();
      }
    } catch (err) {
      console.error("Error deleting reminder:", err);
    }
  };

  // Quick prompt chip click handler
  const handleChipClick = (example) => {
    setPrompt(example);
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Cpu size={26} color="#ffffff" />
          </div>
          <div>
            <h1>MCP Smart Scheduler</h1>
            <div className="brand-subtitle">AI Protocol Integrated Todo Hub</div>
          </div>
        </div>

        <div className="mcp-badge">
          <span className="dot-pulse"></span>
          <span>MCP Server Connected (Stdio)</span>
        </div>
      </header>

      {/* Natural Language Prompt Card */}
      <section className="prompt-card">
        <div className="prompt-title">
          <Sparkles size={20} color="#06b6d4" />
          <span>Ask AI Agent via Natural Language (Simulated MCP Tool Call)</span>
        </div>

        <form onSubmit={handlePromptSubmit} className="prompt-input-group">
          <input
            type="text"
            className="prompt-input"
            placeholder="Type e.g. 'set a reminder for meeting at 12 pm'..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            <Sparkles size={18} />
            {loading ? "Processing..." : "Add via MCP"}
          </button>
        </form>

        <div className="prompt-chips">
          <span className="chip-label">Try Examples:</span>
          {promptExamples.map((ex, i) => (
            <button key={i} className="chip" onClick={() => handleChipClick(ex)}>
              "{ex}"
            </button>
          ))}
        </div>

        {/* MCP Execution Log Banner */}
        {mcpLog && (
          <div className="mcp-log-banner">
            <Terminal size={16} />
            <span>{mcpLog}</span>
          </div>
        )}
      </section>

      {/* Scheduler Table Card */}
      <section className="table-card">
        <div className="table-header-toolbar">
          <div className="table-title">
            <Calendar size={20} color="#8b5cf6" />
            <span>Scheduled Reminders & Tasks</span>
          </div>
          <div className="table-stats">
            Total: <strong>{reminders.length}</strong> | 
            Completed: <strong>{reminders.filter(r => r.done).length}</strong> | 
            Pending: <strong>{reminders.filter(r => !r.done).length}</strong>
          </div>
        </div>

        {reminders.length === 0 ? (
          <div className="empty-state">
            No reminders scheduled. Use the prompt box above or MCP tools to set one!
          </div>
        ) : (
          <table className="scheduler-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Work / Task</th>
                <th>Done or Not</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((item) => (
                <tr key={item.id}>
                  {/* TIME Column */}
                  <td>
                    <div className="time-cell">
                      <Clock size={16} />
                      <span>{item.time}</span>
                    </div>
                  </td>

                  {/* WORK Column */}
                  <td>
                    <span className={`work-cell ${item.done ? 'work-completed' : ''}`}>
                      {item.work}
                    </span>
                  </td>

                  {/* DONE OR NOT Column */}
                  <td>
                    <span 
                      className={`status-pill ${item.done ? 'done' : 'pending'}`}
                      onClick={() => handleToggle(item.id)}
                      title="Click to toggle Done/Not Done status"
                    >
                      {item.done ? (
                        <>
                          <CheckCircle2 size={15} />
                          Done
                        </>
                      ) : (
                        <>
                          <Hourglass size={15} />
                          Not Done
                        </>
                      )}
                    </span>
                  </td>

                  {/* Action Column */}
                  <td>
                    <div className="actions-cell">
                      <button 
                        className="btn-icon" 
                        onClick={() => handleDelete(item.id)}
                        title="Delete reminder"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* MCP Integration Details */}
      <section className="mcp-info-panel">
        <div className="mcp-info-title">
          <Terminal size={18} />
          <span>How MCP Server works under the hood</span>
        </div>
        <p className="mcp-info-text">
          A Standalone MCP Server runs at <code>server/mcp-server.js</code> exposing standard tools like 
          <code>add_reminder</code>, <code>get_reminders</code>, <code>toggle_reminder_status</code>, and <code>delete_reminder</code>. 
          When an AI model receives a command like <em>"set a reminder for meeting at 12 pm"</em>, it automatically calls the 
          <code>add_reminder</code> tool via the Model Context Protocol.
        </p>

        <pre className="mcp-code-block">
{`// Register with Antigravity / Claude Desktop in mcp-config.json:
{
  "mcpServers": {
    "scheduler-todo": {
      "command": "node",
      "args": ["A:/Development/todo/server/mcp-server.js"]
    }
  }
}`}
        </pre>
      </section>
    </div>
  );
}
