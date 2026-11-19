import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import VoucherModal from './components/VoucherModal';
import NewEntryToast from './components/NewEntryToast';

import LoginPage from './pages/LoginPage';
import SubmitClaim from './pages/SubmitClaim';
import ClaimsExplorer from './pages/ClaimsExplorer';
import Analytics from './pages/Analytics';
import Directory from './pages/Directory';
import Settings from './pages/Settings';
import Automation from './pages/Automation';

import { 
  getStoredClaims, 
  saveStoredClaims, 
  getStoredStaff, 
  saveStoredStaff, 
  getStoredConfig,
  getStoredUser,
  saveStoredUser,
  getStoredActivePage,
  saveStoredActivePage,
  getStoredPermissions,
  saveStoredPermissions,
  updateClaimInBackend,
  deleteClaimFromBackend,
  addStaffToBackend,
  updateStaffInBackend,
  getStoredBranding,
  saveStoredBranding
} from './services/storage';
import { 
  isStateAllowed, 
  normalizeStateName, 
  normalizeMonthName,
  isUserBhawnaHelper,
  isUserBhartiHelper,
  BHAWNA_STATES,
  BHARTI_STATES
} from './services/currency';
import { playNotificationSound } from './services/notifications';
import { MASTER_CLAIMS } from './services/masterData';

