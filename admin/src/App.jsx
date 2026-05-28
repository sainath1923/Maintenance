import React, { useState } from 'react';
import 'antd/dist/reset.css';
import { Row, Col, Tabs } from 'antd';
import { useCompanyLogo } from './hooks';
import Login from './components/Login';
import CompanyProfile from './components/CompanyProfile';
import AddAccess from './components/AddAccess';
import Team from './components/Team';
import Dashboard from './components/Dashboard';
import Requests from './components/Requests';
import Attendance from './components/Attendance';

function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('company');
  const companyLogo = useCompanyLogo();
  const token = localStorage.getItem('admin_token');

  return (
    <div className="app-shell">
      <div className="app-card">
        <Row justify="space-between" align="middle" className="app-card-header">
          <Col>
            <div className="header-logo-group">
              {companyLogo && (
                <img
                  src={companyLogo}
                  alt="Company logo"
                  className="header-logo-img"
                />
              )}
              <div>
                <div className="app-title">Admin Portal</div>
                <div className="app-subtitle">User access and maintenance overview</div>
              </div>
            </div>
          </Col>
          <Col>
            <button
              className="btn-outline btn-small"
              onClick={() => {
                localStorage.removeItem('admin_token');
                onLogout();
              }}
            >
              Logout
            </button>
          </Col>
        </Row>

        <div className="app-main">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'dashboard', label: 'Dashboard', children: <Dashboard token={token} /> },
              { key: 'company', label: 'Company profile', children: <CompanyProfile token={token} /> },
              { key: 'add', label: 'Add access', children: <AddAccess token={token} /> },
              { key: 'team', label: 'Team', children: <Team token={token} /> },
              { key: 'requests', label: 'Requests', children: <Requests token={token} /> },
              { key: 'attendance', label: 'Attendance', children: <Attendance token={token} /> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('admin_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <AdminDashboard onLogout={() => setLoggedIn(false)} />;
}
