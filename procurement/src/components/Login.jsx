import React, { useState } from 'react';
import { Button, Form, Input } from 'antd';
import API_BASE from '../api';
import { useCompanyLogo } from '../hooks';

export default function Login({ onLoggedIn }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const companyLogo = useCompanyLogo();

  const handleSubmit = async (values) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Login failed');
        return;
      }
      if (data.role !== 'procurement') {
        setError('This portal is only for procurement users');
        return;
      }
      localStorage.setItem('procurement_token', data.token);
      onLoggedIn();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
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
              <div className="app-title">Procurement Portal</div>
              <div className="app-subtitle">Add stock items and process technician requests</div>
            </div>
          </div>
          <div className="app-badge">Procurement</div>
        </div>
        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Sign in</div>
              <span className="chip">Procurement</span>
            </div>
            <Form
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ email: 'procurement1@example.com', password: 'Procurement@123' }}
            >
              <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email is required' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Password is required' }]}>
                <Input.Password />
              </Form.Item>
              {error && <p className="text-danger">{error}</p>}
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Continue
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
