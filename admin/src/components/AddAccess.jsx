import React, { useState } from 'react';
import { notification } from 'antd';
import API_BASE from '../api';

export default function AddAccess({ token }) {
  const [newUserRole, setNewUserRole] = useState('supervisor');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserTechnicianType, setNewUserTechnicianType] = useState('Plumber');
  const [error, setError] = useState('');

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          role: newUserRole,
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          phone: newUserPhone,
          technicianType: newUserRole === 'technician' ? newUserTechnicianType : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create user');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserPhone('');
      setNewUserTechnicianType('Plumber');
      notification.success({
        message: 'User Created',
        description: 'New user created successfully!',
        placement: 'topRight',
        duration: 3
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      {error && <p className="text-danger">{error}</p>}
      <form onSubmit={createUser} className="two-column-form">
        <div className="field">
          <label>Role</label>
          <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
            <option value="tenant">Tenant</option>
            <option value="supervisor">Supervisor</option>
            <option value="technician">Technician</option>
            <option value="delivery">Delivery</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {newUserRole === 'technician' && (
          <div className="field">
            <label>Technician type</label>
            <select
              value={newUserTechnicianType}
              onChange={(e) => setNewUserTechnicianType(e.target.value)}
            >
              <option value="Plumber">Plumber</option>
              <option value="Electrician">Electrician</option>
              <option value="Carpenter">Carpenter</option>
              <option value="Painter">Painter</option>
              <option value="Cleaner">Cleaner</option>
              <option value="AC Technician">AC Technician</option>
            </select>
          </div>
        )}
        <div className="field">
          <label>Name</label>
          <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} />
        </div>
        <button className="btn-primary" type="submit">
          Create user
        </button>
      </form>
    </div>
  );
}
