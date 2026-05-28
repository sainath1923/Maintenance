import React, { useState, useEffect } from 'react';
import API_BASE from '../api';
import '../styles/dashboard.scss';

function fmtDuration(ms) {
  const totalMins = Math.round(ms / 60000);
  if (totalMins < 60) return `${totalMins}m`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs < 24) return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
}

export default function Dashboard({ token }) {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const fetchAllRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load requests');
      setRequests(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load users');
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchAllRequests();
    fetchUsers();
  }, []);

  const totalTasks = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'In Progress').length;
  const completedCount = requests.filter((r) => r.status === 'Completed').length;

  const priorityCounts = requests.reduce((acc, r) => {
    const key = r.priority || 'Low';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const statusCounts = requests.reduce((acc, r) => {
    const key = r.status || 'Pending';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const techniciansOnly = users.filter((u) => u.role === 'technician');

  const technicianUsage = requests.reduce((acc, r) => {
    if (r.technician) acc[r.technician] = (acc[r.technician] || 0) + 1;
    return acc;
  }, {});

  const topTechnicians = Object.entries(technicianUsage)
    .map(([id, count]) => {
      const tech = techniciansOnly.find((t) => t._id === id);
      return tech ? { tech, count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const categoryCounts = requests.reduce((acc, r) => {
    const key = r.maintenanceCategory || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const maxPriorityValue = Math.max(1, ...Object.values(priorityCounts));
  const maxStatusValue = Math.max(1, ...Object.values(statusCounts));
  const maxCategoryValue = Math.max(1, ...Object.values(categoryCounts));

  const now = new Date();
  const monthBuckets = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'short' });
    monthBuckets.push({ key, label });
  }

  const monthlyTrend = monthBuckets.map((bucket) => {
    const count = requests.filter((r) => {
      if (!r.createdAt) return false;
      const created = new Date(r.createdAt);
      const createdKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      return createdKey === bucket.key;
    }).length;
    return { ...bucket, count };
  });

  const maxMonthlyValue = Math.max(1, ...monthlyTrend.map((m) => m.count));

  const apartmentMap = {};
  requests.forEach((r) => {
    const label = `Flat ${r.flatNumber || '-'}, ${r.block || 'No block'}`;
    if (!apartmentMap[label]) apartmentMap[label] = { count: 0, categories: {} };
    apartmentMap[label].count += 1;
    const cat = r.maintenanceCategory || 'Other';
    apartmentMap[label].categories[cat] = (apartmentMap[label].categories[cat] || 0) + 1;
  });
  const topApartments = Object.entries(apartmentMap)
    .map(([label, data]) => ({
      label,
      count: data.count,
      topCategory: Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const techResolutionMap = {};
  requests.forEach((r) => {
    if (r.status === 'Completed' && r.technician && r.createdAt) {
      const resolvedAt = r.completedAt || r.updatedAt;
      if (!resolvedAt) return;
      const durationMs = new Date(resolvedAt) - new Date(r.createdAt);
      if (durationMs > 0) {
        if (!techResolutionMap[r.technician]) techResolutionMap[r.technician] = [];
        techResolutionMap[r.technician].push(durationMs);
      }
    }
  });

  const techResolutionRows = Object.entries(techResolutionMap)
    .map(([techId, durations]) => {
      const tech = techniciansOnly.find((t) => t._id === techId);
      const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
      const minMs = Math.min(...durations);
      const maxMs = Math.max(...durations);
      return {
        techId,
        name: tech
          ? `${tech.name}${tech.technicianType ? ` (${tech.technicianType})` : ''}`
          : 'Unknown',
        count: durations.length,
        avg: fmtDuration(avgMs),
        min: fmtDuration(minMs),
        max: fmtDuration(maxMs),
        avgMs
      };
    })
    .sort((a, b) => a.avgMs - b.avgMs);

  return (
    <div className="card dashboard-card">
      <div className="card-header-row">
        <div className="card-title">Portfolio overview</div>
        <span className="chip">Live view</span>
      </div>
      {error && <p className="text-danger">{error}</p>}
      <div className="dashboard-grid">
        <div className="dashboard-metrics">
          <div className="metric-card">
            <div className="metric-label">Total requests</div>
            <div className="metric-value">{totalTasks}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Pending</div>
            <div className="metric-value">{pendingCount}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">In progress</div>
            <div className="metric-value">{inProgressCount}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Completed</div>
            <div className="metric-value">{completedCount}</div>
          </div>
        </div>
        <div className="dashboard-chart">
          <div className="section-title">By priority</div>
          <div className="bar-section">
            {['High', 'Medium', 'Low'].map((p) => {
              const value = priorityCounts[p] || 0;
              const width = (value / maxPriorityValue) * 100;
              return (
                <div className="bar-row" key={p}>
                  <span className="bar-label">{p}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${width}%` }} />
                  </div>
                  <span className="bar-count">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="dashboard-chart">
          <div className="section-title">By status</div>
          <div className="bar-section">
            {Object.entries(statusCounts).map(([status, value]) => {
              const width = (value / maxStatusValue) * 100;
              return (
                <div className="bar-row" key={status}>
                  <span className="bar-label">{status}</span>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill-secondary" style={{ width: `${width}%` }} />
                  </div>
                  <span className="bar-count">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="dashboard-chart">
          <div className="section-title">Top technicians</div>
          {topTechnicians.length === 0 && (
            <div className="text-muted text-sm">No assignments yet.</div>
          )}
          {topTechnicians.map(({ tech, count }) => (
            <div className="bar-row" key={tech._id}>
              <span className="bar-label">
                {tech.name}
                {tech.technicianType ? ` (${tech.technicianType})` : ''}
              </span>
              <div className="bar-track">
                <div
                  className="bar-fill bar-fill-accent"
                  style={{ width: `${(count / (topTechnicians[0]?.count || 1)) * 100}%` }}
                />
              </div>
              <span className="bar-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="dashboard-row-50">
        <div className="dashboard-chart dashboard-half">
          <div className="section-title">Live trend (6 months)</div>
          <div className="line-chart">
            <svg viewBox="0 0 100 40" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="url(#adminLineGradient)"
                strokeWidth="1.8"
                points={monthlyTrend
                  .map((m, idx) => {
                    const x =
                      monthlyTrend.length === 1 ? 50 : (idx / (monthlyTrend.length - 1)) * 100;
                    const y = 35 - (m.count / maxMonthlyValue) * 28;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
              {monthlyTrend.map((m, idx) => {
                const x =
                  monthlyTrend.length === 1 ? 50 : (idx / (monthlyTrend.length - 1)) * 100;
                const y = 35 - (m.count / maxMonthlyValue) * 28;
                return <circle key={m.key} cx={x} cy={y} r={1.7} className="line-point" />;
              })}
              <defs>
                <linearGradient id="adminLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
            <div className="line-chart-labels">
              {monthlyTrend.map((m) => (
                <span key={m.key}>{m.label}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="dashboard-chart dashboard-half">
          <div className="section-title">By category (overall)</div>
          <div className="bar-section">
            {Object.entries(categoryCounts).map(([category, value]) => {
              const width = (value / maxCategoryValue) * 100;
              return (
                <div className="bar-row" key={category}>
                  <span className="bar-label">{category}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-fill-secondary"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="bar-count">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="dashboard-row-50 dashboard-row-50--mt">
        <div className="dashboard-chart dashboard-half">
          <div className="section-title">Top apartments by requests</div>
          {topApartments.length === 0 ? (
            <div className="text-muted text-sm">No request data yet.</div>
          ) : (
            <div className="stocks-table-wrap stocks-table-wrap--mt">
              <table className="stocks-table">
                <thead>
                  <tr>
                    <th>Apartment</th>
                    <th>Requests</th>
                    <th>Top Category</th>
                  </tr>
                </thead>
                <tbody>
                  {topApartments.map((apt) => (
                    <tr key={apt.label}>
                      <td>{apt.label}</td>
                      <td>{apt.count}</td>
                      <td>{apt.topCategory}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="dashboard-chart dashboard-half">
          <div className="section-title">Technician resolution times</div>
          {techResolutionRows.length === 0 ? (
            <div className="text-muted text-sm">
              No completed requests with resolution data yet.
            </div>
          ) : (
            <div className="stocks-table-wrap stocks-table-wrap--mt">
              <table className="stocks-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Completed</th>
                    <th>Avg Time</th>
                    <th>Fastest</th>
                    <th>Slowest</th>
                  </tr>
                </thead>
                <tbody>
                  {techResolutionRows.map((row) => (
                    <tr key={row.techId}>
                      <td>{row.name}</td>
                      <td>{row.count}</td>
                      <td><strong>{row.avg}</strong></td>
                      <td className="td-time-fastest">{row.min}</td>
                      <td className="td-time-slowest">{row.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
