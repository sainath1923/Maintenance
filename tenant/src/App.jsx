import React, { useState, useEffect } from 'react';
import 'antd/dist/reset.css';
import { Row, Col, Tabs } from 'antd';
import { useCompanyLogo } from './hooks';
import API_BASE from './api';
import Login from './components/Login';
import RaiseRequest from './components/RaiseRequest';
import ViewRequests from './components/ViewRequests';
import RatingModal from './components/RatingModal';
import './styles/global.scss';
import './styles/shared.scss';

const RATING_URL =
  'https://www.google.com/search?q=bhr+properties&oq=bhr+properties&gs_lcrp=EgZjaHJvbWUqBwgAEAAYgAQyBwgAEAAYgAQyBwgBEAAYgAQyCAgCEAAYFhgeMggIAxAAGBYYHjIICAQQABgWGB4yCAgFEAAYFhgeMggIBhAAGBYYHjIICAcQABgWGB4yCAgIEAAYFhgeMg0ICRAAGIYDGIAEGIoF0gEINDc0OWowajeoAgCwAgA&sourceid=chrome&ie=UTF-8#sv=CAwSrwIKBmxjbF9wdhI5CgNwdnESMkNnMHZaeTh4TVdKaWQzZDBkbTVpSWhRS0RtSm9jaUJ3Y205d1pYSjBhV1Z6RUFJWUF3EqwBCgNscWkSpAFDZzVpYUhJZ2NISnZjR1Z5ZEdsbGMwaUsxZk85cTZxQWdBaGFGaEFBRUFFWUFTSU9ZbWh5SUhCeWIzQmxjblJwWlhPU0FSbHlaV0ZzWDJWemRHRjBaVjl5Wlc1MFlXeGZZV2RsYm1ONW1nRWpRMmhhUkZOVmFFNU1Semx1VXpCV1NsUXdSbTVUVlZKRFdqTldSVk5yZUZKRlFVWDZBUVFJQUJBNRISCgN0YnMSC2xyZjohM3NJQUU9EhMKAXESDmJociBwcm9wZXJ0aWVzGhJsb2NhbC1wbGFjZS12aWV3ZXIYCiD82a_kDA';

function TenantDashboard({ onLogout }) {
  const [requests, setRequests] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [activeTab, setActiveTab] = useState('raise');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const companyLogo = useCompanyLogo();
  const token = localStorage.getItem('tenant_token');

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/requests/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) return;
      setRequests(data);

      const shownIds = JSON.parse(sessionStorage.getItem('rated_requests') || '[]');
      const newlyCompleted = data.filter(
        (r) => r.status === 'Completed' && !shownIds.includes(r._id)
      );
      if (newlyCompleted.length > 0) {
        sessionStorage.setItem(
          'rated_requests',
          JSON.stringify([...shownIds, ...newlyCompleted.map((r) => r._id)])
        );
        setShowRatingModal(true);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchRequests();
    const id = setInterval(fetchRequests, 15000);
    return () => clearInterval(id);
  }, [token]);

  return (
    <div className="app-shell">
      <div className="app-card">
        <Row justify="space-between" align="middle" className="app-card-header">
          <Col>
            <div className="header-logo-group">
              {companyLogo && <img src={companyLogo} alt="Company logo" />}
              <div>
                <div className="app-title">Tenant Portal</div>
                <div className="app-subtitle">Create new requests and review your history</div>
              </div>
            </div>
          </Col>
          <Col>
            <div className="header-actions">
              {notificationCount > 0 && (
                <button
                  type="button"
                  className="btn-outline btn-small"
                  onClick={() => setNotificationCount(0)}
                >
                  ?? <span className="chip">{notificationCount}</span>
                </button>
              )}
              <button
                type="button"
                className="btn-outline btn-small"
                onClick={() => {
                  localStorage.removeItem('tenant_token');
                  onLogout();
                }}
              >
                Logout
              </button>
            </div>
          </Col>
        </Row>

        <div className="app-main">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'raise',
                label: 'Raise request',
                children: (
                  <RaiseRequest
                    token={token}
                    onSubmitted={() => {
                      fetchRequests();
                      setActiveTab('view');
                    }}
                  />
                ),
              },
              {
                key: 'view',
                label: 'View requests',
                children: <ViewRequests requests={requests} ratingUrl={RATING_URL} />,
              },
            ]}
          />
        </div>
      </div>

      <RatingModal
        open={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        ratingUrl={RATING_URL}
      />
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('tenant_token'));
  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <TenantDashboard onLogout={() => setLoggedIn(false)} />;
}
