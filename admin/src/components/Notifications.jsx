import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Checkbox, notification as antdNotif } from 'antd';
import API_BASE from '../api';
import '../styles/dashboard.scss';

const ROLE_OPTIONS = [
  { label: 'Supervisor', value: 'supervisor' },
  { label: 'Technician', value: 'technician' },
  { label: 'Stores', value: 'stores' },
  { label: 'Procurement', value: 'procurement' },
];

const ROLE_LABELS = {
  supervisor: 'Supervisor',
  technician: 'Technician',
  stores: 'Stores',
  procurement: 'Procurement',
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Notifications({ token }) {
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sent, setSent] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchSent = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications/sent`, { headers });
      const data = await res.json();
      if (res.ok) setSent(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => { fetchSent(); }, [fetchSent]);

  const toggleRole = (role) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSend = async () => {
    setSendError('');
    if (!message.trim()) { setSendError('Please enter a message.'); return; }
    if (targetRoles.length === 0) { setSendError('Select at least one recipient module.'); return; }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ message: message.trim(), targetRoles }),
      });
      const data = await res.json();
      if (!res.ok) { setSendError(data.message || 'Failed to send notification'); return; }
      antdNotif.success({ message: 'Notification sent', placement: 'topRight', duration: 3 });
      setMessage('');
      setTargetRoles([]);
      fetchSent();
    } catch {
      setSendError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Compose */}
      <div className="card">
        <div className="card-header-row">
          <div className="card-title">Send Notification</div>
          <span className="chip">Admin Broadcast</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Deliver to
          </label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {ROLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`notif-role-chip${targetRoles.includes(opt.value) ? ' notif-role-chip--active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: targetRoles.includes(opt.value)
                    ? '1px solid rgba(37,99,235,0.7)'
                    : '1px solid rgba(148,163,184,0.5)',
                  background: targetRoles.includes(opt.value) ? '#eff6ff' : '#f9fafb',
                  color: targetRoles.includes(opt.value) ? '#1d4ed8' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: targetRoles.includes(opt.value) ? 600 : 400,
                  userSelect: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={targetRoles.includes(opt.value)}
                  onChange={() => toggleRole(opt.value)}
                  style={{ display: 'none' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 12 }}>
          <label>Message</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your notification message here…"
            style={{ resize: 'vertical', minHeight: 90 }}
            maxLength={1000}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
            {message.length}/1000
          </span>
        </div>

        {sendError && <div className="text-danger" style={{ marginBottom: 8 }}>{sendError}</div>}

        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={sending}
          style={{ alignSelf: 'flex-start' }}
        >
          {sending ? 'Sending…' : 'Send Notification'}
        </button>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header-row">
          <div className="card-title">Sent Notifications</div>
          <span className="chip">{sent.length}</span>
        </div>

        {loadingHistory ? (
          <div className="text-muted">Loading…</div>
        ) : sent.length === 0 ? (
          <div className="text-muted" style={{ padding: '12px 0' }}>No notifications sent yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sent.map((n) => (
              <div
                key={n._id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.25)',
                  background: '#f9fafb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 14, color: 'var(--text-main)', flex: 1 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {n.targetRoles.map((r) => (
                    <span
                      key={r}
                      style={{
                        fontSize: 11,
                        padding: '1px 8px',
                        borderRadius: 999,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid rgba(59,130,246,0.3)',
                      }}
                    >
                      {ROLE_LABELS[r] || r}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
