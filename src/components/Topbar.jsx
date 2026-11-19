import React, { useState } from 'react';
import { PlusCircle, ExternalLink, ShieldCheck, RefreshCw, LogOut, FileSpreadsheet, Menu, Database } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { isUserBhawnaHelper, isUserBhartiHelper } from '../services/currency';

function toProperCase(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const PAGE_TITLES = {
  submit: 'Submit Traveling Allowance Claim',
  claims: 'Claims Explorer & Audit Grid',
  analytics: 'Executive Analytics & Reports',
  directory: 'Sales Representatives & Territory Directory',
  settings: 'System & Google Cloud Sync Settings'
};

export function getUserSheetLinks(user, config) {
  const primaryId = config?.spreadsheetId || config?.spreadsheetIds?.[0] || '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY';
  const secondaryId = config?.secondarySpreadsheetId || config?.spreadsheetIds?.[1] || '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w';

  const bhartiSheet = {
    key: 'bharti',
    name: 'Link-1',
    shortName: 'Link-1',
    sheetTitle: 'Link-1 (TA Bill 2026:- 1)',
    id: primaryId,
    url: `https://docs.google.com/spreadsheets/d/${primaryId}/edit`,
    badgeColor: '#1d4ed8',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe'
  };

  const bhawnaSheet = {
    key: 'bhawna',
    name: 'Link-2',
    shortName: 'Link-2',
    sheetTitle: 'Link-2 (TA Bill 2026:- 2)',
    id: secondaryId,
    url: `https://docs.google.com/spreadsheets/d/${secondaryId}/edit`,
    badgeColor: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe'
  };

  if (!user) {
    return [bhartiSheet, bhawnaSheet];
  }

  // If user object has explicit sheets array from backend
  if (Array.isArray(user.sheets) && user.sheets.length > 0) {
    return user.sheets.map(s => {
      const isBhawna = s.key === 'bhawna' || s.id === secondaryId || String(s.name || '').toLowerCase().includes('bhawna');
      return {
        ...s,
        name: isBhawna ? 'Link-2' : 'Link-1',
        shortName: isBhawna ? 'Link-2' : 'Link-1',
        sheetTitle: isBhawna ? 'Link-2 (TA Bill 2026:- 2)' : 'Link-1 (TA Bill 2026:- 1)'
      };
    });
  }

  const role = String(user.role || '').toLowerCase();
  const email = String(user.email || '').toLowerCase();
  const name = String(user.name || '').toLowerCase();
  const allowed = Array.isArray(user.allowedStates) ? user.allowedStates.map(s => String(s || '').toLowerCase().trim()) : [];

  // Admin user can view and access both Google Sheets
  if (role === 'admin') {
    return [bhartiSheet, bhawnaSheet];
  }

  // Bhawna user identification: login ID/email, user name, or allowedStates
  const bhawnaTerritories = ['rajasthan', 'bihar', 'jharkhand', 'gujarat'];
  const isBhawna = email.includes('bhawna') || name.includes('bhawna') || email.includes('marketing') ||
    (allowed.length > 0 && allowed.every(s => bhawnaTerritories.includes(s)));

  if (isBhawna) {
    return [bhawnaSheet];
  }

  // Bharti user identification: login ID/email, user name, or allowedStates
  const isBharti = email.includes('bharti') || name.includes('bharti') ||
    (allowed.length > 0 && allowed.some(s => !bhawnaTerritories.includes(s)));

  if (isBharti) {
    return [bhartiSheet];
  }

  // Fallback: check territory overlap
  if (allowed.some(s => bhawnaTerritories.includes(s))) {
    return [bhawnaSheet];
  }

  return [bhartiSheet];
}

export default function Topbar({ 
  activePage, 
  setActivePage, 
  config, 
  onSyncSheet, 
  isSyncing, 
  user, 
  onLogout,
  claims = [],
  onViewClaim,
  permissions,
  sidebarCollapsed,
  onToggleSidebar
}) {
  const pageTitle = PAGE_TITLES[activePage] || 'TA Expense Portal';
  const userSheetLinks = getUserSheetLinks(user, config);
  const secondaryId = config?.secondarySpreadsheetId || config?.spreadsheetIds?.[1] || '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w';

  const isAdmin = user?.role === 'admin';
  const isBhawna = isUserBhawnaHelper(user);
  const isBharti = isUserBhartiHelper(user);
  const userKey = isBhawna ? 'bhawna' : isBharti ? 'bharti' : null;
  const userPerms = userKey && permissions ? permissions[userKey] : null;
  const canOpenSheetLink = isAdmin || (userPerms?.openSheetLink ?? userPerms?.features?.openSheetLink ?? true);

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={sidebarCollapsed ? "Expand sidebar menu" : "Collapse sidebar menu"}
            aria-label="Toggle navigation menu"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#eff6ff';
              e.currentTarget.style.borderColor = '#93c5fd';
              e.currentTarget.style.color = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#334155';
            }}
          >
            <Menu size={18} strokeWidth={2.4} />
          </button>
        )}
        <h1 className="page-title">{pageTitle}</h1>
      </div>

      <div className="topbar-right">
        {/* Notification Bell for Logged In User */}
        <NotificationDropdown
          claims={claims}
          onViewClaim={onViewClaim}
          onNavigateToClaims={() => setActivePage('claims')}
          user={user}
        />

        {/* User Login Profile Pill */}
        {user && (() => {
          const rawName = user.role === 'admin' ? (user.name || 'Admin') : (user.name || 'User');
          const properName = toProperCase(rawName);
          const rawBadge = user.role === 'admin' ? 'Admin' : (isBhawna ? 'Marketing' : (isBharti ? 'Coordinator' : 'User'));
          const properBadge = toProperCase(rawBadge);
          const subtitle = user.role === 'admin' 
            ? 'System Administrator' 
            : (isBhawna ? 'Marketing Coordinator' : (isBharti ? 'Sales Coordinator' : 'Sales Representative'));

          return (
            <div 
              className="sheet-pill" 
              title={`Logged in user: ${properName} (${subtitle})`}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0',
                padding: '6px 12px',
                borderRadius: '8px'
              }}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: user.role === 'admin' ? '#2563eb' : '#16a34a',
                display: 'inline-block'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                  {properName}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                  {subtitle}
                </span>
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.01em',
                background: user.role === 'admin' ? '#eff6ff' : '#f0fdf4',
                color: user.role === 'admin' ? '#1d4ed8' : '#166534',
                border: user.role === 'admin' ? '1px solid #bfdbfe' : '1px solid #bbf7d0'
              }}>
                {properBadge}
              </span>
            </div>
          );
        })()}

        {/* Assigned Google Sheet Link Pill(s) for the Logged-in User */}
        {canOpenSheetLink && userSheetLinks.map((sheet) => {
          const isBhawnaSheet = sheet.key === 'bhawna' || sheet.id === secondaryId || String(sheet.name || '').toLowerCase().includes('bhawna') || String(sheet.name || '').includes('2');
          const isMulti = isAdmin && userSheetLinks.length > 1;
          const displayName = isMulti ? (isBhawnaSheet ? 'DB-2' : 'DB-1') : 'DB';
          const titleText = isBhawnaSheet ? 'Database 2 (Bhawna Google Sheet)' : 'Database 1 (Bharti Google Sheet)';
          return (
            <a
              key={sheet.id + sheet.name + displayName}
              href={sheet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="sheet-pill"
              style={{
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 13px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#1e293b',
                fontSize: '0.84rem',
                fontWeight: 700,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#eff6ff';
                e.currentTarget.style.borderColor = '#93c5fd';
                e.currentTarget.style.color = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#1e293b';
              }}
              title={`Click to open ${titleText} in Google Sheets`}
            >
              <Database size={15} color="#2563eb" strokeWidth={2.4} />
              <span>{displayName}</span>
              <ExternalLink size={12} style={{ opacity: 0.6 }} />
            </a>
          );
        })}

        {/* Sync from Google Sheet Button */}
        <button
          className="btn-secondary"
          style={{ height: '42px', padding: '0 16px', fontSize: '0.85rem', fontWeight: 700 }}
          onClick={onSyncSheet}
          disabled={isSyncing}
          title="Fetch latest data from Google Sheet"
        >
          <RefreshCw size={15} className={isSyncing ? 'pulse-circle' : ''} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
        </button>

        {/* Quick New Claim CTA if not on submit page */}
        {activePage !== 'submit' && (
          <button 
            className="btn-primary" 
            style={{ height: '42px', padding: '0 18px', fontSize: '0.86rem', fontWeight: 800 }}
            onClick={() => setActivePage('submit')}
          >
            <PlusCircle size={16} />
            <span>New Claim</span>
          </button>
        )}

        {user && (
          <button
            className="btn-secondary"
            style={{ 
              height: '42px', 
              padding: '0 15px', 
              fontSize: '0.84rem', 
              fontWeight: 700,
              color: '#dc2626',
              borderColor: '#fee2e2',
              background: '#fff'
            }}
            onClick={onLogout}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.borderColor = '#fee2e2';
            }}
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
