import React, { useState, useEffect, useRef } from 'react';
import { notification } from 'antd';
import { QRCodeCanvas } from 'qrcode.react';
import API_BASE from '../api';
import '../styles/company-profile.scss';

export default function CompanyProfile({ token }) {
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');
  const [buildingUrl, setBuildingUrl] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showBuildingQR, setShowBuildingQR] = useState(true);
  const [showMaintenanceQR, setShowMaintenanceQR] = useState(true);
  const [error, setError] = useState('');

  const buildingQrRef = useRef(null);
  const maintenanceQrRef = useRef(null);

  const loadCompanyProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/company-profile?cb=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load company profile');
      setCompanyLogo(data.logoUrl || '');
      setCompanyName(data.name || '');
      setBuildingName(data.buildingName || '');
      setBuildingAddress(data.buildingAddress || '');
      setBuildingUrl(data.buildingUrl || '');
      if (data.buildingUrl) setProfileSaved(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveCompanyProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/company-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          logoUrl: companyLogo,
          name: companyName,
          buildingName,
          buildingAddress,
          buildingUrl
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save company profile');
      setProfileSaved(true);
      notification.success({
        message: 'Profile Saved',
        description: 'Company profile saved successfully!',
        placement: 'topRight',
        duration: 3
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-title">Company profile</div>
      </div>
      {(companyName || buildingName || buildingAddress) && (
        <div className="app-subtitle company-profile-subtitle">
          {companyName}
          {buildingName
            ? ` · ${buildingName}`
            : buildingAddress
            ? ` · ${buildingAddress}`
            : ''}
        </div>
      )}
      {error && <p className="text-danger">{error}</p>}
      <form className="two-column-form" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label>Company logo</label>
          <input
            type="file"
            accept="image/*"
            disabled={!isEditingProfile}
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  setCompanyLogo(reader.result);
                }
              };
              reader.readAsDataURL(file);
            }}
          />
        </div>
        <div className="field">
          <label>Company name</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company name"
            disabled={!isEditingProfile}
          />
        </div>
        <div className="field">
          <label>Building name</label>
          <input
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            placeholder="Building name"
            disabled={!isEditingProfile}
          />
        </div>
        <div className="field">
          <label>Building address</label>
          <input
            value={buildingAddress}
            onChange={(e) => setBuildingAddress(e.target.value)}
            placeholder="Building address"
            disabled={!isEditingProfile}
          />
        </div>
        <div className="field">
          <label>Building address URL (Google Maps)</label>
          <input
            value={buildingUrl}
            onChange={(e) => setBuildingUrl(e.target.value)}
            placeholder="https://maps.google.com/..."
            disabled={!isEditingProfile}
          />
        </div>
        <div className="profile-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              if (!isEditingProfile) {
                setIsEditingProfile(true);
                return;
              }
              try {
                await saveCompanyProfile();
                await loadCompanyProfile();
                setIsEditingProfile(false);
              } catch {
                // error already handled
              }
            }}
          >
            {isEditingProfile ? 'Save Profile' : 'Edit Profile'}
          </button>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={() => {
            if (!buildingUrl.trim()) return;
            setShowBuildingQR(true);
            setShowMaintenanceQR(false);
          }}
          disabled={!buildingUrl.trim()}
        >
          Show Building QR code
        </button>
        <button
          type="button"
          className="btn-outline"
          className="qr-btn-right"
          onClick={() => {
            setShowMaintenanceQR(true);
            setShowBuildingQR(false);
          }}
        >
          Show Maintenance Request QR
        </button>
      </form>

      {companyLogo && (
        <div className="logo-preview-wrap">
          <img src={companyLogo} alt="Company logo" />
        </div>
      )}

      <div className="qr-section">
        {showBuildingQR && buildingUrl.trim() && (
          <div className="qr-block">
            <div className="section-title">Building location</div>
            <div className="qr-canvas-wrap">
              <QRCodeCanvas
                value={buildingUrl.trim()}
                size={160}
                includeMargin={true}
                ref={buildingQrRef}
              />
            </div>
            <div className="qr-download-row">
              <button
                type="button"
                className="btn-outline btn-small"
                onClick={() => {
                  const canvas = buildingQrRef.current?.querySelector('canvas') || buildingQrRef.current;
                  if (!canvas) return;
                  const dataUrl = canvas.toDataURL('image/png');
                  const link = document.createElement('a');
                  link.href = dataUrl;
                  link.download = 'building-qr.png';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                Download QR
              </button>
            </div>
          </div>
        )}
        {showMaintenanceQR && (
          <div className="qr-block">
            <div className="section-title">Maintenance Request</div>
            <div className="qr-canvas-wrap">
              <QRCodeCanvas
                value={'https://www.tenant.maintenance.honouredtech.com/'}
                size={160}
                includeMargin={true}
                ref={maintenanceQrRef}
              />
            </div>
            <div className="qr-download-row">
              <button
                type="button"
                className="btn-outline btn-small"
                onClick={() => {
                  const canvas = maintenanceQrRef.current?.querySelector('canvas') || maintenanceQrRef.current;
                  if (!canvas) return;
                  const dataUrl = canvas.toDataURL('image/png');
                  const link = document.createElement('a');
                  link.href = dataUrl;
                  link.download = 'maintenance-request-qr.png';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                Download QR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
