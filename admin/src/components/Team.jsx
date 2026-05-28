import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd';
import API_BASE from '../api';
import '../styles/team.scss';

export default function Team({ token }) {
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [error, setError] = useState('');

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

  const toggleActive = async (user) => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/users/${user._id}/active`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users
    .filter((u) => userRoleFilter === 'all' || u.role === userRoleFilter)
    .filter((u) => {
      const q = userSearch.trim().toLowerCase();
      if (!q) return true;
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });

  return (
    <div className="card dashboard-card">
      <div className="card-header-row">
        <div className="card-title">Team</div>
        <span className="chip">{users.length} users</span>
      </div>
      {error && <p className="text-danger">{error}</p>}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12}>
          <div className="field">
            <label>Role</label>
            <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
              <option value="all">All roles</option>
              <option value="tenant">Tenant</option>
              <option value="supervisor">Supervisor</option>
              <option value="technician">Technician</option>
              <option value="delivery">Delivery</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="field">
            <label>Search</label>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Name or email"
            />
          </div>
        </Col>
      </Row>
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        {filteredUsers.map((u) => (
          <Col key={u._id} xs={24} sm={12} lg={8} xl={6}>
            <div className="metric-card team-card">
              <div className="user-card-header">
                <div>
                  <strong>{u.name}</strong>{' '}
                  <span className="user-email">({u.email})</span>
                </div>
                <button
                  className={
                    'btn-small status-toggle-button ' + (u.isActive ? 'deactivate' : 'activate')
                  }
                  onClick={() => toggleActive(u)}
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
              <div className="text-muted role-label">
                Role: {u.role}
                {u.role === 'technician' && u.technicianType ? ` (${u.technicianType})` : ''}
              </div>
              <div className="text-muted">Mobile: {u.phone || '-'}</div>
              <div className="text-muted">Status: {u.isActive ? 'Active' : 'Inactive'}</div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}
