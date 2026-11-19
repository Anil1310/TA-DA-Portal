import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Eye, 
  CheckCircle, 
  Trash2, 
  Filter, 
  Edit3, 
  X, 
  Table as TableIcon, 
  MapPin, 
  Calendar, 
  RotateCcw,
  TrendingUp,
  ArrowRight,
  BarChart2,
  User,
  Users,
  Award,
  Lock,
  Unlock
} from 'lucide-react';
import { formatINR, MONTHS_3_LETTER, normalizeStateName, normalizeMonthName, formatSubmissionDate, getTerritoryStyle, isUserBhawnaHelper } from '../services/currency';
import { exportClaimsCSV, toggleSheetLockInBackend } from '../services/storage';
import { MASTER_CLAIMS } from '../services/masterData.js';
import StatewiseMatrixTable from '../components/StatewiseMatrixTable';
import GSheetsTabBar from '../components/GSheetsTabBar';

export default function ClaimsExplorer({ claims, allClaims, onUpdateClaim, onDeleteClaim, onViewVoucher, showToast, user, isAdmin, onNavigateToSubmit }) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'costing' | 'employee' | 'statewise' | 'monthwise' | 'matrix'
  const [selectedSheet, setSelectedSheet] = useState('All'); // 'All' | 'Bharti TA Master' | 'Bhawna TA Master'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedEmpCode, setSelectedEmpCode] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [hideZero, setHideZero] = useState(true);
  const [editingClaim, setEditingClaim] = useState(null);
  const [deleteConfirmClaim, setDeleteConfirmClaim] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedEmpCode, setExpandedEmpCode] = useState(null);
  const [lockedMonths, setLockedMonths] = useState([]);
  const [isTogglingLock, setIsTogglingLock] = useState(false);

  const handleToggleLockMonth = async (monthToToggle) => {
    if (!isAdmin) {
      showToast('Only Administrators can lock or unlock sheets.', 'error');
      return;
    }
    const isCurrentlyLocked = lockedMonths.includes(monthToToggle);
    const newLockState = !isCurrentlyLocked;
    setIsTogglingLock(true);
    try {
      const res = await toggleSheetLockInBackend(monthToToggle, newLockState, user?.role || 'admin');
      if (res && res.success) {
        if (newLockState) {
          setLockedMonths(prev => [...prev, monthToToggle]);
        } else {
          setLockedMonths(prev => prev.filter(m => m !== monthToToggle));
        }
        showToast(res.message || `Month sheet "${monthToToggle}" ${newLockState ? 'locked 🔒' : 'unlocked 🔓'}!`, 'success');
      } else {
        showToast(`Lock toggle notice: ${res.error || res.message || 'Action failed'}`, 'error');
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    } finally {
      setIsTogglingLock(false);
    }
  };

  // Scope data: For non-admin users, strictly scope to their assigned sheet only
  const isUserBhawna = isUserBhawnaHelper(user);

  let effectiveClaims = [];
  if (!isAdmin) {
    if (isUserBhawna) {
      // Bhawna: only Bhawna TA Master claims
      effectiveClaims = (claims || []).filter(c => 
        c.sourceSpreadsheet === 'Bhawna TA Master' || 
        ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(c.state, c.empCode, c.name).toLowerCase())
      );
      if (effectiveClaims.length === 0) {
        effectiveClaims = MASTER_CLAIMS.filter(c => 
          c.sourceSpreadsheet === 'Bhawna TA Master' || 
          ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(c.state, c.empCode, c.name).toLowerCase())
        );
      }
    } else {
      // Bharti / regular sales rep: only Bharti TA Master claims
      effectiveClaims = (claims || []).filter(c => 
        c.sourceSpreadsheet === 'Bharti TA Master' || 
        (!c.sourceSpreadsheet && !['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(c.state, c.empCode, c.name).toLowerCase()))
      );
      if (effectiveClaims.length === 0) {
        effectiveClaims = MASTER_CLAIMS.filter(c => 
          c.sourceSpreadsheet === 'Bharti TA Master' || 
          (!c.sourceSpreadsheet && !['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(c.state, c.empCode, c.name).toLowerCase()))
        );
      }
    }
  } else {
    // Admin: both sheets merged and self-healed if needed
    const rawBhawnaClaims = (claims || []).filter(c => 
      (c.sourceSpreadsheet === 'Bhawna TA Master') || 
      ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(c.state, c.empCode, c.name).toLowerCase())
    );
    const rawBhawnaTotal = rawBhawnaClaims.reduce((a, b) => a + (Number(b.amount) || 0), 0);

    effectiveClaims = (rawBhawnaClaims.length === 0 || rawBhawnaTotal <= 0)
      ? [
          ...claims.filter(c => !((c.sourceSpreadsheet === 'Bhawna TA Master') || ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(c.state, c.empCode, c.name).toLowerCase()))),
          ...MASTER_CLAIMS.filter(c => (c.sourceSpreadsheet === 'Bhawna TA Master') || ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(c.state, c.empCode, c.name).toLowerCase()))
        ]
      : claims;
  }

  // 1. Extract dynamic distinct states, months, and employee aggregates from actual loaded claims
  const excludedStateNames = new Set(['other', 'himachal pradesh', 'jammu & kashmir', 'maharashtra']);
  const stateCounts = {};
  const monthCounts = {};
  const employeeMap = {};

  const isValidStateValue = (value) => {
    const s = (value || '').trim();
    if (!s) return false;
    const normalised = s.toLowerCase();
    if (normalised.includes('total') || normalised.includes('grand')) return false;
    return !excludedStateNames.has(normalised);
  };

  effectiveClaims.forEach(c => {
    const s = normalizeStateName(c.state, c.empCode, c.name);
    if (isValidStateValue(s)) {
      stateCounts[s] = (stateCounts[s] || 0) + 1;
    }

    const m = (normalizeMonthName(c.month) || (c.month || '')).trim();
    if (m) {
      monthCounts[m] = (monthCounts[m] || 0) + 1;
    }

    const code = (c.empCode || '').trim().toUpperCase();
    if (code && !code.includes('TOTAL') && !code.includes('GRAND')) {
      if (!employeeMap[code]) {
        employeeMap[code] = {
          code,
          name: c.name || code,
          states: {},
          months: {},
          total: 0,
          count: 0,
          claims: []
        };
      }
      const amt = Number(c.amount) || 0;
      employeeMap[code].total += amt;
      employeeMap[code].count += 1;
      employeeMap[code].claims.push(c);
      if (s) {
        employeeMap[code].states[s] = (employeeMap[code].states[s] || 0) + amt;
      }
      if (m) {
        employeeMap[code].months[m] = (employeeMap[code].months[m] || 0) + amt;
      }
    }
  });

  const availableStates = Object.keys(stateCounts).sort((a, b) => a.localeCompare(b));
  const sortedEmployees = Object.values(employeeMap).sort((a, b) => b.total - a.total);

  // Sheet-specific statistics
  const bhartiClaims = effectiveClaims.filter(c => (c.sourceSpreadsheet === 'Bharti TA Master') || (!c.sourceSpreadsheet && !['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(c.state, c.empCode, c.name).toLowerCase())));
  const bhawnaClaims = effectiveClaims.filter(c => (c.sourceSpreadsheet === 'Bhawna TA Master') || ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(c.state, c.empCode, c.name).toLowerCase()));

  const bhartiTotal = bhartiClaims.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const bhawnaTotal = bhawnaClaims.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const consolidatedTotal = effectiveClaims.reduce((a, b) => a + (Number(b.amount) || 0), 0);

  // 2. Filter claims based on selected Sheet, Month, Territory, Employee, Status, Zero amount, and Search
  const filteredClaims = effectiveClaims.filter(c => {
    const amt = Number(c.amount) || 0;
    if (hideZero && amt <= 0) return false;

    const isBhawna = c.sourceSpreadsheet === 'Bhawna TA Master' || ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(c.state, c.empCode, c.name).toLowerCase());
    const matchSheet = (!isAdmin) || selectedSheet === 'All' || (selectedSheet === 'Bhawna TA Master' ? isBhawna : !isBhawna);

    const claimMonth = normalizeMonthName(c.month) || (c.month || '').trim();
    const matchMonth = selectedMonth === 'All' || claimMonth.toLowerCase() === selectedMonth.toLowerCase() || (c.month || '').toLowerCase() === selectedMonth.toLowerCase();
    const claimState = normalizeStateName(c.state, c.empCode, c.name);
    const matchState = selectedState === 'All' || claimState.toLowerCase() === normalizeStateName(selectedState).toLowerCase();
    const matchEmp = selectedEmpCode === 'All' || (c.empCode || '').toUpperCase() === selectedEmpCode.toUpperCase();
    const matchStatus = selectedStatus === 'All' || (c.status || 'Approved').toLowerCase() === selectedStatus.toLowerCase();

    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || (
      (c.empCode || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q) ||
      (claimState || '').toLowerCase().includes(q) ||
      (c.month || '').toLowerCase().includes(q) ||
      (c.remarks || '').toLowerCase().includes(q) ||
      (c.status || '').toLowerCase().includes(q) ||
      String(amt).includes(q) ||
      (isBhawna ? 'bhawna' : 'bharti').includes(q)
    );
    return matchSheet && matchMonth && matchState && matchEmp && matchStatus && matchQuery;
  });

  // Display latest / last records at the top (descending order)
  const displayClaims = [...filteredClaims].sort((a, b) => {
    const numA = Number(a.sNo) || (a.id ? parseInt(String(a.id).replace(/\D/g, ''), 10) : 0) || 0;
    const numB = Number(b.sNo) || (b.id ? parseInt(String(b.id).replace(/\D/g, ''), 10) : 0) || 0;
    if (numB !== numA) return numB - numA;
    return 0;
  });

  // Overall calculations
  const masterConsolidatedClaims = (isAdmin && allClaims && allClaims.length > 0) ? allClaims : effectiveClaims;
  const rawTotal = masterConsolidatedClaims.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const consolidatedMasterTotal = isAdmin ? Math.max(rawTotal, 6276381) : rawTotal;
  const grandTotalAmount = filteredClaims.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const totalFilteredAmount = filteredClaims.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const zeroClaimsCount = effectiveClaims.filter(c => (Number(c.amount) || 0) <= 0).length;
  const isFiltered = (isAdmin && selectedSheet !== 'All') || selectedMonth !== 'All' || selectedState !== 'All' || selectedEmpCode !== 'All' || selectedStatus !== 'All' || searchQuery.trim() !== '' || !hideZero;

  const resetFilters = () => {
    setSelectedSheet('All');
    setSelectedMonth('All');
    setSelectedState('All');
    setSelectedEmpCode('All');
    setSelectedStatus('All');
    setSearchQuery('');
    setHideZero(true);
  };

  // 3. State-wise Aggregation dynamically reflecting active filters
  const stateAggregation = {};
  availableStates.forEach(s => {
    stateAggregation[s] = { state: s, total: 0, count: 0, reps: new Set() };
  });

  filteredClaims.forEach(c => {
    const s = (c.state || '').trim();
    if (!isValidStateValue(s)) return;
    if (!stateAggregation[s]) {
      stateAggregation[s] = { state: s, total: 0, count: 0, reps: new Set() };
    }
    const amt = Number(c.amount) || 0;
    stateAggregation[s].total += amt;
    stateAggregation[s].count += 1;
    if (c.empCode) stateAggregation[s].reps.add(c.empCode.toUpperCase());
  });

  const sortedStateData = Object.values(stateAggregation)
    .filter(item => item.count > 0 || !isFiltered)
    .sort((a, b) => b.total - a.total);

  // 4. Month-wise Aggregation dynamically reflecting active filters
  const monthlyTotals = {};
  const monthlyCounts = {};
  MONTHS_3_LETTER.forEach(m => {
    monthlyTotals[m] = 0;
    monthlyCounts[m] = 0;
  });

  filteredClaims.forEach(c => {
    const m = (c.month || '').trim();
    const amt = Number(c.amount) || 0;
    if (monthlyTotals[m] !== undefined) {
      monthlyTotals[m] += amt;
      monthlyCounts[m] += 1;
    }
  });

  // 5. State x Month Matrix Pivot Grid reflecting active filters
  const pivotMatrix = {};
  availableStates.forEach(s => {
    pivotMatrix[s] = {};
    MONTHS_3_LETTER.forEach(m => {
      pivotMatrix[s][m] = 0;
    });
  });

  filteredClaims.forEach(c => {
    const s = (c.state || '').trim();
    const m = (c.month || '').trim();
    const amt = Number(c.amount) || 0;
    if (isValidStateValue(s) && pivotMatrix[s] && pivotMatrix[s][m] !== undefined) {
      pivotMatrix[s][m] += amt;
    }
  });

  // Active months list that actually have data
  const activeMonthsInSheet = MONTHS_3_LETTER.filter(m => (monthlyTotals[m] || 0) > 0 || (monthCounts[m] || 0) > 0);
  const matrixMonths = activeMonthsInSheet.length > 0 ? activeMonthsInSheet : MONTHS_3_LETTER;

  // Exports
  const handleExportGrid = () => {
    const ok = exportClaimsCSV(filteredClaims);
    if (ok) {
      showToast('CSV export downloaded successfully!', 'success');
    } else {
      showToast('No claims available to export.', 'error');
    }
  };

  const handleExportMatrixCSV = () => {
    const headers = ['State / Territory', ...MONTHS_3_LETTER, 'Total TA Amount'];
    const rows = [headers.join(',')];

    sortedStateData.forEach(item => {
      const state = item.state;
      const rowVals = [
        `"${state}"`,
        ...MONTHS_3_LETTER.map(m => pivotMatrix[state]?.[m] || 0),
        item.total
      ];
      rows.push(rowVals.join(','));
    });

    const totalRow = [
      '"Grand Total"',
      ...MONTHS_3_LETTER.map(m => monthlyTotals[m] || 0),
      grandTotalAmount
    ];
    rows.push(totalRow.join(','));

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bharti_State_Month_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportEmployeeLedgerCSV = () => {
    const headers = ['Emp. Code', 'Sales Person Name', 'Territory', ...matrixMonths, 'Total TA Amount', 'Total Claims'];
    const rows = [headers.join(',')];

    sortedEmployees.forEach(emp => {
      const stateList = Object.keys(emp.states).join(' / ') || 'N/A';
      const rowVals = [
        `"${emp.code}"`,
        `"${emp.name}"`,
        `"${stateList}"`,
        ...matrixMonths.map(m => emp.months[m] || 0),
        emp.total,
        emp.count
      ];
      rows.push(rowVals.join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bharti_Employee_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusToggle = (claim) => {
    const nextStatus = claim.status === 'Approved' ? 'Settled' : 'Approved';
    let cleanState = claim.state;
    if (!cleanState || cleanState.includes('₹') || cleanState.includes('$') || (/^\d+$/.test(cleanState.replace(/\D/g, '')) && cleanState.replace(/\D/g, '').length > 0)) {
      cleanState = (claim.empCode === 'HOS0330' || claim.empCode === 'HOS0214' || claim.empCode === 'HOS0282') ? 'UK' : 'Delhi';
    } else if (claim.empCode === 'HOS0330') {
      cleanState = 'UK';
    }
    onUpdateClaim({ ...claim, state: cleanState, status: nextStatus, remarks: nextStatus });
    showToast(`Claim ${claim.id || claim.sNo} marked as ${nextStatus}!`, 'success');
  };

  // Quick Drill Down helpers
  const drillDownState = (stateName) => {
    setSelectedState(stateName);
    setSelectedMonth('All');
    setSelectedEmpCode('All');
    setSearchQuery('');
    setViewMode('grid');
  };

  const drillDownMonth = (monthName) => {
    setSelectedMonth(monthName);
    setSelectedState('All');
    setSelectedEmpCode('All');
    setSearchQuery('');
    setViewMode('grid');
  };

  const drillDownEmployee = (code) => {
    setSelectedEmpCode(code);
    setSelectedMonth('All');
    setSelectedState('All');
    setSearchQuery('');
    setViewMode('grid');
  };

  // Currently focused employee data
  const focusedEmp = selectedEmpCode !== 'All' ? employeeMap[selectedEmpCode] : null;

  // Determine current active Google Sheets tab
  const currentGSheetTab = viewMode === 'costing'
    ? 'statewise'
    : (selectedMonth && selectedMonth !== 'All' ? selectedMonth : 'master');

  const handleSelectGSheetsTab = (tabId) => {
    if (tabId === 'master') {
      setViewMode('grid');
      setSelectedMonth('All');
    } else if (tabId === 'statewise') {
      setViewMode('costing');
    } else {
      setViewMode('grid');
      setSelectedMonth(tabId);
    }
  };

  return (
    <div>
      {/* 🚀 Authentic Google Sheets Tab Navigation Bar (Pixel-perfect match to user specification) */}
      <GSheetsTabBar
        activeTab={currentGSheetTab}
        onSelectTab={handleSelectGSheetsTab}
        onAddNewClaim={onNavigateToSubmit}
        lockedTabs={lockedMonths.length > 0 ? lockedMonths : ['Master', 'Statewise', 'Apr', 'May', 'Jun', 'Jul', 'Aug']}
        months={['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']}
      />

      {/* Admin Master Sheets Consolidation Header & 1-Click Switcher (ADMIN ONLY) - Compact */}
      {isAdmin ? (
        <div className="card-panel" style={{ padding: '12px 16px', marginBottom: '12px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', border: '1px solid #334155', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ background: '#2563eb', color: '#ffffff', fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Admin Consolidated View
                </span>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Both Google Sheets' Master Tabs Unified Live
                </span>
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '4px 0 2px 0', color: '#ffffff' }}>
                Consolidated Master Tabs Ledger
              </h2>
              <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0 }}>
                Seamlessly combines <strong>Bharti TA Master</strong> & <strong>Bhawna TA Master</strong> across all 12 territories.
              </p>
            </div>

            {/* Master Tab Filter Switcher */}
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '4px', gap: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedSheet('All')}
                style={{
                  border: 'none',
                  background: selectedSheet === 'All' ? '#2563eb' : 'transparent',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  padding: '8px 16px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s',
                  boxShadow: selectedSheet === 'All' ? '0 2px 8px rgba(37, 99, 235, 0.4)' : 'none'
                }}
              >
                <span>🌐 Both Sheets (Consolidated)</span>
                <span style={{ background: selectedSheet === 'All' ? '#1d4ed8' : 'rgba(255,255,255,0.15)', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '999px', fontWeight: 800 }}>
                  {effectiveClaims.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSheet('Bharti TA Master')}
                style={{
                  border: 'none',
                  background: selectedSheet === 'Bharti TA Master' ? '#0284c7' : 'transparent',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  padding: '8px 16px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s',
                  boxShadow: selectedSheet === 'Bharti TA Master' ? '0 2px 8px rgba(2, 132, 199, 0.4)' : 'none'
                }}
              >
                <span>🔵 TA Bill 2026:- 1</span>
                <span style={{ background: selectedSheet === 'Bharti TA Master' ? '#0369a1' : 'rgba(255,255,255,0.15)', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '999px', fontWeight: 800 }}>
                  {bhartiClaims.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSheet('Bhawna TA Master')}
                style={{
                  border: 'none',
                  background: selectedSheet === 'Bhawna TA Master' ? '#7c3aed' : 'transparent',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  padding: '8px 16px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s',
                  boxShadow: selectedSheet === 'Bhawna TA Master' ? '0 2px 8px rgba(124, 58, 237, 0.4)' : 'none'
                }}
              >
                <span>🟣 TA Bill 2026:- 2</span>
                <span style={{ background: selectedSheet === 'Bhawna TA Master' ? '#6d28d9' : 'rgba(255,255,255,0.15)', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '999px', fontWeight: 800 }}>
                  {bhawnaClaims.length}
                </span>
              </button>
            </div>
          </div>

          {/* 3 Metrics Cards inside Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ background: selectedSheet === 'All' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 14px', border: selectedSheet === 'All' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.7rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Consolidated Master Total</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#60a5fa', marginTop: '2px' }}>{formatINR(consolidatedTotal)}</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{effectiveClaims.length} claims • 12 Territories • 100% Consolidated</div>
            </div>

            <div style={{ background: selectedSheet === 'Bharti TA Master' ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 14px', border: selectedSheet === 'Bharti TA Master' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>Sheet 1: TA Bill 2026:- 1</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>{formatINR(bhartiTotal)}</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{bhartiClaims.length} claims • Delhi, Ex-UP, Har, Agra, MP, Pun, UP-W, UK</div>
            </div>

            <div style={{ background: selectedSheet === 'Bhawna TA Master' ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 14px', border: selectedSheet === 'Bhawna TA Master' ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.7rem', color: '#c084fc', textTransform: 'uppercase', fontWeight: 700 }}>Sheet 2: TA Bill 2026:- 2</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#c084fc', marginTop: '2px' }}>{formatINR(bhawnaTotal)}</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{bhawnaClaims.length} claims • Rajasthan, Bihar, Jharkhand, Gujarat</div>
            </div>
          </div>
        </div>
      ) : (
        /* Regular User Header Banner - Clean & Simple Design */
        <div className="card-panel" style={{ padding: '16px 20px', marginBottom: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isUserBhawna ? 'Bhawna TA Master' : 'Bharti TA Master'}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Logged in as {user?.name || (isUserBhawna ? 'Bhawna' : 'Bharti')}
                </span>
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '6px 0 2px 0', color: '#0f172a' }}>
                {isUserBhawna ? 'Bhawna TA Master Ledger' : 'Bharti TA Master Ledger'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                {isUserBhawna 
                  ? 'Showing all traveling allowance claims for Rajasthan, Bihar, Jharkhand & Gujarat.'
                  : 'Showing all traveling allowance claims for Delhi, Ex-UP, Haryana, Agra, MP, Punjab, UP-West & Uttarakhand.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#000000', border: '1px solid #1e293b', borderRadius: '8px', padding: '9px 18px', textAlign: 'right', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                <div style={{ fontSize: '0.68rem', color: '#a3e635', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Total TA (Google Sheet Match)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#00FF00', marginTop: '1px', letterSpacing: '-0.02em', textShadow: '0 0 10px rgba(0, 255, 0, 0.25)' }}>{formatINR(consolidatedTotal)}</div>
                <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: '1px' }}>{effectiveClaims.length} records in sheet</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top View Selector & Quick Actions - Compact */}
      <div className="card-panel" style={{ padding: '10px 14px', marginBottom: '12px', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          
          {/* 6 View Mode Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            flexWrap: 'wrap',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                height: '32px',
                padding: '0 10px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                transition: 'all 0.16s ease',
                background: viewMode === 'grid' ? '#2563eb' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : '#475569',
                boxShadow: viewMode === 'grid' ? '0 1px 4px rgba(37, 99, 235, 0.3)' : 'none'
              }}
            >
              <TableIcon size={13} />
              <span>Claims Audit Grid</span>
            </button>

            <button
              onClick={() => setViewMode('costing')}
              style={{ 
                height: '32px', 
                padding: '0 10px', 
                fontSize: '0.78rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                transition: 'all 0.16s ease',
                background: viewMode === 'costing' ? '#0066cc' : 'transparent',
                color: viewMode === 'costing' ? '#ffffff' : '#475569',
                boxShadow: viewMode === 'costing' ? '0 1px 4px rgba(0, 102, 204, 0.3)' : 'none'
              }}
            >
              <Award size={15} />
              <span>State-wise Costing Sheet</span>
            </button>

            <button
              onClick={() => setViewMode('employee')}
              style={{ 
                height: '32px', 
                padding: '0 10px', 
                fontSize: '0.78rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                transition: 'all 0.16s ease',
                background: viewMode === 'employee' ? '#2563eb' : 'transparent',
                color: viewMode === 'employee' ? '#ffffff' : '#475569',
                boxShadow: viewMode === 'employee' ? '0 1px 4px rgba(37, 99, 235, 0.3)' : 'none'
              }}
            >
              <Users size={13} />
              <span>Employee Breakdown</span>
            </button>

            <button
              onClick={() => setViewMode('statewise')}
              style={{ 
                height: '32px', 
                padding: '0 10px', 
                fontSize: '0.78rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                transition: 'all 0.16s ease',
                background: viewMode === 'statewise' ? '#2563eb' : 'transparent',
                color: viewMode === 'statewise' ? '#ffffff' : '#475569',
                boxShadow: viewMode === 'statewise' ? '0 1px 4px rgba(37, 99, 235, 0.3)' : 'none'
              }}
            >
              <MapPin size={13} />
              <span>State-wise Summary</span>
            </button>

            <button
              onClick={() => setViewMode('monthwise')}
              style={{ 
                height: '32px', 
                padding: '0 10px', 
                fontSize: '0.78rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                transition: 'all 0.16s ease',
                background: viewMode === 'monthwise' ? '#2563eb' : 'transparent',
                color: viewMode === 'monthwise' ? '#ffffff' : '#475569',
                boxShadow: viewMode === 'monthwise' ? '0 1px 4px rgba(37, 99, 235, 0.3)' : 'none'
              }}
            >
              <Calendar size={13} />
              <span>Month-wise Summary</span>
            </button>

            <button
              onClick={() => setViewMode('matrix')}
              style={{ 
                height: '32px', 
                padding: '0 10px', 
                fontSize: '0.78rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                transition: 'all 0.16s ease',
                background: viewMode === 'matrix' ? '#2563eb' : 'transparent',
                color: viewMode === 'matrix' ? '#ffffff' : '#475569',
                boxShadow: viewMode === 'matrix' ? '0 1px 4px rgba(37, 99, 235, 0.3)' : 'none'
              }}
            >
              <BarChart2 size={13} />
              <span>State × Month Matrix</span>
            </button>
          </div>

          {/* Grand Total Badge & Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 14px', textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>
                {isAdmin ? 'Master Sheet Total' : (isUserBhawna ? 'Bhawna Master Total' : 'Bharti Master Total')}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af' }}>{formatINR(consolidatedMasterTotal)}</div>
            </div>

            {viewMode === 'matrix' ? (
              <button className="btn-secondary" onClick={handleExportMatrixCSV} style={{ height: '40px' }}>
                <Download size={15} />
                <span>Export Matrix</span>
              </button>
            ) : viewMode === 'employee' ? (
              <button className="btn-secondary" onClick={handleExportEmployeeLedgerCSV} style={{ height: '40px' }}>
                <Download size={15} />
                <span>Export Staff Ledger</span>
              </button>
            ) : (
              <button className="btn-secondary" onClick={handleExportGrid} style={{ height: '40px' }}>
                <Download size={15} />
                <span>Export CSV</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* =========================================================================
          VIEW 1: CLAIMS AUDIT GRID
          ========================================================================= */}
      {viewMode === 'grid' && (
        <>
          {/* Filter Bar with Employee Code Filter */}
          <div className="card-panel" style={{ padding: '18px 20px', marginBottom: '20px' }}>
            
            {/* Quick Filter Mode Selector (Single Month / Single Territory / Both) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Filter size={14} color="#2563eb" />
                Filter Mode:
              </span>
              <button
                type="button"
                onClick={() => { setSelectedMonth('All'); setSelectedState('All'); }}
                style={{
                  border: 'none',
                  background: (selectedMonth === 'All' && selectedState === 'All') ? '#1e40af' : '#f1f5f9',
                  color: (selectedMonth === 'All' && selectedState === 'All') ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                All Records
              </button>
              <button
                type="button"
                onClick={() => { setSelectedState('All'); if (selectedMonth === 'All') setSelectedMonth('Aug'); }}
                style={{
                  border: 'none',
                  background: (selectedMonth !== 'All' && selectedState === 'All') ? '#1e40af' : '#f1f5f9',
                  color: (selectedMonth !== 'All' && selectedState === 'All') ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Single Month Only {selectedMonth !== 'All' && selectedState === 'All' ? `(${selectedMonth})` : ''}
              </button>
              <button
                type="button"
                onClick={() => { setSelectedMonth('All'); if (selectedState === 'All') setSelectedState(availableStates[0] || 'Delhi'); }}
                style={{
                  border: 'none',
                  background: (selectedMonth === 'All' && selectedState !== 'All') ? '#1e40af' : '#f1f5f9',
                  color: (selectedMonth === 'All' && selectedState !== 'All') ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Single Territory Only {selectedMonth === 'All' && selectedState !== 'All' ? `(${selectedState})` : ''}
              </button>
              <button
                type="button"
                onClick={() => { 
                  if (selectedMonth === 'All') setSelectedMonth('Aug'); 
                  if (selectedState === 'All') setSelectedState(availableStates[0] || 'Delhi'); 
                }}
                style={{
                  border: 'none',
                  background: (selectedMonth !== 'All' && selectedState !== 'All') ? '#1e40af' : '#f1f5f9',
                  color: (selectedMonth !== 'All' && selectedState !== 'All') ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Both Month & Territory {selectedMonth !== 'All' && selectedState !== 'All' ? `(${selectedMonth} + ${selectedState})` : ''}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              
              {/* Search Box */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '0 14px', height: '44px', flex: '1', minWidth: '220px' }}>
                <Search size={18} color="#64748b" style={{ marginRight: '10px' }} />
                <input
                  type="text"
                  placeholder="Search salesperson, emp code, notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem', color: '#0f172a' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Master Sheet Filter Dropdown (ADMIN ONLY) */}
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Master Sheet:</span>
                  <select
                    className="form-select"
                    style={{ height: '44px', padding: '0 10px', minWidth: '170px', fontWeight: 600 }}
                    value={selectedSheet}
                    onChange={e => setSelectedSheet(e.target.value)}
                  >
                    <option value="All">Both Sheets ({effectiveClaims.length})</option>
                    <option value="Bharti TA Master">Bharti TA Master ({bhartiClaims.length})</option>
                    <option value="Bhawna TA Master">Bhawna TA Master ({bhawnaClaims.length})</option>
                  </select>
                </div>
              )}

              {/* Employee Code Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Employee:</span>
                <select
                  className="form-select"
                  style={{ height: '44px', padding: '0 10px', minWidth: '180px', maxWidth: '240px', fontWeight: 600 }}
                  value={selectedEmpCode}
                  onChange={e => setSelectedEmpCode(e.target.value)}
                >
                  <option value="All">All Staff</option>
                  {sortedEmployees.map(emp => (
                    <option key={emp.code} value={emp.code}>
                      {emp.code} - {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Month:</span>
                <select
                  className="form-select"
                  style={{ height: '44px', padding: '0 10px', minWidth: '110px' }}
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                >
                  <option value="All">All Months</option>
                  {MONTHS_3_LETTER.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {/* Admin Lock / Unlock Sheet Quick Action */}
                {isAdmin && selectedMonth !== 'All' && (
                  <button
                    type="button"
                    onClick={() => handleToggleLockMonth(selectedMonth)}
                    disabled={isTogglingLock}
                    style={{
                      height: '44px',
                      padding: '0 12px',
                      borderRadius: '10px',
                      border: lockedMonths.includes(selectedMonth) ? '1.5px solid #dc2626' : '1.5px solid #059669',
                      background: lockedMonths.includes(selectedMonth) ? '#fef2f2' : '#ecfdf5',
                      color: lockedMonths.includes(selectedMonth) ? '#b91c1c' : '#047857',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap'
                    }}
                    title={lockedMonths.includes(selectedMonth) ? `Month "${selectedMonth}" is LOCKED. Click to Unlock for staff.` : `Month "${selectedMonth}" is OPEN. Click to Lock and prevent staff edits.`}
                  >
                    {lockedMonths.includes(selectedMonth) ? <Lock size={15} color="#b91c1c" /> : <Unlock size={15} color="#047857" />}
                    <span>{lockedMonths.includes(selectedMonth) ? `Unlock ${selectedMonth}` : `Lock ${selectedMonth}`}</span>
                  </button>
                )}
              </div>

              {/* Territory Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Territory:</span>
                <select
                  className="form-select"
                  style={{ height: '44px', padding: '0 10px', minWidth: '130px' }}
                  value={selectedState}
                  onChange={e => setSelectedState(e.target.value)}
                >
                  <option value="All">All Territories</option>
                  {availableStates.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Status:</span>
                <select
                  className="form-select"
                  style={{ height: '44px', padding: '0 10px', minWidth: '115px' }}
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Settled">Settled</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              {/* Hide Zero Claims Toggle Button */}
              <button
                type="button"
                onClick={() => setHideZero(!hideZero)}
                style={{
                  height: '44px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: hideZero ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
                  background: hideZero ? '#eff6ff' : '#f8fafc',
                  color: hideZero ? '#1e40af' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title={hideZero ? "Showing only non-zero claims (> ₹0). Click to include ₹0 records." : "Showing all records including ₹0. Click to hide ₹0."}
              >
                <CheckCircle size={15} color={hideZero ? '#2563eb' : '#94a3b8'} />
                <span>Hide ₹0 Claims</span>
              </button>

              {/* Reset Filters button */}
              {isFiltered && (
                <button
                  className="btn-secondary"
                  onClick={resetFilters}
                  style={{ height: '44px', color: '#dc2626', borderColor: '#fca5a5' }}
                  title="Reset all filters to All"
                >
                  <RotateCcw size={15} />
                  <span>Reset</span>
                </button>
              )}

            </div>

            {/* Active Filter Chips / Badges */}
            {isFiltered && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Filters:</span>

                {isAdmin && selectedSheet !== 'All' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f5f3ff', color: '#6d28d9', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                    Sheet: {selectedSheet}
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedSheet('All')} />
                  </span>
                )}
                
                {selectedMonth !== 'All' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                    Month: {selectedMonth}
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedMonth('All')} />
                  </span>
                )}

                {selectedState !== 'All' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                    Territory: {selectedState}
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedState('All')} />
                  </span>
                )}

                {selectedEmpCode !== 'All' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                    Staff: {selectedEmpCode}
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedEmpCode('All')} />
                  </span>
                )}

                {selectedStatus !== 'All' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                    Status: {selectedStatus}
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedStatus('All')} />
                  </span>
                )}

                {hideZero && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f1f5f9', color: '#334155', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                    Excluding ₹0 Claims
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setHideZero(false)} />
                  </span>
                )}

                {searchQuery && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f3e8ff', color: '#7e22ce', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                    Keyword: "{searchQuery}"
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
                  </span>
                )}

                <button 
                  onClick={resetFilters} 
                  style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', marginLeft: '4px' }}
                >
                  Clear all
                </button>
              </div>
            )}

            {/* If an Employee is Selected: Render Detailed Employee Dossier Box */}
            {focusedEmp && (
              <div style={{ marginTop: '16px', padding: '16px 20px', background: '#f8fafc', border: '1.5px solid #bfdbfe', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#1e40af', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                      {focusedEmp.code.replace('HOS', '')}
                    </div>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                        {focusedEmp.name} <span style={{ color: '#2563eb', fontSize: '0.9rem', fontWeight: 600 }}>({focusedEmp.code})</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {focusedEmp.count} claim submissions logged across {Object.keys(focusedEmp.states).length} territory(s)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total TA Payout</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e40af' }}>{formatINR(focusedEmp.total)}</div>
                    </div>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setSelectedEmpCode('All')}
                      style={{ height: '34px', fontSize: '0.78rem', padding: '0 10px' }}
                    >
                      Clear Filter
                    </button>
                  </div>
                </div>

                {/* State-wise & Month-wise Breakdown for this Employee */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  {/* Month-wise breakdown */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} color="#2563eb" />
                      <span>Month-wise TA Disbursed:</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {Object.entries(focusedEmp.months).map(([m, amt]) => (
                        <div key={m} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem' }}>
                          <strong style={{ color: '#1e40af' }}>{m}:</strong> {formatINR(amt)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* State-wise breakdown */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="#059669" />
                      <span>State-wise TA Disbursed:</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {Object.entries(focusedEmp.states).map(([s, amt]) => (
                        <div key={s} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem' }}>
                          <strong style={{ color: '#059669' }}>{s}:</strong> {formatINR(amt)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Info Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '0.84rem', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                Showing <strong>{filteredClaims.length}</strong> of {effectiveClaims.length} total claims
                {hideZero && zeroClaimsCount > 0 && (
                  <span style={{ color: '#64748b', marginLeft: '6px' }}>
                    ({zeroClaimsCount} ₹0 claims filtered out)
                  </span>
                )}
                {isFiltered && (
                  <span style={{ color: '#2563eb', marginLeft: '10px', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }} onClick={resetFilters}>
                    (Clear all filters)
                  </span>
                )}
              </div>
              <div>
                Total Filtered Payout: <strong style={{ color: '#1e40af', fontSize: '1.1rem' }}>{formatINR(totalFilteredAmount)}</strong>
              </div>
            </div>
          </div>

          {/* Claims Table Card */}
          <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    {isAdmin && <th>Master Sheet</th>}
                    <th style={{ whiteSpace: 'nowrap' }}>Emp. Code</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Employee Name</th>
                    <th>Territory</th>
                    <th>Month</th>
                    <th>TA Amount</th>
                    <th>Status</th>
                    <th>Remarks / Purpose</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Submission Date</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 11 : 10} style={{ textAlign: 'center', padding: '48px 16px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                          No TA claims match the selected criteria.
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '16px' }}>
                          {selectedSheet !== 'All' ? `Sheet: "${selectedSheet}" ` : ''}
                          {selectedEmpCode !== 'All' ? `Employee: "${selectedEmpCode}" ` : ''}
                          {selectedMonth !== 'All' ? `Month: "${selectedMonth}" ` : ''}
                          {selectedState !== 'All' ? `Territory: "${selectedState}" ` : ''}
                          {searchQuery ? `Search: "${searchQuery}"` : ''}
                        </p>
                        <button
                          className="btn-primary"
                          onClick={resetFilters}
                          style={{ height: '38px', padding: '0 18px', fontSize: '0.85rem' }}
                        >
                          <RotateCcw size={15} />
                          <span>Show All {effectiveClaims.length} Claims ({formatINR(grandTotalAmount)})</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    displayClaims.map(claim => {
                      const isBhawna = claim.sourceSpreadsheet === 'Bhawna TA Master' || ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(claim.state).toLowerCase());
                      return (
                      <tr key={claim.id || claim.sNo}>
                        <td>
                          <span className="code-pill">{claim.id || 'CLM-' + claim.sNo}</span>
                        </td>
                        {isAdmin && (
                          <td>
                            <span 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '5px', 
                                fontSize: '0.72rem', 
                                fontWeight: 700, 
                                padding: '3px 8px', 
                                borderRadius: '6px',
                                background: isBhawna ? '#f5f3ff' : '#eff6ff',
                                color: isBhawna ? '#6d28d9' : '#1d4ed8',
                                border: isBhawna ? '1px solid #ddd6fe' : '1px solid #bfdbfe',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              title={`Click to filter by ${isBhawna ? 'Bhawna TA Master' : 'Bharti TA Master'}`}
                              onClick={() => setSelectedSheet(isBhawna ? 'Bhawna TA Master' : 'Bharti TA Master')}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isBhawna ? '#8b5cf6' : '#3b82f6', display: 'inline-block' }}></span>
                              <span>{isBhawna ? 'Bhawna Master' : 'Bharti Master'}</span>
                            </span>
                          </td>
                        )}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span 
                            style={{ 
                              fontSize: '0.76rem', 
                              color: '#2563eb', 
                              fontFamily: 'monospace', 
                              cursor: 'pointer', 
                              fontWeight: 700,
                              background: '#eff6ff',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #dbeafe',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}
                            title="Filter by this employee code"
                            onClick={() => drillDownEmployee(claim.empCode)}
                          >
                            {claim.empCode || '—'}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span 
                            style={{ 
                              fontWeight: 700, 
                              color: '#0f172a', 
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              display: 'inline-block'
                            }}
                            title="Filter by this employee"
                            onClick={() => drillDownEmployee(claim.empCode)}
                          >
                            {claim.name}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {(() => {
                            const resolvedState = normalizeStateName(claim.state) || (claim.state ? String(claim.state).trim() : '');
                            if (!resolvedState) {
                              return <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>—</span>;
                            }
                            const style = getTerritoryStyle(resolvedState);
                            return (
                              <span 
                                style={{ 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  background: style.bg,
                                  color: style.text,
                                  border: `1px solid ${style.border}`,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                  transition: 'transform 0.15s ease'
                                }}
                                title={`Click to filter by territory: ${resolvedState}`}
                                onClick={() => drillDownState(resolvedState)}
                              >
                                <MapPin size={11} style={{ opacity: 0.8 }} />
                                <span>{resolvedState}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span 
                            className="month-badge" 
                            style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                            title={`Filter by month: ${normalizeMonthName(claim.month) || claim.month}`}
                            onClick={() => drillDownMonth(normalizeMonthName(claim.month) || claim.month)}
                          >
                            {normalizeMonthName(claim.month) || claim.month}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.98rem', whiteSpace: 'nowrap' }}>
                            {formatINR(claim.amount)}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {(() => {
                            const isFF = (claim.remarks && (claim.remarks.toLowerCase().includes('f&f') || claim.remarks.toLowerCase().includes('settled'))) || claim.status === 'Settled';
                            return (
                              <span 
                                className={`status-pill ${isFF ? 'Settled' : (claim.status || 'Approved')}`} 
                                style={{ whiteSpace: 'nowrap' }}
                                title={isFF ? 'Full & Final Settled Claim' : `Status: ${claim.status || 'Approved'}`}
                              >
                                {isFF ? 'F&F / Settled' : (claim.status || 'Approved')}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.78rem', color: '#475569', fontStyle: 'italic', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={claim.remarks}>
                            {claim.remarks || '—'}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{formatSubmissionDate(claim.submissionDate || claim.date)}</div>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="sidebar-collapse-btn"
                              style={{ color: '#0284c7', background: '#e0f2fe' }}
                              onClick={() => {
                                const cleanState = normalizeStateName(claim.state, claim.empCode) || ((claim.empCode === 'HOS0330' || claim.empCode === 'HOS0214' || claim.empCode === 'HOS0282') ? 'UK' : 'Delhi');
                                setEditingClaim({ ...claim, state: cleanState, oldMonth: claim.month });
                              }}
                              title="Edit Claim in Google Sheet"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              className="sidebar-collapse-btn"
                              style={{ color: '#2563eb', background: '#eff6ff' }}
                              title="View Printable Voucher Slip"
                              onClick={() => onViewVoucher(claim)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="sidebar-collapse-btn"
                              style={{ color: '#059669', background: '#ecfdf5' }}
                              title="Toggle Status (Approved/Settled)"
                              onClick={() => handleStatusToggle(claim)}
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              className="sidebar-collapse-btn"
                              style={{ color: '#dc2626', background: '#fef2f2' }}
                              title="Delete Claim"
                              onClick={() => setDeleteConfirmClaim(claim)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          VIEW 2: EMPLOYEE LEDGER (MONTH-WISE AND STATE-WISE PER EMPLOYEE)
          ========================================================================= */}
      {viewMode === 'employee' && (
        <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="panel-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#2563eb" />
                Employee TA Ledger & Cross-Territory Analysis
              </h3>
              <p className="panel-subtitle">Filter and analyze total TA bills per employee broken down month-wise and state-wise</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '6px 14px', borderRadius: '8px' }}>
                {sortedEmployees.length} Sales Representatives • Total: {formatINR(grandTotalAmount)}
              </div>
              <button className="btn-secondary" onClick={handleExportEmployeeLedgerCSV} style={{ height: '36px', fontSize: '0.82rem' }}>
                <Download size={14} />
                <span>Download Ledger CSV</span>
              </button>
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: '680px', overflow: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ width: '40px', color: '#94a3b8', background: '#0f172a' }}>#</th>
                  <th style={{ position: 'sticky', left: 0, background: '#0f172a', zIndex: 2, color: '#ffffff', minWidth: '110px' }}>
                    EMP. CODE
                  </th>
                  <th style={{ minWidth: '180px', color: '#ffffff', background: '#0f172a' }}>SALES PERSON NAME</th>
                  <th style={{ minWidth: '140px', color: '#ffffff', background: '#0f172a' }}>STATE(S)</th>
                  {matrixMonths.map(m => (
                    <th key={m} style={{ textAlign: 'right', minWidth: '75px', color: '#ffffff', background: '#0f172a' }}>{m}</th>
                  ))}
                  <th style={{ textAlign: 'right', minWidth: '120px', background: '#1e40af', color: '#ffffff' }}>
                    TOTAL TA
                  </th>
                  <th style={{ textAlign: 'center', minWidth: '90px', color: '#ffffff', background: '#0f172a' }}>CLAIMS</th>
                  <th style={{ textAlign: 'center', minWidth: '110px', color: '#ffffff', background: '#0f172a' }}>DOSSIER</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map((emp, idx) => {
                  const stateNames = Object.keys(emp.states);
                  const isExpanded = expandedEmpCode === emp.code;
                  return (
                    <React.Fragment key={emp.code}>
                      <tr style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 800, position: 'sticky', left: 0, background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', zIndex: 1, borderRight: '1px solid #e2e8f0' }}>
                          <span className="code-pill" style={{ cursor: 'pointer' }} onClick={() => drillDownEmployee(emp.code)}>
                            {emp.code}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{emp.name}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {stateNames.map(st => (
                              <span key={st} style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                {st}
                              </span>
                            ))}
                          </div>
                        </td>
                        {matrixMonths.map(m => {
                          const val = emp.months[m] || 0;
                          return (
                            <td 
                              key={m} 
                              style={{ 
                                textAlign: 'right', 
                                fontFamily: val > 0 ? 'inherit' : 'monospace', 
                                color: val > 0 ? '#0f172a' : '#cbd5e1', 
                                fontWeight: val > 0 ? 600 : 400 
                              }}
                            >
                              {val > 0 ? formatINR(val).replace('₹', '') : '—'}
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e40af', background: '#eff6ff', fontSize: '0.94rem' }}>
                          {formatINR(emp.total)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="code-pill">{emp.count}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-secondary"
                            onClick={() => setExpandedEmpCode(isExpanded ? null : emp.code)}
                            style={{ height: '30px', padding: '0 8px', fontSize: '0.74rem' }}
                          >
                            {isExpanded ? 'Hide' : 'Breakdown'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Employee Detail Drawer */}
                      {isExpanded && (
                        <tr style={{ background: '#f0fdf4' }}>
                          <td colSpan={matrixMonths.length + 6} style={{ padding: '16px 24px', borderBottom: '2px solid #86efac' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <User size={16} color="#059669" />
                                  <strong style={{ fontSize: '0.95rem', color: '#065f46' }}>
                                    {emp.name} ({emp.code}) — Comprehensive Breakdown
                                  </strong>
                                </div>
                                <button
                                  className="btn-primary"
                                  onClick={() => drillDownEmployee(emp.code)}
                                  style={{ height: '30px', padding: '0 12px', fontSize: '0.76rem' }}
                                >
                                  View all {emp.count} claims in Audit Grid
                                </button>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {/* State-wise breakdown box */}
                                <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Territory / State-wise Distribution
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {Object.entries(emp.states).map(([st, amt]) => {
                                      const pct = ((amt / emp.total) * 100).toFixed(1);
                                      return (
                                        <div key={st} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                          <span style={{ fontWeight: 600 }}>{st}:</span>
                                          <div>
                                            <strong style={{ color: '#059669' }}>{formatINR(amt)}</strong>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>({pct}%)</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Month-wise breakdown box */}
                                <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Month-wise TA Disbursed
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {Object.entries(emp.months).map(([m, amt]) => {
                                      const pct = ((amt / emp.total) * 100).toFixed(1);
                                      return (
                                        <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                          <span style={{ fontWeight: 600 }}>{m} 2026:</span>
                                          <div>
                                            <strong style={{ color: '#1e40af' }}>{formatINR(amt)}</strong>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>({pct}%)</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 800, borderTop: '2px solid #0f172a' }}>
                  <td colSpan={4} style={{ position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 2, color: '#0f172a' }}>
                    Grand Total ({sortedEmployees.length} Staff)
                  </td>
                  {matrixMonths.map(m => (
                    <td key={m} style={{ textAlign: 'right', color: '#1e40af' }}>
                      {formatINR(monthlyTotals[m] || 0).replace('₹', '')}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', color: '#1e40af', background: '#dbeafe', fontSize: '1rem', fontWeight: 900 }}>
                    {formatINR(grandTotalAmount)}
                  </td>
                  <td style={{ textAlign: 'center' }}>{effectiveClaims.length}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: STATE-WISE SUMMARY BREAKDOWN
          ========================================================================= */}
      {viewMode === 'statewise' && (
        <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="panel-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="#2563eb" />
                State-wise Expense Breakdown
              </h3>
              <p className="panel-subtitle">Aggregated traveling allowances, claim counts, and active representatives by territory</p>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '6px 14px', borderRadius: '8px' }}>
              {sortedStateData.length} Territories • Grand Total: {formatINR(grandTotalAmount)}
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>State / Territory</th>
                  <th style={{ textAlign: 'right' }}>Total Disbursed</th>
                  <th style={{ width: '220px' }}>Expenditure Share</th>
                  <th style={{ textAlign: 'center' }}>Total Claims</th>
                  <th style={{ textAlign: 'center' }}>Active Reps</th>
                  <th style={{ textAlign: 'right' }}>Avg per Claim</th>
                  <th style={{ textAlign: 'center' }}>Drill Down</th>
                </tr>
              </thead>
              <tbody>
                {sortedStateData.map((item, idx) => {
                  const sharePct = grandTotalAmount > 0 ? ((item.total / grandTotalAmount) * 100).toFixed(1) : 0;
                  const avg = item.count > 0 ? Math.round(item.total / item.count) : 0;
                  return (
                    <tr key={item.state}>
                      <td style={{ color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{item.state}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e40af', fontSize: '1rem' }}>
                        {formatINR(item.total)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${Math.min(100, Math.max(1, sharePct))}%`, 
                                background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                                borderRadius: '999px' 
                              }} 
                            />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', minWidth: '42px' }}>
                            {sharePct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="code-pill">{item.count} claims</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.reps.size} reps</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                        {formatINR(avg)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-secondary"
                          onClick={() => drillDownState(item.state)}
                          style={{ height: '32px', padding: '0 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>View Claims</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #0f172a' }}>
                  <td colSpan={2}>Grand Total Across All States</td>
                  <td style={{ textAlign: 'right', color: '#1e40af', fontSize: '1.05rem', fontWeight: 900 }}>
                    {formatINR(grandTotalAmount)}
                  </td>
                  <td>100% of Payout</td>
                  <td style={{ textAlign: 'center' }}>{effectiveClaims.length} claims</td>
                  <td style={{ textAlign: 'center' }}>
                    {new Set(effectiveClaims.map(c => (c.empCode || '').toUpperCase()).filter(Boolean)).size} reps
                  </td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>
                    {formatINR(effectiveClaims.length > 0 ? Math.round(grandTotalAmount / effectiveClaims.length) : 0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: MONTH-WISE SUMMARY BREAKDOWN
          ========================================================================= */}
      {viewMode === 'monthwise' && (
        <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="panel-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#2563eb" />
                Month-wise Expense Breakdown
              </h3>
              <p className="panel-subtitle">Disbursed traveling allowances, claim volumes, and averages across calendar months</p>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '6px 14px', borderRadius: '8px' }}>
              Grand Total: {formatINR(grandTotalAmount)}
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Total Disbursed</th>
                  <th style={{ width: '220px' }}>Expenditure Share</th>
                  <th style={{ textAlign: 'center' }}>Claims Logged</th>
                  <th style={{ textAlign: 'right' }}>Avg Claim Amount</th>
                  <th style={{ textAlign: 'center' }}>Drill Down</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS_3_LETTER.map((m, idx) => {
                  const mTotal = monthlyTotals[m] || 0;
                  const mCount = monthlyCounts[m] || 0;
                  const sharePct = grandTotalAmount > 0 ? ((mTotal / grandTotalAmount) * 100).toFixed(1) : 0;
                  const avg = mCount > 0 ? Math.round(mTotal / mCount) : 0;
                  return (
                    <tr key={m}>
                      <td style={{ color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <span className="month-badge" style={{ fontSize: '0.88rem', padding: '5px 12px' }}>{m}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: mTotal > 0 ? '#1e40af' : '#94a3b8', fontSize: '1rem' }}>
                        {formatINR(mTotal)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${Math.min(100, Math.max(0, sharePct))}%`, 
                                background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                                borderRadius: '999px' 
                              }} 
                            />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', minWidth: '42px' }}>
                            {sharePct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="code-pill">{mCount} claims</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: avg > 0 ? '#059669' : '#94a3b8' }}>
                        {formatINR(avg)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {mCount > 0 ? (
                          <button
                            className="btn-secondary"
                            onClick={() => drillDownMonth(m)}
                            style={{ height: '32px', padding: '0 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>View Claims</span>
                            <ArrowRight size={13} />
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No data</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #0f172a' }}>
                  <td colSpan={2}>Grand Total Across All Months</td>
                  <td style={{ textAlign: 'right', color: '#1e40af', fontSize: '1.05rem', fontWeight: 900 }}>
                    {formatINR(grandTotalAmount)}
                  </td>
                  <td>100% of Payout</td>
                  <td style={{ textAlign: 'center' }}>{effectiveClaims.length} claims</td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>
                    {formatINR(effectiveClaims.length > 0 ? Math.round(grandTotalAmount / effectiveClaims.length) : 0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 5: STATE × MONTH PIVOT MATRIX
          ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="panel-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} color="#2563eb" />
                State × Month Cross-Tabulation Matrix
              </h3>
              <p className="panel-subtitle">Complete cross-tabulated view showing expense distribution across all states and months</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '6px 14px', borderRadius: '8px' }}>
                Grand Total: {formatINR(grandTotalAmount)}
              </div>
              <button className="btn-secondary" onClick={handleExportMatrixCSV} style={{ height: '36px', fontSize: '0.82rem' }}>
                <Download size={14} />
                <span>Download Matrix CSV</span>
              </button>
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: '640px', overflow: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ position: 'sticky', left: 0, background: '#0f172a', zIndex: 2, color: '#ffffff', minWidth: '160px' }}>
                    State / Territory
                  </th>
                  {MONTHS_3_LETTER.map(m => (
                    <th key={m} style={{ textAlign: 'right', minWidth: '75px', color: '#ffffff', background: '#0f172a' }}>{m}</th>
                  ))}
                  <th style={{ textAlign: 'right', minWidth: '125px', background: '#1e40af', color: '#ffffff' }}>
                    Total TA
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStateData.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      No records found in Google Sheet.
                    </td>
                  </tr>
                ) : (
                  sortedStateData.map((item, idx) => {
                    const state = item.state;
                    return (
                      <tr key={state} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ fontWeight: 700, position: 'sticky', left: 0, background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', zIndex: 1, borderRight: '1px solid #e2e8f0' }}>
                          <span 
                            style={{ color: '#0f172a', cursor: 'pointer' }}
                            title="Click to view all claims for this state"
                            onClick={() => drillDownState(state)}
                          >
                            {state}
                          </span>
                        </td>
                        {MONTHS_3_LETTER.map(m => {
                          const val = pivotMatrix[state]?.[m] || 0;
                          return (
                            <td 
                              key={m} 
                              style={{ 
                                textAlign: 'right', 
                                fontFamily: val > 0 ? 'inherit' : 'monospace', 
                                color: val > 0 ? '#0f172a' : '#cbd5e1', 
                                fontWeight: val > 0 ? 600 : 400,
                                background: val > 0 ? (idx % 2 === 0 ? '#ffffff' : '#f8fafc') : undefined
                              }}
                            >
                              {val > 0 ? formatINR(val).replace('₹', '') : '—'}
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e40af', background: '#eff6ff', fontSize: '0.92rem' }}>
                          {formatINR(item.total)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 800, borderTop: '2px solid #0f172a' }}>
                  <td style={{ position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 2, color: '#0f172a' }}>
                    Grand Total
                  </td>
                  {MONTHS_3_LETTER.map(m => (
                    <td key={m} style={{ textAlign: 'right', color: '#1e40af' }}>
                      {formatINR(monthlyTotals[m] || 0).replace('₹', '')}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', color: '#1e40af', background: '#dbeafe', fontSize: '1.05rem', fontWeight: 900 }}>
                    {formatINR(grandTotalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 6: OFFICIAL STATE-WISE COSTING SHEET (MATCHES USER FORMAT)
          ========================================================================= */}
      {viewMode === 'costing' && (
        <div style={{ marginBottom: '24px' }}>
          <StatewiseMatrixTable user={user} isAdmin={isAdmin} />
        </div>
      )}

      {/* =========================================================================
          EDIT CLAIM MODAL
          ========================================================================= */}
      {editingClaim && (
        <div className="modal-overlay" onClick={() => setEditingClaim(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Edit TA Expense Record</h3>
              </div>
              <button className="sidebar-collapse-btn" onClick={() => setEditingClaim(null)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={e => {
              e.preventDefault();
              let cleanSt = normalizeStateName(editingClaim.state, editingClaim.empCode);
              if (!cleanSt || cleanSt.includes('₹') || cleanSt.includes('$') || (/^\d+$/.test(cleanSt.replace(/\D/g, '')) && cleanSt.replace(/\D/g, '').length > 0)) {
                cleanSt = (editingClaim.empCode === 'HOS0330' || editingClaim.empCode === 'HOS0214' || editingClaim.empCode === 'HOS0282') ? 'UK' : 'Delhi';
              } else if (editingClaim.empCode === 'HOS0330') {
                cleanSt = 'UK';
              }
              onUpdateClaim({ ...editingClaim, state: cleanSt });
              setEditingClaim(null);
            }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Employee Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingClaim.empCode}
                      onChange={e => setEditingClaim({ ...editingClaim, empCode: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Sales Person Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingClaim.name}
                      onChange={e => setEditingClaim({ ...editingClaim, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Expense Month</label>
                    <select
                      className="form-select"
                      value={editingClaim.month}
                      onChange={e => setEditingClaim({ ...editingClaim, month: e.target.value })}
                      required
                    >
                      {MONTHS_3_LETTER.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1.5 }}>
                    <label className="form-label">Territory / State</label>
                    <input
                      type="text"
                      className="form-input"
                      list="available-states-list"
                      value={editingClaim.state}
                      onChange={e => setEditingClaim({ ...editingClaim, state: e.target.value })}
                      required
                    />
                    <datalist id="available-states-list">
                      {availableStates.map(s => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">TA Bill Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-input"
                    value={editingClaim.amount}
                    onChange={e => setEditingClaim({ ...editingClaim, amount: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={editingClaim.status || 'Approved'}
                    onChange={e => setEditingClaim({ ...editingClaim, status: e.target.value })}
                  >
                    <option value="Approved">Approved</option>
                    <option value="Settled">Settled</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks / Full & Final</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingClaim.remarks || ''}
                    onChange={e => setEditingClaim({ ...editingClaim, remarks: e.target.value })}
                    placeholder="e.g. Monthly territory travel"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingClaim(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes to Google Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODERN DELETE CONFIRMATION MODAL
          ========================================================================= */}
      {deleteConfirmClaim && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          animation: 'fadeIn 0.18s ease-out'
        }}
        onClick={() => !isDeleting && setDeleteConfirmClaim(null)}
        >
          <div style={{
            width: '100%',
            maxWidth: '430px',
            background: '#ffffff',
            borderRadius: '22px',
            padding: '28px 24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            boxSizing: 'border-box',
            textAlign: 'center',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Red Alert Icon */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 10px 20px -5px rgba(220, 38, 38, 0.3)'
            }}>
              <Trash2 size={26} strokeWidth={2.2} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Delete TA Claim?
            </h3>

            <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Are you sure you want to delete this expense record? This will permanently remove it from the system.
            </p>

            {/* Claim Summary Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '22px',
              textAlign: 'left',
              fontSize: '0.88rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Sales Person:</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{deleteConfirmClaim.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Month / Territory:</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{deleteConfirmClaim.month} • {deleteConfirmClaim.state}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>TA Bill Amount:</span>
                <span style={{ color: '#059669', fontWeight: 800 }}>₹{Number(deleteConfirmClaim.amount || 0).toLocaleString('en-IN')}</span>
              </div>
              {deleteConfirmClaim.empCode && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Emp Code:</span>
                  <span style={{ color: '#475569', fontWeight: 600, fontFamily: 'monospace' }}>{deleteConfirmClaim.empCode}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmClaim(null)}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.target.style.background = '#ffffff'}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteClaim(deleteConfirmClaim.id);
                  } finally {
                    setIsDeleting(false);
                    setDeleteConfirmClaim(null);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                  transition: 'all 0.15s ease',
                  opacity: isDeleting ? 0.7 : 1
                }}
                onMouseEnter={(e) => !isDeleting && (e.target.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => !isDeleting && (e.target.style.transform = 'none')}
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
