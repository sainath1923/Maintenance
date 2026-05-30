import { useState, useEffect } from 'react';
import { useCompanyLogo, useBuildingName } from '../hooks';
import API_BASE from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const logo = useCompanyLogo();
  const buildingName = useBuildingName();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Login failed'); return; }
      if (data.role !== 'stores') { setError('Access denied: Stores accounts only'); return; }
      localStorage.setItem('stores_token', data.token);
      onLogin(data.token);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="app-card" style={{ maxWidth: 420 }}>
        <div className="app-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          {logo && <img src={logo} alt="Logo" className="header-logo-img" />}
          {buildingName && <div className="header-building-name">{buildingName}</div>}
          <div className="app-badge">Stores</div>
          <div className="app-title">Stores Console</div>
          <div className="app-subtitle">Manage stock and process technician requests</div>
        </div>
        <div className="app-main">
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && <div className="text-danger">{error}</div>}
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
