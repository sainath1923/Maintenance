import React, { useState } from 'react';
import 'antd/dist/reset.css';
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
        <div className="app-card-header">
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
          <button
            className="btn-outline btn-small"
            onClick={() => {
              localStorage.removeItem('admin_token');
              onLogout();
            }}
          >
            Logout
          </button>
        </div>

        <div className="app-main">
          <div className="tabs-row">
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'company', label: 'Company profile' },
              { key: 'add', label: 'Add access' },
              { key: 'team', label: 'Team' },
              { key: 'requests', label: 'Requests' },
              { key: 'attendance', label: 'Attendance' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={'tab-button' + (activeTab === key ? ' active' : '')}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {activeTab === 'dashboard' && <Dashboard token={token} />}
          {activeTab === 'company' && <CompanyProfile token={token} />}
          {activeTab === 'add' && <AddAccess token={token} />}
          {activeTab === 'team' && <Team token={token} />}
          {activeTab === 'requests' && <Requests token={token} />}
          {activeTab === 'attendance' && <Attendance token={token} />}
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
