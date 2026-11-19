import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, FileText, ExternalLink, Sparkles, Filter, Check, Clock, MapPin, Shield, Volume2, VolumeX } from 'lucide-react';
import { 
  normalizeStateName, 
  formatINR, 
  formatSubmissionDate, 
  getTerritoryStyle,
  isUserBhawnaHelper,
  isUserBhartiHelper
} from '../services/currency';
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from '../services/notifications';

const SEEN_STORAGE_KEY = 'bharti_portal_seen_claim_ids_v2';

export default function NotificationDropdown({ claims = [], onViewClaim, onNavigateToClaims, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'bharti' | 'bhawna' (admin only)
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [bellRinging, setBellRinging] = useState(false);
  const prevCountRef = useRef(claims.length);

  const [seenIds, setSeenIds] = useState(() => {
    try {
      const stored = localStorage.getItem(SEEN_STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed reading seen claims:', e);
    }
    return new Set();
  });

  const dropdownRef = useRef(null);

  // Trigger bell shake animation whenever new entries are added
  useEffect(() => {
    if (claims.length > prevCountRef.current && prevCountRef.current > 0) {
      setBellRinging(true);
      const timer = setTimeout(() => setBellRinging(false), 2400);
      prevCountRef.current = claims.length;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = claims.length;
  }, [claims.length]);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      playNotificationSound();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Determine user identity strictly
  const userRole = (user?.role || '').toLowerCase();
  const userEmail = (user?.email || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userEmail.includes('mis@') || userEmail.includes('admin@');
  const isBhawna = isUserBhawnaHelper(user);
  const isBharti = isUserBhartiHelper(user);

  // Enrich claims with user/sheet metadata and unread status
  const enrichedClaims = claims.map(c => {
    const stateNorm = normalizeStateName(c.state).toLowerCase();
    const isBhawnaClaim = c.sourceSpreadsheet === 'Bhawna TA Master' || 
      ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(stateNorm);
    const sourceUser = isBhawnaClaim ? 'Bhawna' : 'Bharti';
    const sourceSheet = isBhawnaClaim ? 'Bhawna TA Master' : 'Bharti TA Master';
    const isUnread = !seenIds.has(String(c.id || c.sNo));

    return {
      ...c,
      sourceUser,
      sourceSheet,
      isUnread
    };
  });

  // Sort descending by sNo or date to show latest appended first
  const sortedClaims = [...enrichedClaims].sort((a, b) => {
    const numA = Number(a.sNo) || parseInt(String(a.id || '').replace(/\D/g, ''), 10) || 0;
    const numB = Number(b.sNo) || parseInt(String(b.id || '').replace(/\D/g, ''), 10) || 0;
    return numB - numA;
  });

  // Strict user scoping: Each non-admin user can ONLY see their own notifications
  const userScopedClaims = sortedClaims.filter(r => {
    if (isAdmin) return true;
    if (isBhawna) return r.sourceUser === 'Bhawna';
    if (isBharti) return r.sourceUser === 'Bharti';
    return true;
  });

  const [viewOnlyNew, setViewOnlyNew] = useState(false);

  // Total new / unread notifications count across all records for this user
  const totalNewCount = userScopedClaims.filter(r => r.isUnread).length;

  // Take top 30 recent records for this user (or all unread if viewOnlyNew is active)
  const baseRecords = viewOnlyNew ? userScopedClaims.filter(r => r.isUnread) : userScopedClaims.slice(0, 30);

  // If admin, support sub-filtering by Bharti vs Bhawna
  const filteredRecords = baseRecords.filter(r => {
    if (!isAdmin) return true;
    if (activeFilter === 'bharti') return r.sourceUser === 'Bharti';
    if (activeFilter === 'bhawna') return r.sourceUser === 'Bhawna';
    return true;
  });

  const unreadCount = totalNewCount;

  const markAllAsRead = () => {
    const allIds = new Set(seenIds);
    userScopedClaims.forEach(r => {
      allIds.add(String(r.id || r.sNo));
    });
    setSeenIds(allIds);
    try {
      localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(allIds)));
    } catch (e) {
      console.warn('Failed saving seen claims:', e);
    }
  };

  const handleItemClick = (record) => {
    const allIds = new Set(seenIds);
    allIds.add(String(record.id || record.sNo));
    setSeenIds(allIds);
    try {
      localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(allIds)));
    } catch (e) {
      console.warn('Failed saving seen claims:', e);
    }

    if (typeof onViewClaim === 'function') {
      onViewClaim(record);
      setIsOpen(false);
    }
  };

  // Header display text based on user
  const headerTitle = isBhawna
    ? "Bhawna's Feed"
    : isBharti
    ? "Bharti's Feed"
    : "Activity Feed";

  const headerSubtitle = isBhawna
    ? "Bhawna TA Master (RJ, GJ, BI, JH)"
    : isBharti
    ? "Bharti TA Master (Delhi, UP, MP...)"
    : "Live updates across both sheets";

  return (
    <div className="notification-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Compact Bell Button Trigger */}
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? 'active' : ''} ${bellRinging ? 'bell-ringing' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'View notifications'}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          border: isOpen ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
          background: isOpen ? '#eff6ff' : '#ffffff',
          color: isOpen ? '#2563eb' : '#475569',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOpen 
            ? '0 0 0 2.5px rgba(37, 99, 235, 0.15)' 
            : '0 1px 2px rgba(15, 23, 42, 0.05)'
        }}
      >
        <Bell size={16} strokeWidth={isOpen ? 2.3 : 1.9} />

        {/* Compact Unread Pulse Pill */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              fontSize: '0.60rem',
              fontWeight: 800,
              minWidth: '16px',
              height: '16px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              border: '1.5px solid #ffffff',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45)',
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Sleek Compact Floating Glassmorphism Popover */}
      {isOpen && (
        <div
          className="notification-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '330px',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: '450px',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '14px',
            border: '1px solid rgba(226, 232, 240, 0.95)',
            boxShadow: '0 16px 36px -8px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeInSlide 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Compact Header */}
          <div
            style={{
              padding: '9px 12px 8px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '7px',
                    background: isBhawna ? '#f5f3ff' : '#eff6ff',
                    color: isBhawna ? '#7c3aed' : '#2563eb',
                    border: `1px solid ${isBhawna ? '#ddd6fe' : '#bfdbfe'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Bell size={13} strokeWidth={2.2} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                    {headerTitle}
                  </span>
                  <span
                    style={{
                      background: totalNewCount > 0 ? '#fef2f2' : '#f0fdf4',
                      color: totalNewCount > 0 ? '#dc2626' : '#15803d',
                      border: `1px solid ${totalNewCount > 0 ? '#fee2e2' : '#bbf7d0'}`,
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      lineHeight: 1.2
                    }}
                  >
                    {totalNewCount > 0 ? `${totalNewCount} New` : '0 New'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {/* Sound Chime Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleSound}
                  style={{
                    background: soundOn ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${soundOn ? '#bbf7d0' : '#e2e8f0'}`,
                    color: soundOn ? '#15803d' : '#94a3b8',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 7px',
                    borderRadius: '6px',
                    lineHeight: 1.3
                  }}
                  title={soundOn ? 'Notification chime ON (Click to mute)' : 'Notification chime MUTED (Click to unmute)'}
                >
                  {soundOn ? <Volume2 size={12} /> : <VolumeX size={12} />}
                  <span>{soundOn ? 'Sound' : 'Mute'}</span>
                </button>

                {totalNewCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #dbeafe',
                      color: '#2563eb',
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      lineHeight: 1.3
                    }}
                    title="Mark all notifications as read"
                  >
                    <CheckCheck size={12} />
                    <span>Mark read</span>
                  </button>
                )}
              </div>
            </div>

            <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {headerSubtitle}
            </div>

            {/* Filter Pills (Admin Consolidated Only) */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeFilter === 'all' ? '#0f172a' : '#f1f5f9',
                    color: activeFilter === 'all' ? '#ffffff' : '#475569'
                  }}
                >
                  All ({baseRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('bharti')}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeFilter === 'bharti' ? '#1d4ed8' : '#eff6ff',
                    color: activeFilter === 'bharti' ? '#ffffff' : '#1e40af'
                  }}
                >
                  Bharti
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('bhawna')}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeFilter === 'bhawna' ? '#7c3aed' : '#f5f3ff',
                    color: activeFilter === 'bhawna' ? '#ffffff' : '#6d28d9'
                  }}
                >
                  Bhawna
                </button>
              </div>
            )}
          </div>

          {/* Prominent Total New Notifications Bar */}
          <div
            style={{
              padding: '8px 12px',
              background: totalNewCount > 0 ? '#eff6ff' : '#f0fdf4',
              borderBottom: `1px solid ${totalNewCount > 0 ? '#bfdbfe' : '#bbf7d0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: totalNewCount > 0 ? '#2563eb' : '#16a34a',
                  boxShadow: totalNewCount > 0 ? '0 0 0 3px rgba(37, 99, 235, 0.25)' : 'none'
                }}
              />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                Total New Notifications:
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: totalNewCount > 0 ? '#1d4ed8' : '#15803d',
                  background: totalNewCount > 0 ? '#dbeafe' : '#dcfce7',
                  padding: '2px 9px',
                  borderRadius: '999px',
                  border: `1px solid ${totalNewCount > 0 ? '#93c5fd' : '#86efac'}`,
                  lineHeight: 1.2
                }}
              >
                {totalNewCount}
              </span>

              {totalNewCount > 0 && (
                <button
                  type="button"
                  onClick={() => setViewOnlyNew(!viewOnlyNew)}
                  style={{
                    background: viewOnlyNew ? '#1d4ed8' : '#ffffff',
                    color: viewOnlyNew ? '#ffffff' : '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                  title={viewOnlyNew ? 'Click to show all recent notifications' : 'Click to filter only new notifications'}
                >
                  {viewOnlyNew ? 'Show All' : 'Only New'}
                </button>
              )}
            </div>
          </div>

          {/* Compact List of Notification Items */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '290px',
              padding: '5px 7px'
            }}
          >
            {filteredRecords.length === 0 ? (
              <div style={{ padding: '28px 14px', textAlign: 'center', color: '#94a3b8' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    border: '1px solid #bbf7d0'
                  }}
                >
                  <Check size={18} />
                </div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>All Caught Up!</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                  Newly submitted claims will appear here.
                </div>
              </div>
            ) : (
              filteredRecords.map((item) => {
                const normState = normalizeStateName(item.state);
                const territoryStyle = getTerritoryStyle(normState);

                return (
                  <div
                    key={item.id || item.sNo}
                    onClick={() => handleItemClick(item)}
                    style={{
                      padding: '7px 9px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      background: item.isUnread ? '#f8fafc' : '#ffffff',
                      border: item.isUnread ? '1px solid #cbd5e1' : '1px solid #f1f5f9',
                      borderLeft: item.isUnread ? '3.5px solid #2563eb' : '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = item.isUnread ? '#f8fafc' : '#ffffff';
                      e.currentTarget.style.borderColor = item.isUnread ? '#cbd5e1' : '#f1f5f9';
                    }}
                  >
                    {/* Top Row: Mini Territory Badge, Employee Code, Unread Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {/* Mini Territory Badge */}
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '999px',
                            background: territoryStyle.bg,
                            color: territoryStyle.text,
                            border: `1px solid ${territoryStyle.border}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            lineHeight: 1.2
                          }}
                        >
                          <MapPin size={9} style={{ opacity: 0.8 }} />
                          {normState || 'Field'}
                        </span>

                        {/* Mini Employee Code */}
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                            fontFamily: 'monospace',
                            lineHeight: 1.2
                          }}
                        >
                          {item.empCode || `#${item.sNo}`}
                        </span>

                        {/* Master Sheet Tag (Admin only) */}
                        {isAdmin && (
                          <span
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 700,
                              padding: '1px 4px',
                              borderRadius: '3px',
                              background: item.sourceUser === 'Bharti' ? '#eff6ff' : '#f5f3ff',
                              color: item.sourceUser === 'Bharti' ? '#1d4ed8' : '#7c3aed',
                              lineHeight: 1.2
                            }}
                          >
                            {item.sourceUser}
                          </span>
                        )}
                      </div>

                      {/* Unread dot / tag */}
                      {item.isUnread && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.60rem',
                            fontWeight: 800,
                            color: '#1d4ed8',
                            background: '#eff6ff',
                            padding: '2px 6px',
                            borderRadius: '999px',
                            border: '1px solid #bfdbfe',
                            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.12)',
                            lineHeight: 1.2
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2563eb' }}></span>
                          NEW ENTRY DONE
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Employee Name & Amount */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.80rem',
                          fontWeight: 800,
                          color: '#059669',
                          background: '#ecfdf5',
                          padding: '1px 6px',
                          borderRadius: '5px',
                          border: '1px solid #a7f3d0',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.3
                        }}
                      >
                        {formatINR(item.amount)}
                      </span>
                    </div>

                    {/* Bottom Row: Month & Timestamp */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '3px',
                        fontSize: '0.66rem',
                        color: '#64748b'
                      }}
                    >
                      <span>
                        Month: <strong>{item.month}</strong>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} style={{ opacity: 0.7 }} />
                        {item.submissionDate || item.date || 'Recent'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Compact Footer */}
          {filteredRecords.length > 0 && (
            <div
              style={{
                padding: '6px 12px',
                borderTop: '1px solid #f1f5f9',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.68rem',
                color: '#64748b'
              }}
            >
              <span>Click to view voucher</span>
              {typeof onNavigateToClaims === 'function' && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToClaims();
                    setIsOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.68rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: 0
                  }}
                >
                  <span>Claims Grid</span>
                  <ExternalLink size={10} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
