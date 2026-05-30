import { useState, useEffect } from 'react';
import { Modal, notification } from 'antd';
import API_BASE from '../api';
import '../styles/attendance.scss';

export default function AttendanceModal({ token, open, onClose }) {
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) fetchToday();
  }, [open]);

  const fetchToday = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setTodayRecord(data);
    } catch {
      // ignore
    }
  };

  const punch = async (type) => {
    setError('');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${API_BASE}/api/attendance/${type}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.message || 'Failed'); return; }
          notification.success({ message: type === 'punch-in' ? 'Punched in' : 'Punched out' });
          fetchToday();
        } catch {
          setError('Network error');
        } finally {
          setLoading(false);
        }
      },
      () => { setError('Location access denied'); setLoading(false); }
    );
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Modal
      title="Attendance"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className="attendance-date">{today}</div>
      <div className="attendance-row">
        <span className="attendance-label">Punch In</span>
        <span className="attendance-value">{fmt(todayRecord?.punchIn)}</span>
      </div>
      <div className="attendance-row">
        <span className="attendance-label">Punch Out</span>
        <span className="attendance-value">{fmt(todayRecord?.punchOut)}</span>
      </div>
      {error && <div className="text-danger" style={{ marginTop: 8 }}>{error}</div>}
      <div className="attendance-actions">
        {!todayRecord?.punchIn && (
          <button className="btn-primary" onClick={() => punch('punch-in')} disabled={loading}>
            Punch In
          </button>
        )}
        {todayRecord?.punchIn && !todayRecord?.punchOut && (
          <button className="btn-outline" onClick={() => punch('punch-out')} disabled={loading}>
            Punch Out
          </button>
        )}
        <button className="btn-outline" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