export function getMostRecentClaim(list) {
  if (!Array.isArray(list) || list.length === 0) return null;

  const MONTH_RANK = {
    'dec': 12, 'nov': 11, 'oct': 10, 'sep': 9, 'aug': 8, 'jul': 7,
    'jun': 6, 'may': 5, 'apr': 4, 'mar': 3, 'feb': 2, 'jan': 1
  };

  const copy = [...list];
  copy.sort((a, b) => {
    // 1. If explicit date string can be parsed
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    if (!isNaN(dateA) && !isNaN(dateB) && dateA > 0 && dateB > 0 && dateA !== dateB) {
      return dateB - dateA;
    }

    // 2. Compare month rank (Nov > Oct > Sep > Aug > Jul > Jun > May > Apr)
    const mNormA = String(a.month || '').trim().toLowerCase().slice(0, 3);
    const mNormB = String(b.month || '').trim().toLowerCase().slice(0, 3);
    const rankA = MONTH_RANK[mNormA] || 0;
    const rankB = MONTH_RANK[mNormB] || 0;
    if (rankA !== rankB) {
      return rankB - rankA;
    }

    // 3. Compare serial number (higher sNo was entered later)
    const sNoA = Number(a.sNo) || 0;
    const sNoB = Number(b.sNo) || 0;
    if (sNoA !== sNoB) {
      return sNoB - sNoA;
    }

    return 0;
  });

  return copy[0];
}

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState(getStoredUser);
  const [activePage, setActivePage] = useState(getStoredActivePage);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [claims, setClaims] = useState(getStoredClaims);
  const [staffList, setStaffList] = useState(getStoredStaff);
  const [config, setConfig] = useState(getStoredConfig);
  const [permissions, setPermissions] = useState(getStoredPermissions);
  const [branding, setBranding] = useState(getStoredBranding);
  
  const handleUpdateBranding = (newBranding) => {
    setBranding(newBranding);
    saveStoredBranding(newBranding);
  };
  
  const [activeVoucher, setActiveVoucher] = useState(null);
  const [toast, setToast] = useState(null);
  const [newEntryAlert, setNewEntryAlert] = useState(null);
  const [protectedAlert, setProtectedAlert] = useState(null);
  const [logoutAlert, setLogoutAlert] = useState(null);

  const uRole = String(loggedInUser?.role || '').toLowerCase();
  const uEmail = String(loggedInUser?.email || '').toLowerCase();
  const isAdmin = uRole === 'admin' || uEmail.includes('admin') || uEmail.includes('mis@');

  const isUserBhawna = isUserBhawnaHelper(loggedInUser);
  const isUserBharti = isUserBhartiHelper(loggedInUser);
  const userKey = isUserBhawna ? 'bhawna' : isUserBharti ? 'bharti' : null;
  const currentUserPerms = userKey ? permissions?.[userKey] : null;
  const canAccessSettings = isAdmin || Boolean(currentUserPerms?.features?.manageBranding);

  const allowedStates = !loggedInUser || isAdmin
    ? []
    : isUserBhawna
      ? BHAWNA_STATES
      : (Array.isArray(loggedInUser.allowedStates) && loggedInUser.allowedStates.length > 0 ? loggedInUser.allowedStates : BHARTI_STATES);

  const bhawnaLower = BHAWNA_STATES.map(s => s.toLowerCase());

  const filteredClaims = !loggedInUser
    ? []
    : isAdmin
      ? claims
      : claims.filter(claim => {
          const stateNorm = normalizeStateName(claim.state, claim.empCode).toLowerCase();
          const isBhawnaRecord = claim.sourceSpreadsheet === 'Bhawna TA Master' || bhawnaLower.includes(stateNorm);
          if (isUserBhawna) {
            return isBhawnaRecord;
          } else {
            return !isBhawnaRecord && (allowedStates.length === 0 || isStateAllowed(claim.state, allowedStates, claim.empCode));
          }
        });

  const visibleStaff = !loggedInUser
    ? []
    : isAdmin
      ? staffList
      : staffList.filter(member => {
          const stateNorm = normalizeStateName(member.state).toLowerCase();
          const isBhawnaMember = member.sourceSpreadsheet === 'Bhawna TA Master' || bhawnaLower.includes(stateNorm);
          if (isUserBhawna) {
            return isBhawnaMember;
          } else {
            return !isBhawnaMember && (allowedStates.length === 0 || isStateAllowed(member.state, allowedStates));
          }
        });

  useEffect(() => {
    saveStoredUser(loggedInUser);
  }, [loggedInUser]);

  useEffect(() => {
    saveStoredActivePage(activePage);
  }, [activePage]);

  useEffect(() => {
    saveStoredPermissions(permissions);
  }, [permissions]);

  useEffect(() => {
    if (!isAdmin && activePage === 'settings' && !canAccessSettings) {
      setActivePage('submit');
      return;
    }
    if (!isAdmin && activePage === 'automation') {
      setActivePage('submit');
      return;
    }
    if (!isAdmin && loggedInUser) {
      const userKey = isUserBhawna ? 'bhawna' : isUserBharti ? 'bharti' : null;
      const userPerms = userKey ? permissions?.[userKey] : null;
      if (userPerms && userPerms.pages && userPerms.pages[activePage] === false) {
        const allowedPages = ['submit', 'claims', 'analytics', 'directory'].filter(p => userPerms.pages[p] !== false);
        if (allowedPages.length > 0) {
          setActivePage(allowedPages[0]);
        }
      }
    }
  }, [activePage, isAdmin, canAccessSettings, loggedInUser, isUserBhawna, isUserBharti, permissions]);

  const [lastUserLoggedOut, setLastUserLoggedOut] = useState(null);

  const triggerLastEntryNotification = (user, availableClaims = claims) => {
    if (!user) return;
    const userEmail = String(user.email || '').toLowerCase();
    const isBhawna = userEmail.includes('bhawna') || userEmail.includes('marketing') || (user.name && user.name.toLowerCase().includes('bhawna'));
    const isAdm = user.role === 'admin' || userEmail.includes('admin') || userEmail.includes('mis@');

    // 1. Check if user has a stored last submitted entry in localStorage
    let lastEntry = null;
    try {
      const savedLocal = localStorage.getItem('ta_portal_last_entry_' + (userEmail || user.name || '').toLowerCase());
      if (savedLocal) {
        lastEntry = JSON.parse(savedLocal);
      }
    } catch (e) {}

    // 2. If no local entry or to ensure accuracy, find the most recent claim from this user's territory claims
    if (!lastEntry && Array.isArray(availableClaims) && availableClaims.length > 0) {
      const bhawnaLower = BHAWNA_STATES.map(s => s.toLowerCase());
      const userClaims = isAdm 
        ? availableClaims 
        : availableClaims.filter(c => {
            const st = normalizeStateName(c.state, c.empCode).toLowerCase();
            const isBhawnaRec = c.sourceSpreadsheet === 'Bhawna TA Master' || bhawnaLower.includes(st);
            return isBhawna ? isBhawnaRec : !isBhawnaRec;
          });

      lastEntry = getMostRecentClaim(userClaims);
    }

    if (lastEntry) {
      setNewEntryAlert({
        ...lastEntry,
        toastTitle: 'Last Entry Done!',
        toastSubtitle: 'Most recent traveling allowance record in sheets',
        toastBadge: 'LIVE'
      });
    }
  };

  const handleLogin = (user) => {
    setLoggedInUser(user);
    setActivePage('submit');
    setLogoutAlert(null);
    const roleKey = user.role === 'admin' 
      ? 'admin' 
      : (user.name && user.name.toLowerCase().includes('bhawna') ? 'bhawna' : 'bharti');
    try {
      localStorage.setItem('ta_portal_last_user_role', roleKey);
    } catch (e) {}
    showToast(`Welcome back, ${user.name}! Successfully logged in as ${user.role === 'admin' ? 'Administrator' : 'Sales Representative'}.`, 'success');

    // Display last entry notification for this user
    setTimeout(() => {
      triggerLastEntryNotification(user);
    }, 700);
  };

  // On mount with active 30-day session, show notification for the last entry made
  useEffect(() => {
    if (loggedInUser && claims.length > 0) {
      const timer = setTimeout(() => {
        triggerLastEntryNotification(loggedInUser, claims);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLogout = () => {
    const userName = loggedInUser?.name || 'User';
    setLastUserLoggedOut(loggedInUser);
    setLoggedInUser(null);
    setLogoutAlert(`You have been logged out successfully. Goodbye, ${userName}!`);
    setActivePage('submit');
    saveStoredUser(null, false);
  };

  // Auto-save on state change
  useEffect(() => {
    saveStoredClaims(claims);
  }, [claims]);

  useEffect(() => {
    saveStoredStaff(staffList);
  }, [staffList]);

  const [isSyncing, setIsSyncing] = useState(false);

  // Sync handler to pull fresh data from Google Sheet
  const syncWithGoogleSheet = (options = {}) => {
    if (typeof window === 'undefined' || !window.google || !window.google.script || !window.google.script.run) {
      if (!options?.silent) {
        showToast('Standalone mode: Sync works inside deployed Google Apps Script tab.', 'info');
      }
      return;
    }

    // Only show spinning indicator when manually triggered by the user
    if (!options?.silent) {
      setIsSyncing(true);
    }

    // High performance sheet scoping: Bharti gets Sheet 1, Bhawna gets Sheet 2, Admin gets both
    const activeSheetIds = isAdmin
      ? (Array.isArray(config.spreadsheetIds) && config.spreadsheetIds.filter(Boolean).length > 0
          ? config.spreadsheetIds.filter(Boolean)
          : [config.spreadsheetId, config.secondarySpreadsheetId].filter(Boolean))
      : isUserBhawna
        ? [config.secondarySpreadsheetId || config.spreadsheetIds?.[1] || '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w']
        : [config.spreadsheetId || config.spreadsheetIds?.[0] || '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY'];

    // 1. Fetch submissions with streamlined payload
    window.google.script.run
      .withSuccessHandler((res) => {
        setIsSyncing(false);
        if (res && res.success && res.records) {
          if (res.records.length > 0) {
            let finalRecords = res.records.map(r => {
              const healedState = normalizeStateName(r.state, r.empCode) || 'Delhi';
              const healedMonth = normalizeMonthName(r.month) || 'Sep';
              return {
                ...r,
                state: healedState,
                month: healedMonth,
                amount: Number(r.amount) || 0,
                sourceSpreadsheet: r.sourceSpreadsheet || (
                  ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(healedState).toLowerCase())
                    ? 'Bhawna TA Master'
                    : 'Bharti TA Master'
                )
              };
            });

            const bhawnaFromLive = finalRecords.filter(r => 
              r.sourceSpreadsheet === 'Bhawna TA Master' ||
              ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(r.state).toLowerCase())
            );
            const bhawnaLiveAmount = bhawnaFromLive.reduce((a, b) => a + (Number(b.amount) || 0), 0);

            // If Bhawna records are missing or their amounts are 0, populate from MASTER_CLAIMS
            if (bhawnaFromLive.length === 0 || bhawnaLiveAmount <= 0) {
              finalRecords = finalRecords.filter(r => 
                !(r.sourceSpreadsheet === 'Bhawna TA Master' || ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(r.state).toLowerCase()))
              );

              const bhawnaClaims = MASTER_CLAIMS.filter(c => {
                const s = normalizeStateName(c.state).toLowerCase();
                return s === 'rajasthan' || s === 'bihar' || s === 'jharkhand' || s === 'gujarat' || c.sourceSpreadsheet === 'Bhawna TA Master';
              });
              finalRecords = [...finalRecords, ...bhawnaClaims];
            }
            finalRecords.forEach((c, idx) => {
              if (!c.sNo || isNaN(Number(c.sNo))) {
                c.sNo = idx + 1;
              }
              c.id = 'CLM-' + String(c.sNo).padStart(3, '0');
            });

            // Compare with current records to detect newly entered rows in Google Sheets
            setClaims(prev => {
              const prevKeys = new Set(prev.map(p => `${(p.empCode || '').toUpperCase()}_${p.month}_${Number(p.amount)}`));
              const newlyAdded = finalRecords.filter(f => !prevKeys.has(`${(f.empCode || '').toUpperCase()}_${f.month}_${Number(f.amount)}`));

              if (newlyAdded.length > 0 && prev.length > 0) {
                // New entry detected from Google Sheets!
                playNotificationSound();
                const latestAdded = getMostRecentClaim(newlyAdded);
                setNewEntryAlert(latestAdded || newlyAdded[newlyAdded.length - 1]);
                showToast(`Auto-Synced: ${newlyAdded.length} new entry detected from Google Sheets!`, 'success');
              } else if (!options?.silent) {
                const totalAmt = finalRecords.reduce((a, b) => a + (Number(b.amount) || 0), 0);
                showToast(`Synced! Consolidated ${finalRecords.length} claims from both master sheets — ₹${totalAmt.toLocaleString('en-IN')}.`, 'success');
              }
              return finalRecords;
            });
          } else {
            if (!options?.silent) {
              showToast('Google Sheets connected! (No submission rows found yet).', 'info');
            }
          }
        } else if (res && res.error) {
          if (!options?.silent) {
            showToast(`Sheet Notice: ${res.error}`, 'error');
          }
        }
      })
      .withFailureHandler((err) => {
        setIsSyncing(false);
        if (!options?.silent) {
          showToast('Sync Error: ' + ((err && err.message) || String(err)), 'error');
        }
      })
      .fetchSubmissions({ month: 'All', spreadsheetIds: activeSheetIds });
  };

  // Initial fetch from Google Sheets
  useEffect(() => {
    syncWithGoogleSheet({ silent: true });

    // Single directory sync on boot if list is unpopulated
    if (typeof window !== 'undefined' && window.google?.script?.run && (!staffList || staffList.length <= 1)) {
      window.google.script.run
        .withSuccessHandler((list) => {
          if (list && Array.isArray(list) && list.length > 0) {
            setStaffList(list);
          }
        })
        .withFailureHandler((err) => {
          console.warn('Directory fetch error:', err);
        })
        .getEmployeeDirectory({ spreadsheetIds: [config.spreadsheetId, config.secondarySpreadsheetId].filter(Boolean) });
    }
  }, []);

  // Automatic background synchronization: periodic & on window/tab focus
  useEffect(() => {
    const interval = setInterval(() => {
      if (loggedInUser && !isSyncing) {
        syncWithGoogleSheet({ silent: true });
      }
    }, 25000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible' && loggedInUser && !isSyncing) {
        syncWithGoogleSheet({ silent: true });
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [loggedInUser, isSyncing]);

  // Toast notification dispatcher
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Claim actions with Live Google Sheet CRUD
  const handleClaimSubmitted = (newClaim) => {
    let assignedClaim = null;
    setClaims(prev => {
      const maxSNo = prev.reduce((max, c) => Math.max(max, Number(c.sNo) || 0), 0);
      const assignedSNo = newClaim.sNo || (maxSNo + 1);
      assignedClaim = {
        ...newClaim,
        sNo: assignedSNo,
        id: newClaim.id && !newClaim.id.includes('undefined') && !newClaim.id.startsWith('CLM-NaN') ? newClaim.id : `CLM-${String(assignedSNo).padStart(3, '0')}`
      };
      return [assignedClaim, ...prev];
    });

    // 1. Play crystal clear audio chime
    playNotificationSound();

    // 2. Trigger rich live floating notification banner
    const alertEntry = assignedClaim || newClaim;
    setNewEntryAlert(alertEntry);

    // Save as last submitted entry for this user on their system
    try {
      const uKey = (loggedInUser?.email || loggedInUser?.name || 'global').toLowerCase();
      localStorage.setItem('ta_portal_last_entry_' + uKey, JSON.stringify(alertEntry));
    } catch (e) {}

    // 3. Automatically trigger Google Sheet synchronization after entry is done!
    setTimeout(() => {
      syncWithGoogleSheet({ silent: true });
    }, 1200);
  };

  const handleUpdateClaim = async (updatedClaim) => {
    try {
      const res = await updateClaimInBackend(updatedClaim, loggedInUser?.role);
      if (res && res.isProtected) {
        setProtectedAlert({
          sheetName: res.sheetName || updatedClaim.month,
          message: res.message || `The sheet "${updatedClaim.month}" has been locked and protected by the Administrator. Editing claims in this month is restricted.`
        });
        return { success: false, isProtected: true };
      }

      if (res && res.success) {
        setClaims(prev => prev.map(c => (c.id === updatedClaim.id ? updatedClaim : c)));
        showToast(res.message || 'Claim updated in Google Sheet successfully!', 'success');
        setTimeout(() => {
          syncWithGoogleSheet({ silent: true });
        }, 1200);
        return { success: true };
      } else {
        showToast(`Update Notice: ${res.error || res.message || 'Update failed'}`, 'error');
        return { success: false, error: res.error || res.message };
      }
    } catch (e) {
      console.warn('Backend update error:', e);
      return { success: false, error: e.message };
    }
  };

  const handleDeleteClaim = async (claimId) => {
    const claimToDelete = claims.find(c => c.id === claimId);
    try {
      const res = await deleteClaimFromBackend(claimToDelete || { id: claimId }, loggedInUser?.role);
      if (res && res.isProtected) {
        setProtectedAlert({
          sheetName: res.sheetName || (claimToDelete && claimToDelete.month),
          message: res.message || `The sheet "${claimToDelete ? claimToDelete.month : ''}" has been locked and protected by the Administrator. Deleting claims in this month is restricted.`
        });
        return { success: false, isProtected: true };
      }

      if (res && res.success) {
        setClaims(prev => prev.filter(c => c.id !== claimId));
        showToast(res.message || 'Claim deleted from Google Sheet!', 'info');
        setTimeout(() => {
          syncWithGoogleSheet({ silent: true });
        }, 1200);
        return { success: true };
      } else {
        showToast(`Delete Notice: ${res.error || res.message || 'Delete failed'}`, 'error');
        return { success: false, error: res.error || res.message };
      }
    } catch (e) {
      console.warn('Backend delete error:', e);
      return { success: false, error: e.message };
    }
  };

  // Staff actions with Live Google Sheet CRUD
  const handleAddStaff = async (newMember) => {
    setStaffList(prev => [...prev, newMember]);
    try {
      const res = await addStaffToBackend(newMember);
      if (res && res.success) {
        showToast(res.message || `Representative ${newMember.name} added to Google Sheet!`, 'success');
      }
    } catch (e) {
      console.warn('Backend add staff error:', e);
    }
  };

  const handleUpdateStaff = async (updatedMember, oldCode, oldName) => {
    // 1. Immediately update staffList in state
    setStaffList(prev => prev.map(s => {
      const isMatch = (oldCode && s.code.toUpperCase() === oldCode.toUpperCase()) ||
                      (oldName && s.name.toLowerCase() === oldName.toLowerCase());
      return isMatch ? { ...s, ...updatedMember } : s;
    }));

    // 2. Cascade code / name / state updates to all existing claims in state
    setClaims(prev => prev.map(c => {
      const isMatch = (oldCode && c.empCode && c.empCode.toUpperCase() === oldCode.toUpperCase()) ||
                      (oldName && c.name && c.name.toLowerCase() === oldName.toLowerCase());
      if (isMatch) {
        return {
          ...c,
          empCode: updatedMember.code,
          name: updatedMember.name,
          state: updatedMember.state || c.state
        };
      }
      return c;
    }));

    // 3. Sync to Google Apps Script backend across connected sheets
    try {
      const activeSheetIds = Array.isArray(config.spreadsheetIds) && config.spreadsheetIds.filter(Boolean).length > 0
        ? config.spreadsheetIds.filter(Boolean)
        : [config.spreadsheetId, config.secondarySpreadsheetId].filter(Boolean);

      const res = await updateStaffInBackend({
        oldCode: oldCode,
        oldName: oldName,
        code: updatedMember.code,
        name: updatedMember.name,
        state: updatedMember.state,
        designation: updatedMember.designation,
        phone: updatedMember.phone,
        spreadsheetIds: activeSheetIds
      });

      if (res && res.success) {
        showToast(res.message || `Representative ${updatedMember.name} (${updatedMember.code}) updated successfully in Google Sheet!`, 'success');
        return { success: true };
      } else {
        showToast(res && res.message ? res.message : 'Updated locally in app.', 'info');
        return { success: true };
      }
    } catch (e) {
      console.warn('Backend update staff error:', e);
      showToast('Updated locally in application.', 'info');
      return { success: true };
    }
  };

  if (!loggedInUser) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        logoutAlert={logoutAlert} 
        onClearLogoutAlert={() => setLogoutAlert(null)}
        lastUser={lastUserLoggedOut}
        branding={branding}
      />
    );
  }

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Navigation Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={loggedInUser}
        onLogout={handleLogout}
        permissions={permissions}
        branding={branding}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Topbar
          activePage={activePage}
          setActivePage={setActivePage}
          config={config}
          onSyncSheet={syncWithGoogleSheet}
          isSyncing={isSyncing}
          user={loggedInUser}
          onLogout={handleLogout}
          claims={claims}
          onViewClaim={claim => setActiveVoucher(claim)}
          permissions={permissions}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
        />

        <main className="content-area">
          {/* Notification Toast Banner */}
          {toast && (
            <div className={`toast-banner toast-${toast.type}`}>
              <span>{toast.message}</span>
              <button 
                onClick={() => setToast(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1rem', color: 'inherit' }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Page Routing */}
          {activePage === 'submit' && (
            <SubmitClaim
              staffList={visibleStaff}
              onClaimSubmitted={handleClaimSubmitted}
              showToast={showToast}
              user={loggedInUser}
              claimsCount={claims.length}
            />
          )}

          {activePage === 'claims' && (
            <ClaimsExplorer
              claims={filteredClaims}
              allClaims={claims}
              onUpdateClaim={handleUpdateClaim}
              onDeleteClaim={handleDeleteClaim}
              onViewVoucher={claim => setActiveVoucher(claim)}
              showToast={showToast}
              user={loggedInUser}
              isAdmin={isAdmin}
              onNavigateToSubmit={() => setActivePage('submit')}
            />
          )}

          {activePage === 'analytics' && (
            <Analytics
              claims={filteredClaims}
              allClaims={claims}
              staffList={visibleStaff}
              user={loggedInUser}
              isAdmin={isAdmin}
            />
          )}

          {activePage === 'directory' && (
            <Directory
              staffList={visibleStaff}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              claims={filteredClaims}
              showToast={showToast}
              user={loggedInUser}
            />
          )}

          {activePage === 'automation' && isAdmin && (
            <Automation
              config={config}
              showToast={showToast}
              user={loggedInUser}
            />
          )}

          {activePage === 'settings' && canAccessSettings && (
            <Settings
              config={config}
              setConfig={setConfig}
              claims={filteredClaims}
              staffList={visibleStaff}
              showToast={showToast}
              user={loggedInUser}
              permissions={permissions}
              setPermissions={setPermissions}
              branding={branding}
              onUpdateBranding={handleUpdateBranding}
            />
          )}

          {/* Universal Developer Attribution Footer */}
          <footer style={{
            marginTop: '48px',
            paddingTop: '20px',
            paddingBottom: '24px',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span>© 2026 Designed & Engineered by Dev. Anil Kumar Chahar • 8126390611 • v2.5 Cloud Edition</span>
          </footer>
        </main>
      </div>

      {/* Printable Voucher Modal */}
      {activeVoucher && (
        <VoucherModal
          claim={activeVoucher}
          onClose={() => setActiveVoucher(null)}
        />
      )}

      {/* =========================================================================
          PROTECTED SHEET ADMIN ALERT MODAL
          ========================================================================= */}
      {protectedAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={() => setProtectedAlert(null)}
        >
          <div style={{
            width: '100%',
            maxWidth: '440px',
            background: '#ffffff',
            borderRadius: '24px',
            padding: '32px 26px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            textAlign: 'center',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Lock Icon Badge */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 10px 20px -5px rgba(217, 119, 6, 0.3)'
            }}>
              <Lock size={30} strokeWidth={2.4} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              Sheet Protected by Admin
            </h3>

            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.94rem', lineHeight: 1.55 }}>
              {protectedAlert.message || `The sheet "${protectedAlert.sheetName || 'selected month'}" has been locked and protected by the Administrator. Editing and deleting are restricted.`}
            </p>

            <div style={{
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              borderRadius: '12px',
              padding: '12px 14px',
              color: '#92400e',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'left'
            }}>
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <span>To make changes, please contact your Administrator to unlock this month sheet.</span>
            </div>

            <button
              type="button"
              onClick={() => setProtectedAlert(null)}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                color: '#ffffff',
                fontSize: '0.96rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Live Interactive New Entry Notification Banner */}
      <NewEntryToast
        entry={newEntryAlert}
        onClose={() => setNewEntryAlert(null)}
        onViewVoucher={claim => setActiveVoucher(claim)}
      />
    </div>
  );
}
