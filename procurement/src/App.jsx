import React, { useState } from 'react';
import { Row, Col, Tabs } from 'antd';
import 'antd/dist/reset.css';
import { useCompanyLogo } from './hooks';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ItemRequests from './components/ItemRequests';
import AttendanceModal from './components/AttendanceModal';
import NotificationsBell from './components/NotificationsBell';

function ProcurementDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAttendance, setShowAttendance] = useState(false);
  const companyLogo = useCompanyLogo();
  const token = localStorage.getItem('procurement_token');

  return (
    <div className="app-shell">
      <div className="app-card">
        <Row justify="space-between" align="middle" className="app-card-header">
          <Col>
            <div className="header-logo-group">
              {companyLogo && (
                <img src={companyLogo} alt="Company logo" className="header-logo-img" />
              )}
              <div>
                <div className="app-title">Procurement Portal</div>
                <div className="app-subtitle">Add stock items and process technician requests</div>
              </div>
            </div>
          </Col>
          <Col>
            <div className="header-actions">
              <NotificationsBell token={token} />
              <button className="btn-outline btn-small" onClick={() => setShowAttendance(true)}>
                Attendance
              </button>
              <button
                className="btn-outline btn-small"
                onClick={() => {
                  localStorage.removeItem('procurement_token');
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
              { key: 'dashboard', label: 'Dashboard', children: <Dashboard token={token} /> },
              { key: 'requests', label: 'Item Requests', children: <ItemRequests token={token} /> },
            ]}
          />
        </div>
      </div>

      <AttendanceModal
        token={token}
        open={showAttendance}
        onClose={() => setShowAttendance(false)}
      />
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('procurement_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <ProcurementDashboard onLogout={() => setLoggedIn(false)} />;
}
