import React, { useState } from 'react';
import 'antd/dist/reset.css';
import { Row, Col, Tabs } from 'antd';
import { useCompanyLogo, parseJwt } from './hooks';
import Login from './components/Login';
import Tickets from './components/Tickets';
import Stocks from './components/Stocks';
import RaisedRequests from './components/RaisedRequests';
import AttendanceModal from './components/AttendanceModal';

function TechnicianDashboard({ onLogout }) {
  const [showAttendance, setShowAttendance] = useState(false);
  const companyLogo = useCompanyLogo();
  const token = localStorage.getItem('technician_token');
  const currentUser = parseJwt(token);

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
                <div className="app-title">Technician Portal</div>
                <div className="app-subtitle">Work on assigned tickets</div>
              </div>
            </div>
          </Col>
          <Col>
            <div className="header-actions">
              {currentUser?.name && (
                <span className="app-badge">{currentUser.name}</span>
              )}
              <button
                className="btn-outline btn-small"
                onClick={() => setShowAttendance(true)}
              >
                Attendance
              </button>
              <button
                className="btn-outline btn-small"
                onClick={() => {
                  localStorage.removeItem('technician_token');
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
            items={[
              { key: 'tickets', label: 'My Tickets', children: <Tickets token={token} /> },
              { key: 'stocks', label: 'Stocks', children: <Stocks token={token} /> },
              { key: 'raised', label: 'Requests Raised', children: <RaisedRequests token={token} /> },
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
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('technician_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <TechnicianDashboard onLogout={() => setLoggedIn(false)} />;
}
