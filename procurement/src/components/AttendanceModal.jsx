import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'antd';
import API_BASE from '../api';
import '../styles/attendance.scss';

export default function AttendanceModal({ token, open, onClose }) {
  const [attendanceToday, setAttendanceToday] = useState({ punchIn: null, punchOut: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadToday = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceToday({ punchIn: data.punchIn, punchOut: data.punchOut });
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (open) loadToday();
  }, [open]);

  const doPunch = (type) => {
    setBusy(true);
    setError('');
    setMsg('');
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${API_BASE}/api/attendance/punch-${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          });
          const data = await res.json();
          if (res.ok) {
            setMsg(type === 'in' ? 'Punched in successfully!' : 'Punched out successfully!');
            await loadToday();
          } else {
            setError(data.message || `Punch ${type} failed.`);
          }
        } catch {
          setError('Network error.');
        } finally {
          setBusy(false);
        }
      },
      () => {
        setError('Could not get your location. Please allow location access.');
        setBusy(false);
      },
      { enableHighAccuracy: true },
    );
  };

  const handleClose = () => {
    setError('');
    setMsg('');
    onClose();
  };

  return (
    <Modal open={open} onCancel={handleClose} title="Attendance" footer={null} width={380}>
      <p className="attendance-date">
        {new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>
      <div className="attendance-row">
        <span className="attendance-label">Punch In</span>
        {attendanceToday.punchIn ? (
          <span className="text-success">{new Date(attendanceToday.punchIn).toLocaleTimeString()}</span>
        ) : (
          <span className="text-placeholder">Not recorded</span>
        )}
      </div>
      <div className="attendance-row">
        <span className="attendance-label">Punch Out</span>
        {attendanceToday.punchOut ? (
          <span className="text-danger-val">{new Date(attendanceToday.punchOut).toLocaleTimeString()}</span>
        ) : (
          <span className="text-placeholder">Not recorded</span>
        )}
      </div>
      {error && <p className="text-danger">{error}</p>}
      {msg && <p className="text-success-msg">{msg}</p>}
      <div className="attendance-actions">
        {!attendanceToday.punchIn && (
          <Button type="primary" loading={busy} onClick={() => doPunch('in')}>
            Punch In
          </Button>
        )}
        {attendanceToday.punchIn && !attendanceToday.punchOut && (
          <Button type="primary" loading={busy} onClick={() => doPunch('out')}>
            Punch Out
          </Button>
        )}
        <Button onClick={handleClose}>Close</Button>
      </div>
    </Modal>
  );
}
