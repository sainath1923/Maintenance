import { useState, useEffect, useCallback, useRef } from 'react';
import { Drawer, notification as antdNotif } from 'antd';
import API_BASE from '../api';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export default function NotificationsBell({ token }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const prevRef = useRef([]);
  const pollRef = useRef(null);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      if (!silent) {
        const prev = prevRef.current;
        const newUnread = data.filter((n) => !n.read && !prev.find((p) => p._id === n._id));
        if (newUnread.length > 0 && prev.length > 0) {
          antdNotif.info({
            message: 'New notification from Admin',
            description: newUnread[0].message.slice(0, 80) + (newUnread[0].message.length > 80 ? '…' : ''),
            placement: 'topRight',
            duration: 5,
          });
        }
      }
      prevRef.current = data;
      setNotifications(data);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    fetchNotifications(true);
    pollRef.current = setInterval(() => fetchNotifications(false), 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      prevRef.current = prevRef.current.map((n) => ({ ...n, read: true }));
    } catch { /* ignore */ }
  };

  const handleOpen = () => {
    setOpen(true);
    markAllRead();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <button
        className="btn-outline btn-small"
        onClick={handleOpen}
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5 }}
        title="Notifications"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        Notifications
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: '#ef4444', color: '#fff',
            borderRadius: 999, fontSize: 10, fontWeight: 700,
            minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <Drawer
        title="Notifications"
        placement="right"
        width={360}
        open={open}
        onClose={() => setOpen(false)}
        styles={{ body: { padding: 16 } }}
      >
        {notifications.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 14, paddingTop: 16, textAlign: 'center' }}>
            No notifications yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.map((n) => (
              <div
                key={n._id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: n.read ? '1px solid rgba(148,163,184,0.25)' : '1px solid rgba(37,99,235,0.4)',
                  background: n.read ? '#f9fafb' : '#eff6ff',
                }}
              >
                {!n.read && (
                  <span style={{
                    display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                    background: '#2563eb', marginRight: 6, verticalAlign: 'middle',
                  }} />
                )}
                <span style={{ fontSize: 14, color: '#111827' }}>{n.message}</span>
                <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{n.senderName || 'Admin'}</span>
                  <span>{timeAgo(n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
