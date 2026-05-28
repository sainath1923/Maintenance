import React, { useState, useEffect } from 'react';
import API_BASE from '../api';
import '../styles/attendance.scss';

const ATTENDANCE_ROLES = ['technician', 'supervisor', 'stores', 'procurement', 'delivery'];

const defaultLocations = () =>
  ATTENDANCE_ROLES.reduce((acc, role) => {
    acc[role] = { lat: '', lng: '', radius: 50 };
    return acc;
  }, {});

export default function Attendance({ token }) {
  const [attendanceLocations, setAttendanceLocations] = useState(defaultLocations());
  const [attendanceSaving, setAttendanceSaving] = useState({});
  const [attendanceMsg, setAttendanceMsg] = useState({});
  const [attendanceError, setAttendanceError] = useState({});
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceRoleFilter, setAttendanceRoleFilter] = useState('all');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('');
  const [attendanceHoursFilter, setAttendanceHoursFilter] = useState('all');

  const loadAttendanceLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/locations`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceLocations((prev) => {
          const next = { ...prev };
          for (const role of ATTENDANCE_ROLES) {
            if (data[role]) {
              next[role] = {
                lat: data[role].lat != null ? String(data[role].lat) : '',
                lng: data[role].lng != null ? String(data[role].lng) : '',
                radius: data[role].radius || 50
              };
            }
          }
          return next;
        });
      }
    } catch {
      // ignore
    }
  };

  const loadAttendanceRecords = async () => {
    setAttendanceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceRecords(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setAttendanceLoading(false);
    }
  };

  const saveAttendanceLocation = async (role) => {
    const loc = attendanceLocations[role];
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lng);
    const radius = parseFloat(loc.radius) || 50;
    if (isNaN(lat) || isNaN(lng)) {
      setAttendanceError((prev) => ({
        ...prev,
        [role]: 'Please enter valid latitude and longitude.'
      }));
      return;
    }
    setAttendanceSaving((prev) => ({ ...prev, [role]: true }));
    setAttendanceError((prev) => ({ ...prev, [role]: '' }));
    setAttendanceMsg((prev) => ({ ...prev, [role]: '' }));
    try {
      const res = await fetch(`${API_BASE}/api/attendance/locations/${role}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat, lng, radius })
      });
      if (res.ok) {
        setAttendanceMsg((prev) => ({ ...prev, [role]: 'Location saved.' }));
        setTimeout(() => setAttendanceMsg((prev) => ({ ...prev, [role]: '' })), 3000);
      } else {
        const d = await res.json();
        setAttendanceError((prev) => ({ ...prev, [role]: d.message || 'Save failed.' }));
      }
    } catch {
      setAttendanceError((prev) => ({ ...prev, [role]: 'Network error.' }));
    } finally {
      setAttendanceSaving((prev) => ({ ...prev, [role]: false }));
    }
  };

  const detectLocationForRole = (role) => {
    if (!navigator.geolocation) {
      setAttendanceError((prev) => ({
        ...prev,
        [role]: 'Geolocation not supported by this browser.'
      }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAttendanceLocations((prev) => ({
          ...prev,
          [role]: {
            ...prev[role],
            lat: String(pos.coords.latitude),
            lng: String(pos.coords.longitude)
          }
        }));
      },
      () => {
        setAttendanceError((prev) => ({ ...prev, [role]: 'Could not get current location.' }));
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    loadAttendanceLocations();
    loadAttendanceRecords();
  }, []);

  const getHoursWorked = (r) => {
    if (!r.punchIn || !r.punchOut) return null;
    return (new Date(r.punchOut) - new Date(r.punchIn)) / 3600000;
  };

  const filteredRecords = attendanceRecords
    .filter((r) => attendanceRoleFilter === 'all' || r.role === attendanceRoleFilter)
    .filter((r) => !attendanceDateFilter || r.date === attendanceDateFilter)
    .filter((r) => {
      if (attendanceHoursFilter !== 'under8') return true;
      const hrs = getHoursWorked(r);
      return hrs === null || hrs < 8;
    });

  return (
    <div className="card dashboard-card">
      <div className="card-header-row">
        <div className="card-title">Attendance geo-locations</div>
      </div>
      <p className="attendance-hint">
        Set the allowed punch-in/out location for each role. Staff must be within the specified
        radius to record attendance.
      </p>
      <div className="attendance-roles">
        {ATTENDANCE_ROLES.map((role) => {
          const loc = attendanceLocations[role];
          return (
            <div
              key={role}
            className="attendance-role-card"
            >
              <div className="attendance-role-title">
                {role}
              </div>
              <div className="attendance-fields">
                <div className="field">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 25.2048"
                    value={loc.lat}
                    onChange={(e) =>
                      setAttendanceLocations((prev) => ({
                        ...prev,
                        [role]: { ...prev[role], lat: e.target.value }
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 55.2708"
                    value={loc.lng}
                    onChange={(e) =>
                      setAttendanceLocations((prev) => ({
                        ...prev,
                        [role]: { ...prev[role], lng: e.target.value }
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Radius (metres)</label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={loc.radius}
                    onChange={(e) =>
                      setAttendanceLocations((prev) => ({
                        ...prev,
                        [role]: { ...prev[role], radius: e.target.value }
                      }))
                    }
                  />
                </div>
              </div>
              <div className="attendance-save-wrap">
                <button
                  className="btn-primary btn-small"
                  type="button"
                  disabled={attendanceSaving[role]}
                  onClick={() => saveAttendanceLocation(role)}
                >
                  {attendanceSaving[role] ? 'Saving…' : 'Save'}
                </button>
              </div>
              {attendanceMsg[role] && (
                <p className="attendance-msg">{attendanceMsg[role]}</p>
              )}
              {attendanceError[role] && (
                <p className="attendance-error-msg">{attendanceError[role]}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="attendance-records">
        <div className="card-header-row records-header-row">
          <div className="card-title">Attendance records</div>
          <div className="records-header-actions">
            <select
              value={attendanceHoursFilter}
              onChange={(e) => setAttendanceHoursFilter(e.target.value)}
            className="filter-select-sm"
            >
              <option value="all">All hours</option>
              <option value="under8">Under 8 hrs</option>
            </select>
            <button
              className="btn-outline btn-small"
              type="button"
              onClick={loadAttendanceRecords}
              disabled={attendanceLoading}
            >
              {attendanceLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="filters-row filters-row--mb">
          <div className="field">
            <label>Role</label>
            <select
              value={attendanceRoleFilter}
              onChange={(e) => setAttendanceRoleFilter(e.target.value)}
            >
              <option value="all">All roles</option>
              {ATTENDANCE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              value={attendanceDateFilter}
              onChange={(e) => setAttendanceDateFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Role</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => (
                <tr key={r._id}>
                  <td>{r.date}</td>
                  <td>{r.user?.name || '-'}</td>
                  <td className="capitalize">{r.role}</td>
                  <td>
                    {r.punchIn ? new Date(r.punchIn).toLocaleTimeString() : <span className="text-placeholder">—</span>}
                  </td>
                  <td>
                    {r.punchOut ? new Date(r.punchOut).toLocaleTimeString() : <span className="text-placeholder">—</span>}
                  </td>
                  <td>
                    {(() => {
                      const hrs = getHoursWorked(r);
                      if (hrs === null) return <span className="text-placeholder">—</span>;
                      const h = Math.floor(hrs);
                      const m = Math.round((hrs - h) * 60);
                      const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
                      return <span className={hrs < 8 ? 'hours-under' : 'hours-ok'}>{label}</span>;
                    })()}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-empty">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
