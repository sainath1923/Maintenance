import React, { useState } from 'react';
import { Row, Col } from 'antd';
import { useCompanyLogo } from '../hooks';
import API_BASE from '../api';

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('tenant1@example.com');
  const [password, setPassword] = useState('Tenant@123');
  const [error, setError] = useState('');
  const companyLogo = useCompanyLogo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Login failed');
        return;
      }
      if (data.role !== 'tenant') {
        setError('This portal is only for tenants');
        return;
      }
      localStorage.setItem('tenant_token', data.token);
      onLoggedIn();
    } catch {
      setError('Network error');
    }
  };

  return (
    <div className="app-shell">
      <div className="app-card">
        <Row justify="space-between" align="middle" className="app-card-header">
          <Col>
            <div className="header-logo-group">
              {companyLogo && <img src={companyLogo} alt="Company logo" />}
              <div>
                <div className="app-title">Tenant Portal</div>
                <div className="app-subtitle">Login to raise and track maintenance requests</div>
              </div>
            </div>
          </Col>
          <Col>
            <div className="app-badge">Residential Maintenance</div>
          </Col>
        </Row>

        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Sign in</div>
              <span className="chip">Tenant</span>
            </div>
            <form onSubmit={handleSubmit}>
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <div className="field">
                    <label>Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className="field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </Col>
                {error && (
                  <Col xs={24}>
                    <p className="text-danger">{error}</p>
                  </Col>
                )}
                <Col xs={24} className="submit-col">
                  <button className="btn-primary" type="submit">
                    Continue
                  </button>
                </Col>
              </Row>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
