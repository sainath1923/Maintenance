import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area,
} from 'recharts';
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
      <Row gutter={[12, 12]}>
        <Col xs={12} lg={6}>
          <div className="metric-card">
            <div className="metric-label">Total requests</div>
            <div className="metric-value">{totalTasks}</div>
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="metric-card">
            <div className="metric-label">Pending</div>
            <div className="metric-value">{pendingCount}</div>
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="metric-card">
            <div className="metric-label">In progress</div>
            <div className="metric-value">{inProgressCount}</div>
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="metric-card">
            <div className="metric-label">Completed</div>
            <div className="metric-value">{completedCount}</div>
          </div>
        </Col>
      </Row>
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={8}>
          <div className="dashboard-chart">
            <div className="section-title">By priority</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart
                data={['High', 'Medium', 'Low'].map((p) => ({ name: p, value: priorityCounts[p] || 0 }))}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [v, 'Requests']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {['High', 'Medium', 'Low'].map((p) => (
                    <Cell key={p} fill={p === 'High' ? '#ef4444' : p === 'Medium' ? '#f59e0b' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="dashboard-chart">
            <div className="section-title">By status</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart
                data={Object.entries(statusCounts).map(([name, value]) => ({ name, value }))}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [v, 'Requests']} />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="dashboard-chart">
            <div className="section-title">Top technicians</div>
            {topTechnicians.length === 0 ? (
              <div className="text-muted text-sm">No assignments yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(80, topTechnicians.length * 38)}>
                <BarChart
                  data={topTechnicians.map(({ tech, count }) => ({
                    name: tech.name,
                    type: tech.technicianType || '',
                    value: count,
                  }))}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
                >
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v, 'Assignments']} />
                  <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
      </Row>
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={12}>
          <div className="dashboard-chart">
            <div className="section-title">Live trend (6 months)</div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart
                data={monthlyTrend.map((m) => ({ name: m.label, count: m.count }))}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [v, 'Requests']} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div className="dashboard-chart">
            <div className="section-title">By category (overall)</div>
            {Object.keys(categoryCounts).length === 0 ? (
              <div className="text-muted text-sm">No request data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={Object.entries(categoryCounts).map(([name, value]) => ({ name, value }))}
                  margin={{ top: 8, right: 8, left: -20, bottom: 40 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [v, 'Requests']} />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
      </Row>
      <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <div className="dashboard-chart">
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
        </Col>
        <Col xs={24} md={12}>
          <div className="dashboard-chart">
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
        </Col>
      </Row>
    </div>
  );
}
