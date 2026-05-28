import React, { useState, useEffect } from 'react';
import 'antd/dist/reset.css';
import { Row, Col, Tabs, notification } from 'antd';
import { useCompanyLogo } from './hooks';
import { API_BASE, parseApiResponse } from './api';
import Login from './components/Login';
import Requests from './components/Requests';
import Dashboard from './components/Dashboard';
import Stocks from './components/Stocks';
import ItemRequests from './components/ItemRequests';
import RequestDrawer from './components/RequestDrawer';
import MediaModal from './components/MediaModal';
import AttendanceModal from './components/AttendanceModal';
import './styles/global.scss';
import './styles/shared.scss';
import './styles/drawer.scss';

function SupervisorDashboard({ onLogout }) {
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [assignment, setAssignment] = useState({});
  const [drawerRequestId, setDrawerRequestId] = useState(null);
  const [skillFilters, setSkillFilters] = useState({
    ac: false,
    electrician: false,
    plumber: false,
    carpenter: false,
    painter: false,
    other: false
  });
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('requests');
  const [stocksLoading, setStocksLoading] = useState(false);
  const [stocksError, setStocksError] = useState('');
  const [stockEntries, setStockEntries] = useState([]);
  const [stockRequests, setStockRequests] = useState([]);
  const [stockRequestsError, setStockRequestsError] = useState('');
  const [viewMediaRequest, setViewMediaRequest] = useState(null);
  const [techDropdownOpen, setTechDropdownOpen] = useState({});
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setTechDropdownOpen({});
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const companyLogo = useCompanyLogo();
  const token = localStorage.getItem('supervisor_token');

  const fetchAssigned = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/requests/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to load tasks'); return; }
      setRequests(data);
    } catch { setError('Network error'); }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/technicians`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTechnicians(data);
    } catch { /* ignore */ }
  };

  const fetchStockEntries = async () => {
    setStocksError('');
    setStocksLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stocks/entries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) { setStocksError(data.message || 'Failed to load stock entries'); return; }
      setStockEntries(Array.isArray(data) ? data : []);
    } catch { setStocksError('Network error while loading stock entries'); }
    finally { setStocksLoading(false); }
  };

  const fetchStockRequests = async () => {
    setStockRequestsError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) { setStockRequestsError(data.message || 'Failed to load item requests'); return; }
      setStockRequests(Array.isArray(data) ? data : []);
    } catch { setStockRequestsError('Network error while loading item requests'); }
  };

  const supervisorReviewRequest = async (requestId, action) => {
    setStockRequestsError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests/${requestId}/supervisor-approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) { setStockRequestsError(data.message || 'Failed to update request'); return; }
      setStockRequests((prev) =>
        prev.map((r) =>
          r._id === requestId
            ? { ...r, status: action === 'approve' ? 'SupervisorApproved' : 'SupervisorRejected' }
            : r
        )
      );
      notification.success({
        message: action === 'approve' ? 'Request Approved' : 'Request Rejected',
        description: action === 'approve' ? 'Request forwarded to procurement.' : 'Request has been rejected.',
        placement: 'topRight',
        duration: 3
      });
    } catch { setStockRequestsError('Network error'); }
  };

  useEffect(() => {
    if (token) { fetchAssigned(); fetchTechnicians(); fetchStockEntries(); fetchStockRequests(); }
  }, []);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => { fetchStockRequests(); fetchStockEntries(); }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const technicianUsage = requests.reduce((acc, r) => {
    if (r.technician) acc[r.technician] = (acc[r.technician] || 0) + 1;
    return acc;
  }, {});

  const tabItems = [
    {
      key: 'requests',
      label: 'Requests',
      children: (
        <Requests
          requests={requests}
          technicians={technicians}
          token={token}
          error={error}
          onRefresh={fetchAssigned}
          setDrawerRequestId={setDrawerRequestId}
        />
      )
    },
    {
      key: 'dashboard',
      label: 'Dashboard',
      children: <Dashboard requests={requests} technicians={technicians} />
    },
    {
      key: 'stocks',
      label: 'Stocks',
      children: <Stocks stockEntries={stockEntries} stocksLoading={stocksLoading} stocksError={stocksError} />
    },
    {
      key: 'item-requests',
      label: 'Item Requests',
      children: (
        <ItemRequests
          stockRequests={stockRequests}
          stockRequestsError={stockRequestsError}
          onApprove={(id) => supervisorReviewRequest(id, 'approve')}
          onReject={(id) => supervisorReviewRequest(id, 'reject')}
          setViewMediaRequest={setViewMediaRequest}
        />
      )
    }
  ];

  return (
    <div className="app-shell">
      <div className="app-card">
        <Row justify="space-between" align="middle" className="app-card-header">
          <Col>
            <div className="header-logo-group">
              {companyLogo && <img src={companyLogo} alt="Company logo" />}
              <div>
                <div className="app-title">Supervisor Portal</div>
                <div className="app-subtitle">Work through assigned maintenance tasks</div>
              </div>
            </div>
          </Col>
          <Col>
            <div className="header-actions">
              <button className="btn-outline btn-small" onClick={() => setShowAttendanceModal(true)}>
                Attendance
              </button>
              <button
                className="btn-outline btn-small"
                onClick={() => { localStorage.removeItem('supervisor_token'); onLogout(); }}
              >
                Logout
              </button>
            </div>
          </Col>
        </Row>

        <div className="app-main">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              if (key === 'item-requests') fetchStockRequests();
            }}
            items={tabItems}
          />
        </div>
      </div>

      {viewMediaRequest && (
        <MediaModal request={viewMediaRequest} onClose={() => setViewMediaRequest(null)} />
      )}

      {drawerRequestId && (
        <RequestDrawer
          requestId={drawerRequestId}
          requests={requests}
          technicians={technicians}
          technicianUsage={technicianUsage}
          assignment={assignment}
          setAssignment={setAssignment}
          skillFilters={skillFilters}
          setSkillFilters={setSkillFilters}
          techDropdownOpen={techDropdownOpen}
          setTechDropdownOpen={setTechDropdownOpen}
          token={token}
          onClose={() => setDrawerRequestId(null)}
          onAssigned={fetchAssigned}
        />
      )}

      <AttendanceModal
        open={showAttendanceModal}
        token={token}
        onClose={() => setShowAttendanceModal(false)}
      />
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('supervisor_token'));
  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <SupervisorDashboard onLogout={() => setLoggedIn(false)} />;
}
