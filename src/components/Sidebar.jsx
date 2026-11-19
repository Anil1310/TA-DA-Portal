import React from 'react';
import { 
  FilePlus, 
  Table, 
  BarChart3, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Receipt,
  LogOut,
  Zap
} from 'lucide-react';

function toProperCase(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Sidebar({ activePage, setActivePage, collapsed, setCollapsed, user, onLogout, permissions, branding }) {
  const isAdmin = user?.role === 'admin';
  const isBhawna = user?.email === 'marketing@doctorsoap.com' || user?.id === 'bhawna' || String(user?.name || '').toLowerCase().includes('bhawna');
  const isBharti = !isAdmin && !isBhawna;
  const userKey = isBhawna ? 'bhawna' : isBharti ? 'bharti' : null;
  const userPerms = userKey && permissions ? permissions[userKey] : null;

  let navItems = [
    { id: 'submit', label: 'Submit TA Claim', icon: FilePlus },
    { id: 'claims', label: 'Claims Explorer', icon: Table },
    { id: 'analytics', label: 'Executive Analytics', icon: BarChart3 },
    { id: 'directory', label: 'Staff & Territories', icon: Users }
  ];

  if (!isAdmin && userPerms && userPerms.pages) {
    navItems = navItems.filter(item => userPerms.pages[item.id] !== false);
  }

  // Allow Settings tab for Admin OR users with branding management permission
  const canAccessSettings = isAdmin || Boolean(userPerms?.features?.manageBranding);

  if (isAdmin) {
    navItems.push({ id: 'automation', label: 'Sheet Automation', icon: Zap });
  }

  if (canAccessSettings) {
    navItems.push({ id: 'settings', label: isAdmin ? 'Settings & Permissions' : 'Company Branding', icon: Settings });
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <a href="#/" className="brand-logo-wrap" onClick={() => setActivePage('submit')} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div 
            className="brand-icon" 
            style={branding?.logoUrl ? { 
              width: collapsed ? '46px' : '58px',
              height: collapsed ? '46px' : '58px',
              minWidth: collapsed ? '46px' : '58px',
              minHeight: collapsed ? '46px' : '58px',
              backgroundColor: '#ffffff', 
              overflow: 'hidden', 
              padding: '4px', 
              borderRadius: '50%',
              border: '2px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)',
              flexShrink: 0
            } : { 
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              flexShrink: 0
            }}
          >
            {branding?.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt={branding.companyName || 'Logo'} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain', 
                  borderRadius: '50%',
                  transform: 'scale(1.08)'
                }} 
              />
            ) : (
              <Receipt size={22} color="#ffffff" />
            )}
          </div>
          {!collapsed && (
            <div className="brand-text-block" style={{ minWidth: 0 }}>
              <span className="brand-name" style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, display: 'block' }}>
                {branding?.companyName || 'TA-DA Portal'}
              </span>
              <span className="brand-tag" style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'block', marginTop: '2px' }} title={branding?.companySubtitle || 'Enterprise Management Information System'}>
                {branding?.companySubtitle || 'Enterprise MIS'}
              </span>
            </div>
          )}
        </a>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-section-title">Main Navigation</div>}
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="nav-icon" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Session & Logout */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Live Sheets Sync Indicator */}
            <div className="sync-badge-box">
              <div className="pulse-circle"></div>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#0f172a' }}>Google Sheets</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Live Synchronized</div>
              </div>
            </div>

            {/* User Profile & Sidebar Logout Button */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: '#2563eb',
                  flexShrink: 0
                }}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} title={user?.name}>
                    {toProperCase(user?.name || (isAdmin ? 'Admin' : 'User'))}
                  </div>
                  <div style={{
                    fontSize: '0.68rem',
                    color: '#64748b',
                    textTransform: 'capitalize'
                  }}>
                    {isAdmin ? 'Administrator' : 'Sales Member'}
                  </div>
                </div>
              </div>

              {/* Prominent Sidebar Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                title="Logout from TA Portal"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#dc2626',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background-color 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {/* Collapsed Sidebar Logout Icon Button */}
            <button
              type="button"
              onClick={onLogout}
              title={`Logout (${user?.name || 'User'})`}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef2f2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
