import React, { useState } from 'react';
import API_BASE from '../api';
import { useCompanyLogo } from '../hooks';

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('tech1@example.com');
  const [password, setPassword] = useState('Technician@123');
  const [error, setError] = useState('');

  const companyLogo = useCompanyLogo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Login failed'); return; }
      if (data.role !== 'technician') { setError('This portal is only for technicians'); return; }
      localStorage.setItem('technician_token', data.token);
      onLoggedIn();
    } catch {
      setError('Network error');
    }
  };

  return (
    <div className="app-shell">
      <div className="app-card">
        <div className="app-card-header">
          <div className="header-logo-group">
            {companyLogo && (
              <img src={companyLogo} alt="Company logo" className="header-logo-img" />
            )}
            <div>
              <div className="app-title">Technician Portal</div>
              <div className="app-subtitle">Sign in to work on assigned tickets</div>
            </div>
          </div>
          <div className="app-badge">Field Operations</div>
        </div>
        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Sign in</div>
              <span className="chip">Technician</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-danger">{error}</p>}
              <button className="btn-primary" type="submit">Continue</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
