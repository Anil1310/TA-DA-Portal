import React, { useState } from 'react';
import { Plus, Menu, Lock, ChevronDown, Check, FileSpreadsheet } from 'lucide-react';

/**
 * Google Sheets Authentic Tab Bar Component
 * Replicates Google Sheets' bottom tab navigation with pixel-perfect accuracy:
 * [+] [≡] [🔒 Master ▾] [🔒 Statewise ▾] [🔒 Apr ▾] [🔒 May ▾] [🔒 Jun ▾] [🔒 Jul ▾] [🔒 Aug ▾] [Sep ▾]
 */
export const ALL_12_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export default function GSheetsTabBar({
  activeTab = 'Sep', // 'master' | 'statewise' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | ...
  onSelectTab,
  onAddNewClaim,
  lockedTabs = ['Master', 'Statewise', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  months = ALL_12_MONTHS
}) {
  const [showSheetList, setShowSheetList] = useState(false);

  // Tab definitions in exact Financial Year sequence
  const tabs = [
    { id: 'master', label: 'Master', isLocked: lockedTabs.includes('Master') },
    { id: 'statewise', label: 'Statewise', isLocked: lockedTabs.includes('Statewise') },
    ...months.map(m => ({
      id: m,
      label: m,
      isLocked: lockedTabs.includes(m)
    }))
  ];

  const handleTabClick = (tabId) => {
    if (typeof onSelectTab === 'function') {
      onSelectTab(tabId);
    }
  };

  return (
    <div style={{
      background: '#f1f3f4',
      borderTop: '1px solid #dadce0',
      borderBottom: '1px solid #dadce0',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      height: '42px',
      position: 'relative',
      fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      userSelect: 'none',
      overflowX: 'auto',
      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
      marginBottom: '14px'
    }}>
      {/* [+] Add New Tab / Claim Button */}
      <button
        type="button"
        onClick={onAddNewClaim}
        title="Submit New TA Claim (+)"
        style={{
          width: '30px',
          height: '30px',
          border: 'none',
          background: 'transparent',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#3c4043',
          marginRight: '2px',
          flexShrink: 0,
          transition: 'background 0.15s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#e8eaed'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Plus size={16} strokeWidth={2.2} />
      </button>

      {/* [≡] All Sheets List Button */}
      <button
        type="button"
        onClick={() => setShowSheetList(!showSheetList)}
        title="All Sheets Menu (≡)"
        style={{
          width: '30px',
          height: '30px',
          border: 'none',
          background: showSheetList ? '#e8eaed' : 'transparent',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#3c4043',
          marginRight: '10px',
          flexShrink: 0,
          transition: 'background 0.15s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#e8eaed'}
        onMouseLeave={e => {
          if (!showSheetList) e.currentTarget.style.background = 'transparent';
        }}
      >
        <Menu size={16} strokeWidth={2.2} />
      </button>

      {/* Tabs Container */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        height: '100%',
        gap: '2px',
        flex: 1,
        overflowX: 'auto'
      }}>
        {tabs.map((tab) => {
          const isActive = String(activeTab).toLowerCase() === String(tab.id).toLowerCase();
          return (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              title={`${tab.label} Sheet ${tab.isLocked ? '(Locked 🔒)' : '(Unlocked 🔓)'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '35px',
                padding: '0 12px',
                borderRadius: '6px 6px 0 0',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#1a73e8' : '#3c4043',
                background: isActive ? '#ffffff' : 'transparent',
                borderTop: isActive ? '1px solid #dadce0' : '1px solid transparent',
                borderLeft: isActive ? '1px solid #dadce0' : '1px solid transparent',
                borderRight: isActive ? '1px solid #dadce0' : '1px solid transparent',
                borderBottom: isActive ? '3px solid #1a73e8' : '3px solid transparent',
                boxShadow: isActive ? '0 -1px 3px rgba(0, 0, 0, 0.05)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = '#e8eaed';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {/* Lock Icon */}
              {tab.isLocked && (
                <Lock
                  size={12}
                  color={isActive ? '#1a73e8' : '#5f6368'}
                  style={{ opacity: 0.9 }}
                />
              )}

              {/* Tab Title */}
              <span>{tab.label}</span>

              {/* Dropdown Caret ▾ */}
              <ChevronDown
                size={11}
                color={isActive ? '#1a73e8' : '#5f6368'}
                style={{ opacity: 0.8 }}
              />
            </div>
          );
        })}
      </div>

      {/* Popover Menu for [≡] All Sheets */}
      {showSheetList && (
        <div style={{
          position: 'absolute',
          top: '44px',
          left: '12px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #dadce0',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
          zIndex: 999,
          padding: '6px 0',
          minWidth: '220px',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            padding: '6px 14px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#5f6368',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderBottom: '1px solid #f1f3f4'
          }}>
            All Spreadsheet Sheets
          </div>
          {tabs.map(tab => {
            const isActive = String(activeTab).toLowerCase() === String(tab.id).toLowerCase();
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  handleTabClick(tab.id);
                  setShowSheetList(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  background: isActive ? '#e8f0fe' : 'transparent',
                  color: isActive ? '#1a73e8' : '#202124',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = '#f8f9fa';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {tab.isLocked ? <Lock size={12} color="#5f6368" /> : <FileSpreadsheet size={13} color="#1a73e8" />}
                  <span>{tab.label}</span>
                </div>
                {isActive && <Check size={14} color="#1a73e8" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
