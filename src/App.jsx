import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  Trash2, 
  Cpu, 
  Terminal, 
  Hourglass,
  Copy,
  Check,
  Globe,
  Bot
} from 'lucide-react';

export default function App() {
  const [reminders, setReminders] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [mcpLog, setMcpLog] = useState('');
  const [copiedTab, setCopiedTab] = useState(null);
  const [activeConfigTab, setActiveConfigTab] = useState('claude');

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://mcp-testing-todo.onrender.com';
  const remoteSseUrl = `${currentOrigin}/api/mcp/sse`;
  const remoteJsonRpcUrl = `${currentOrigin}/api/mcp`;

  // Sample quick prompt chips
  const promptExamples = [
    "set a reminder for meeting at 12 pm",
    "remind me to review PR at 3:30 pm",
    "set a reminder for Doctor Appointment at 10:00 AM",
    "remind me for Gym Session at 6:00 PM"
  ];

  // Config snippets for one-click copy
  const claudeConfig = JSON.stringify({
    "mcpServers": {
      "scheduler-todo-remote": {
        "url": remoteSseUrl
      }
    }
  }, null, 2);

  const aiSystemPrompt = `You are connected to Remote MCP Server at ${remoteSseUrl}. Use tool 'add_reminder' with arguments { time: "...", work: "..." } whenever I ask to set a reminder or schedule a task.`;

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

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 2000);
    return () => clearInterval(interval);
  }, []);

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

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="app-container">
      {/* Header */}
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
          <span>Remote MCP Server (SSE Active)</span>
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
            <button key={i} className="chip" onClick={() => setPrompt(ex)}>
              "{ex}"
            </button>
          ))}
        </div>

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
            No reminders scheduled. Use the prompt box above or connect an AI agent to set one!
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
                  <td>
                    <div className="time-cell">
                      <Clock size={16} />
                      <span>{item.time}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`work-cell ${item.done ? 'work-completed' : ''}`}>
                      {item.work}
                    </span>
                  </td>
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

      {/* One-Click Connect AI Agents Section */}
      <section className="mcp-info-panel">
        <div className="mcp-info-title">
          <Globe size={20} color="#06b6d4" />
          <span>⚡ One-Click Connect to Any AI Agent (Claude, Cursor, ChatGPT)</span>
        </div>

        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeConfigTab === 'claude' ? 'active' : ''}`}
            onClick={() => setActiveConfigTab('claude')}
          >
            <Bot size={16} /> Claude / Cursor / Antigravity JSON
          </button>
          <button 
            className={`tab-btn ${activeConfigTab === 'chatgpt' ? 'active' : ''}`}
            onClick={() => setActiveConfigTab('chatgpt')}
          >
            <Globe size={16} /> ChatGPT / HTTP Endpoint
          </button>
          <button 
            className={`tab-btn ${activeConfigTab === 'prompt' ? 'active' : ''}`}
            onClick={() => setActiveConfigTab('prompt')}
          >
            <Sparkles size={16} /> AI System Prompt
          </button>
        </div>

        <div className="config-content">
          {activeConfigTab === 'claude' && (
            <div>
              <div className="copy-header">
                <span>Copy into your <code>mcp-config.json</code> or Claude/Cursor settings:</span>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(claudeConfig, 'claude')}
                >
                  {copiedTab === 'claude' ? <><Check size={14} color="#10b981" /> Copied!</> : <><Copy size={14} /> Copy Config</>}
                </button>
              </div>
              <pre className="mcp-code-block">{claudeConfig}</pre>
            </div>
          )}

          {activeConfigTab === 'chatgpt' && (
            <div>
              <div className="copy-header">
                <span>Remote MCP HTTP URL for ChatGPT Custom Actions:</span>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(remoteJsonRpcUrl, 'chatgpt')}
                >
                  {copiedTab === 'chatgpt' ? <><Check size={14} color="#10b981" /> Copied!</> : <><Copy size={14} /> Copy URL</>}
                </button>
              </div>
              <pre className="mcp-code-block">{remoteJsonRpcUrl}</pre>
            </div>
          )}

          {activeConfigTab === 'prompt' && (
            <div>
              <div className="copy-header">
                <span>Copy Natural Language System Instructions for AI Agent:</span>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(aiSystemPrompt, 'prompt')}
                >
                  {copiedTab === 'prompt' ? <><Check size={14} color="#10b981" /> Copied!</> : <><Copy size={14} /> Copy Prompt</>}
                </button>
              </div>
              <pre className="mcp-code-block">{aiSystemPrompt}</pre>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
