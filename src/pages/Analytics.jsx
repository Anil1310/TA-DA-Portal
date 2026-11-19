import React, { useState } from 'react';
import { 
  DollarSign, 
  FileCheck, 
  TrendingUp, 
  Users, 
  Award, 
  MapPin, 
  Calendar, 
  Table as TableIcon, 
  BarChart3, 
  Download,
  User
} from 'lucide-react';
import { formatINR, MONTHS_3_LETTER, normalizeStateName } from '../services/currency';
import StatewiseMatrixTable from '../components/StatewiseMatrixTable';

export default function Analytics({ claims, allClaims, staffList, user, isAdmin }) {
  const [activeTab, setActiveTab] = useState('costing'); // 'costing' | 'matrix' | 'employee' | 'statewise' | 'monthwise'
  const [expandedEmpCode, setExpandedEmpCode] = useState(null);

  // Sheet breakdown calculations
  const bhartiClaims = claims.filter(c => (c.sourceSpreadsheet === 'Bharti TA Master') || (!c.sourceSpreadsheet && !['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(String(c.state || '').toLowerCase())));
  const bhawnaClaims = claims.filter(c => (c.sourceSpreadsheet === 'Bhawna TA Master') || ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(String(c.state || '').toLowerCase()));
  const bhartiTotal = bhartiClaims.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const bhawnaTotal = bhawnaClaims.reduce((a, b) => a + (Number(b.amount) || 0), 0);

  // 1. Core KPIs
  const totalAmount = claims.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const totalClaimsCount = claims.length;
  const avgClaimAmount = totalClaimsCount > 0 ? Math.round(totalAmount / totalClaimsCount) : 0;
  
  const activeStaffCodes = new Set(claims.map(c => (c.empCode || '').toUpperCase()).filter(Boolean));
  const activeStaffCount = activeStaffCodes.size;

  // 2. Extract unique states from actual claims and staff
  const stateSet = new Set();
  claims.forEach(c => {
    const s = normalizeStateName(c.state, c.empCode) || (c.state || '').trim();
    if (s && !s.toUpperCase().includes('TOTAL')) stateSet.add(s);
  });
  if (Array.isArray(staffList)) {
    staffList.forEach(m => {
      const s = normalizeStateName(m.state, m.code) || (m.state || '').trim();
      if (s) stateSet.add(s);
    });
  }
  const allStates = Array.from(stateSet).sort((a, b) => a.localeCompare(b));

  // 3. Month-wise Aggregation
  const monthlyTotals = {};
  const monthlyCounts = {};
  MONTHS_3_LETTER.forEach(m => {
    monthlyTotals[m] = 0;
    monthlyCounts[m] = 0;
  });

  claims.forEach(c => {
    const m = (c.month || '').trim();
    const amt = Number(c.amount) || 0;
    if (monthlyTotals[m] !== undefined) {
      monthlyTotals[m] += amt;
      monthlyCounts[m] += 1;
    }
  });

  const maxMonthAmount = Math.max(...Object.values(monthlyTotals), 1);
  const activeMonthsInSheet = MONTHS_3_LETTER.filter(m => (monthlyTotals[m] || 0) > 0 || (monthlyCounts[m] || 0) > 0);
  const matrixMonths = activeMonthsInSheet.length > 0 ? activeMonthsInSheet : MONTHS_3_LETTER;

  // 4. State-wise Aggregation
  const stateAgg = {};
  allStates.forEach(s => {
    stateAgg[s] = { state: s, total: 0, count: 0, reps: new Set() };
  });

  claims.forEach(c => {
    const s = (c.state || 'Other').trim();
    if (!stateAgg[s]) {
      stateAgg[s] = { state: s, total: 0, count: 0, reps: new Set() };
    }
    const amt = Number(c.amount) || 0;
    stateAgg[s].total += amt;
    stateAgg[s].count += 1;
    if (c.empCode) stateAgg[s].reps.add(c.empCode.toUpperCase());
  });

  const sortedStates = Object.values(stateAgg).sort((a, b) => b.total - a.total);

  // 5. Employee-wise Aggregation (State & Month per Employee)
  const empMap = {};
  claims.forEach(c => {
    const code = (c.empCode || '').trim().toUpperCase();
    if (!code || code.includes('TOTAL') || code.includes('GRAND')) return;
    if (!empMap[code]) {
      empMap[code] = {
        code,
        name: c.name || code,
        states: {},
        months: {},
        total: 0,
        count: 0
      };
    }
    const amt = Number(c.amount) || 0;
    const s = (c.state || 'Other').trim();
    const m = (c.month || 'Other').trim();
    empMap[code].total += amt;
    empMap[code].count += 1;
    if (s) empMap[code].states[s] = (empMap[code].states[s] || 0) + amt;
    if (m) empMap[code].months[m] = (empMap[code].months[m] || 0) + amt;
  });

  const sortedEmps = Object.values(empMap).sort((a, b) => b.total - a.total);

  // 6. State x Month Matrix Pivot Grid
  const pivotMatrix = {};
  allStates.forEach(s => {
    pivotMatrix[s] = {};
    MONTHS_3_LETTER.forEach(m => {
      pivotMatrix[s][m] = 0;
    });
  });

  claims.forEach(c => {
    const s = (c.state || 'Other').trim();
    const m = (c.month || '').trim();
    const amt = Number(c.amount) || 0;
    if (pivotMatrix[s] && pivotMatrix[s][m] !== undefined) {
      pivotMatrix[s][m] += amt;
    }
  });

  // Export Matrix CSV
  const handleExportMatrixCSV = () => {
    const headers = ['State / Territory', ...MONTHS_3_LETTER, 'Total TA Amount'];
    const rows = [headers.join(',')];

    sortedStates.forEach(item => {
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
      totalAmount
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

  const handleExportEmpLedgerCSV = () => {
    const headers = ['Emp. Code', 'Sales Person Name', 'Territory', ...matrixMonths, 'Total TA Amount', 'Total Claims'];
    const rows = [headers.join(',')];

    sortedEmps.forEach(emp => {
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

  return (
    <div>
      {/* KPI Cards Summary */}
      <div className="kpi-grid">
        <div className="kpi-card highlight">
          <div className="kpi-top">
            <span className="kpi-title">Total TA Disbursed</span>
            <div className="kpi-icon-wrap" style={{ background: '#dbeafe', color: '#1e40af' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-val" style={{ color: '#1e40af', fontSize: '1.75rem' }}>{formatINR(totalAmount)}</div>
          <div className="kpi-sub">{isAdmin ? 'Master Sheet Grand Total across all records' : `${user?.name || 'Assigned'} Sheet Total`}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Total Claims Logged</span>
            <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
              <FileCheck size={20} />
            </div>
          </div>
          <div className="kpi-val">{totalClaimsCount}</div>
          <div className="kpi-sub">Verified expense submissions</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Active Employees</span>
            <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#15803d' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-val">{sortedEmps.length}</div>
          <div className="kpi-sub">Unique sales representatives</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Active Territories</span>
            <div className="kpi-icon-wrap" style={{ background: '#ede9fe', color: '#6d28d9' }}>
              <MapPin size={20} />
            </div>
          </div>
          <div className="kpi-val">
            {allStates.length} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>States</span>
          </div>
          <div className="kpi-sub">{formatINR(avgClaimAmount)} avg claim payout</div>
        </div>
      </div>

      {/* Consolidated Master Sheets Breakdown Card (ADMIN ONLY) */}
      {isAdmin && (
        <div className="card-panel" style={{ marginBottom: '24px', padding: '18px 22px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Consolidated Admin Audit
              </div>
              <h3 style={{ margin: '3px 0 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Master Spreadsheets Consolidation Breakdown
              </h3>
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '6px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              Consolidated Total: {formatINR(totalAmount)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Sheet 1: TA Bill 2026:- 1 */}
            <div style={{ background: '#ffffff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '14px 18px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                  🔵 TA Bill 2026:- 1
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                  {totalAmount > 0 ? ((bhartiTotal / totalAmount) * 100).toFixed(1) : 0}% share
                </span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0284c7' }}>
                {formatINR(bhartiTotal)}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '4px' }}>
                {bhartiClaims.length} claims • 8 Territories (Delhi, Ex-UP, Har, Agra, MP, Pun, UP-W, UK)
              </div>
            </div>

            {/* Sheet 2: TA Bill 2026:- 2 */}
            <div style={{ background: '#ffffff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '14px 18px', borderLeft: '4px solid #7c3aed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase' }}>
                  🟣 TA Bill 2026:- 2
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                  {totalAmount > 0 ? ((bhawnaTotal / totalAmount) * 100).toFixed(1) : 0}% share
                </span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#7c3aed' }}>
                {formatINR(bhawnaTotal)}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '4px' }}>
                {bhawnaClaims.length} claims • 4 Territories (Rajasthan, Bihar, Jharkhand, Gujarat)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Switcher Tabs Bar */}
      <div className="card-panel" style={{ padding: '14px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn-${activeTab === 'costing' ? 'primary' : 'secondary'}`}
              onClick={() => setActiveTab('costing')}
              style={{ 
                height: '36px', 
                padding: '0 14px', 
                fontSize: '0.84rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                fontWeight: 700
              }}
            >
              <Award size={15} />
              <span>State-wise Costing Sheet</span>
            </button>

            <button
              className={`btn-${activeTab === 'matrix' ? 'primary' : 'secondary'}`}
              onClick={() => setActiveTab('matrix')}
              style={{ height: '36px', padding: '0 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <TableIcon size={15} />
              <span>State × Month Pivot Matrix</span>
            </button>
            <button
              className={`btn-${activeTab === 'employee' ? 'primary' : 'secondary'}`}
              onClick={() => setActiveTab('employee')}
              style={{ height: '36px', padding: '0 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Users size={15} />
              <span>Employee Ledger</span>
            </button>
            <button
              className={`btn-${activeTab === 'statewise' ? 'primary' : 'secondary'}`}
              onClick={() => setActiveTab('statewise')}
              style={{ height: '36px', padding: '0 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <MapPin size={15} />
              <span>State-wise Breakdown</span>
            </button>
            <button
              className={`btn-${activeTab === 'monthwise' ? 'primary' : 'secondary'}`}
              onClick={() => setActiveTab('monthwise')}
              style={{ height: '36px', padding: '0 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Calendar size={15} />
              <span>Month-wise Trend</span>
            </button>
          </div>

          {activeTab === 'employee' ? (
            <button
              className="btn-secondary"
              onClick={handleExportEmpLedgerCSV}
              style={{ height: '40px', padding: '0 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={15} />
              <span>Export Staff Ledger</span>
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={handleExportMatrixCSV}
              style={{ height: '40px', padding: '0 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={15} />
              <span>Export Matrix CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: STATE X MONTH PIVOT MATRIX */}
      {activeTab === 'matrix' && (
        <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="panel-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TableIcon size={18} color="#2563eb" />
                State × Month Cross-Tabulation Matrix
              </h3>
              <p className="panel-subtitle">Total traveling allowance disbursed per state across all 12 months</p>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '6px 14px', borderRadius: '8px' }}>
              Grand Total: {formatINR(totalAmount)}
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: '600px', overflow: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ position: 'sticky', left: 0, background: '#0f172a', zIndex: 2, color: '#ffffff', minWidth: '160px' }}>
                    State / Territory
                  </th>
                  {MONTHS_3_LETTER.map(m => (
                    <th key={m} style={{ textAlign: 'right', minWidth: '75px', color: '#ffffff', background: '#0f172a' }}>{m}</th>
                  ))}
                  <th style={{ textAlign: 'right', minWidth: '120px', background: '#1e40af', color: '#ffffff' }}>
                    Total TA
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStates.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      No state data found in Google Sheet.
                    </td>
                  </tr>
                ) : (
                  sortedStates.map((item, idx) => {
                    const state = item.state;
                    return (
                      <tr key={state} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ fontWeight: 700, position: 'sticky', left: 0, background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', zIndex: 1, borderRight: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#0f172a' }}>{state}</span>
                        </td>
                        {MONTHS_3_LETTER.map(m => {
                          const val = pivotMatrix[state]?.[m] || 0;
                          return (
                            <td key={m} style={{ textAlign: 'right', fontFamily: val > 0 ? 'inherit' : 'monospace', color: val > 0 ? '#0f172a' : '#94a3b8', fontWeight: val > 0 ? 600 : 400 }}>
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
                    {formatINR(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOYEE LEDGER (MONTH-WISE AND STATE-WISE PER EMPLOYEE) */}
      {activeTab === 'employee' && (
        <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="panel-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#2563eb" />
                Employee TA Disbursal Ledger
              </h3>
              <p className="panel-subtitle">Total traveling allowance per employee with month-by-month cross table and state distribution</p>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '6px 14px', borderRadius: '8px' }}>
              {sortedEmps.length} Employees • Total: {formatINR(totalAmount)}
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: '640px', overflow: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ width: '40px', color: '#94a3b8', background: '#0f172a' }}>#</th>
                  <th style={{ position: 'sticky', left: 0, background: '#0f172a', zIndex: 2, color: '#ffffff', minWidth: '100px' }}>
                    EMP. CODE
                  </th>
                  <th style={{ minWidth: '180px', color: '#ffffff', background: '#0f172a' }}>SALES PERSON NAME</th>
                  <th style={{ minWidth: '130px', color: '#ffffff', background: '#0f172a' }}>TERRITORY(S)</th>
                  {matrixMonths.map(m => (
                    <th key={m} style={{ textAlign: 'right', minWidth: '75px', color: '#ffffff', background: '#0f172a' }}>{m}</th>
                  ))}
                  <th style={{ textAlign: 'right', minWidth: '120px', background: '#1e40af', color: '#ffffff' }}>
                    TOTAL TA
                  </th>
                  <th style={{ textAlign: 'center', minWidth: '80px', color: '#ffffff', background: '#0f172a' }}>CLAIMS</th>
                  <th style={{ textAlign: 'center', minWidth: '100px', color: '#ffffff', background: '#0f172a' }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmps.map((emp, idx) => {
                  const stateNames = Object.keys(emp.states);
                  const isExpanded = expandedEmpCode === emp.code;
                  return (
                    <React.Fragment key={emp.code}>
                      <tr style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 800, position: 'sticky', left: 0, background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', zIndex: 1, borderRight: '1px solid #e2e8f0' }}>
                          <span className="code-pill">{emp.code}</span>
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={16} color="#059669" />
                                <strong style={{ fontSize: '0.95rem', color: '#065f46' }}>
                                  {emp.name} ({emp.code}) — Territory & Monthly Summary
                                </strong>
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
                    Grand Total ({sortedEmps.length} Employees)
                  </td>
                  {matrixMonths.map(m => (
                    <td key={m} style={{ textAlign: 'right', color: '#1e40af' }}>
                      {formatINR(monthlyTotals[m] || 0).replace('₹', '')}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', color: '#1e40af', background: '#dbeafe', fontSize: '1rem', fontWeight: 900 }}>
                    {formatINR(totalAmount)}
                  </td>
                  <td style={{ textAlign: 'center' }}>{claims.length}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STATE-WISE DETAILED BREAKDOWN */}
      {activeTab === 'statewise' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="#2563eb" />
                  Territory & State Expenditure Breakdown
                </h3>
                <p className="panel-subtitle">Distribution of total claims, expenditures, and participation by state</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>State / Territory</th>
                    <th>Total TA Disbursed</th>
                    <th>% Share of Grand Total</th>
                    <th>Claims Count</th>
                    <th>Active Reps</th>
                    <th>Avg Claim Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStates.map((item, idx) => {
                    const pct = totalAmount > 0 ? ((item.total / totalAmount) * 100).toFixed(1) : 0;
                    const avg = item.count > 0 ? Math.round(item.total / item.count) : 0;
                    return (
                      <tr key={item.state}>
                        <td>
                          <span className={`rank-badge ${idx === 0 ? 'top-1' : idx === 1 ? 'top-2' : idx === 2 ? 'top-3' : ''}`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{item.state}</strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '1rem' }}>
                            {formatINR(item.total)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary-gradient)', borderRadius: '999px' }}></div>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', minWidth: '40px' }}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="code-pill">{item.count} claims</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{item.reps.size} staff</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#059669' }}>{formatINR(avg)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MONTH-WISE TREND */}
      {activeTab === 'monthwise' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={18} color="#2563eb" />
                  Month-on-Month Expense Trend
                </h3>
                <p className="panel-subtitle">Total TA disbursed across each calendar month</p>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div style={{ padding: '20px 0 10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '220px', gap: '12px', paddingBottom: '30px', borderBottom: '2px solid #e2e8f0' }}>
                {MONTHS_3_LETTER.map(m => {
                  const amt = monthlyTotals[m] || 0;
                  const heightPct = (amt / maxMonthAmount) * 100;
                  return (
                    <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: amt > 0 ? '#1e40af' : '#94a3b8', marginBottom: '6px' }}>
                        {amt > 0 ? (amt > 99999 ? (amt / 100000).toFixed(1) + 'L' : (amt / 1000).toFixed(0) + 'k') : '0'}
                      </div>
                      <div 
                        style={{ 
                          width: '100%', 
                          maxHeight: '160px',
                          height: `${Math.max(4, heightPct)}%`, 
                          background: amt > 0 ? 'linear-gradient(180deg, #3b82f6 0%, #1e40af 100%)' : '#e2e8f0',
                          borderRadius: '6px 6px 0 0',
                          transition: 'all 0.3s ease'
                        }} 
                      />
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginTop: '8px' }}>
                        {m}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div className="table-responsive" style={{ marginTop: '20px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total Disbursed</th>
                    <th>Expenditure Share</th>
                    <th>Claims Logged</th>
                    <th>Average Claim</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHS_3_LETTER.map(m => {
                    const amt = monthlyTotals[m] || 0;
                    const count = monthlyCounts[m] || 0;
                    const pct = totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : 0;
                    const avg = count > 0 ? Math.round(amt / count) : 0;
                    return (
                      <tr key={m}>
                        <td>
                          <span className="month-badge" style={{ fontSize: '0.88rem', padding: '4px 12px' }}>{m}</span>
                        </td>
                        <td>
                          <strong style={{ color: amt > 0 ? '#1e40af' : '#94a3b8', fontSize: '0.96rem' }}>
                            {formatINR(amt)}
                          </strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary-gradient)' }}></div>
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>{pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span className="code-pill">{count} claims</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#059669' }}>{formatINR(avg)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: OFFICIAL STATE-WISE COSTING SHEET */}
      {activeTab === 'costing' && (
        <div style={{ marginBottom: '24px' }}>
          <StatewiseMatrixTable user={user} isAdmin={isAdmin} />
        </div>
      )}
    </div>
  );
}
