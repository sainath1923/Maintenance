import React, { useState } from 'react';
import { Modal } from 'antd';
import { API_BASE } from '../api';
import '../styles/attendance.scss';

export default function AttendanceModal({ open, onClose, token }) {
  const [attendanceToday, setAttendanceToday] = useState({ punchIn: null, punchOut: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadToday = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceToday({ punchIn: data.punchIn, punchOut: data.punchOut });
      }
    } catch { /* ignore */ }
  };

  const handleOpen = () => {
    setError('');
    setMsg('');
    loadToday();
  };

  const punch = (type) => {
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
          const res = await fetch(`${API_BASE}/api/attendance/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          });
          const data = await res.json();
          if (res.ok) {
            setMsg(type === 'punch-in' ? 'Punched in successfully!' : 'Punched out successfully!');
            await loadToday();
          } else {
            setError(data.message || `${type} failed.`);
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
      { enableHighAccuracy: true }
    );
  };

  const handleClose = () => {
    setError('');
    setMsg('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      afterOpenChange={(visible) => { if (visible) handleOpen(); }}
      footer={null}
      centered
      width={380}
      title={null}
    >
      <div className="attendance-modal-body">
        <div className="attendance-title">Attendance</div>
        <div className="attendance-date">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        <div className="attendance-times">
          <div className="attendance-time-row">
            <span className="attendance-time-label">Punch In</span>
            {attendanceToday.punchIn ? (
              <span className="attendance-time-value present">
                {new Date(attendanceToday.punchIn).toLocaleTimeString()}
              </span>
            ) : (
              <span className="attendance-time-value absent">Not recorded</span>
            )}
          </div>
          <div className="attendance-time-row">
            <span className="attendance-time-label">Punch Out</span>
            {attendanceToday.punchOut ? (
              <span className="attendance-time-value present">
                {new Date(attendanceToday.punchOut).toLocaleTimeString()}
              </span>
            ) : (
              <span className="attendance-time-value absent">Not recorded</span>
            )}
          </div>
        </div>
        {error && <p className="text-danger">{error}</p>}
        {msg && <p className="text-success">{msg}</p>}
        <div className="attendance-actions">
          {!attendanceToday.punchIn && (
            <button className="btn-primary btn-small" onClick={() => punch('punch-in')} disabled={busy}>
              {busy ? 'Please wait…' : 'Punch In'}
            </button>
          )}
          {attendanceToday.punchIn && !attendanceToday.punchOut && (
            <button className="btn-primary btn-small" onClick={() => punch('punch-out')} disabled={busy}>
              {busy ? 'Please wait…' : 'Punch Out'}
            </button>
          )}
          <button className="btn-outline btn-small" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
