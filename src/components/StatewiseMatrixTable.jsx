import React, { useState } from 'react';
import { Download, Table as TableIcon, MapPin, Calendar, RotateCcw, Filter, Check } from 'lucide-react';
import { STATEWISE_COLUMNS, OFFICIAL_STATEWISE_DATA, getStatewiseTotals } from '../services/statewiseData';
import { isUserBhawnaHelper } from '../services/currency';

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-IN');
}

export default function StatewiseMatrixTable({ customData, user, isAdmin, allowedColumns }) {
  const [displayOrientation, setDisplayOrientation] = useState('sheet'); // 'sheet' (Month x State) | 'transposed' (State x Month)
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  
  const isUserBhawna = isUserBhawnaHelper(user);

  // Scope territories strictly to user's assigned sheet when not admin
  const baseColumns = allowedColumns || (!isAdmin ? (isUserBhawna ? ['BIHAR', 'JHARKHAND', 'RAJ', 'GUJRAT'] : ['MP', 'CG', 'HARYANA', 'MEGALAYA', 'DELHI', 'UP', 'UK', 'PUNJAB']) : STATEWISE_COLUMNS);

  const rawData = customData || OFFICIAL_STATEWISE_DATA;
  const monthsList = rawData.map(d => d.month);

  // 1. Filter rows by Single Month
  const filteredData = selectedMonth === 'All' 
    ? rawData 
    : rawData.filter(d => d.month.toLowerCase() === selectedMonth.toLowerCase());

  // 2. Filter columns by Single Territory
  const displayedColumns = selectedState === 'All' 
    ? baseColumns 
    : baseColumns.filter(s => s.toUpperCase() === selectedState.toUpperCase());

  // 3. Dynamic Column & Grand Totals for current filter
  const columnTotals = {};
  displayedColumns.forEach(col => {
    columnTotals[col] = filteredData.reduce((acc, row) => acc + (row.breakdown[col] || 0), 0);
  });

  const displayedGrandTotal = filteredData.reduce((acc, row) => {
    if (selectedState === 'All') {
      return acc + displayedColumns.reduce((sum, col) => sum + (row.breakdown[col] || 0), 0);
    } else {
      return acc + (row.breakdown[selectedState] || 0);
    }
  }, 0);

  const isFiltered = selectedMonth !== 'All' || selectedState !== 'All';

  const resetFilters = () => {
    setSelectedMonth('All');
    setSelectedState('All');
  };

  // Transposed data calculation (State as rows)
  const stateRows = displayedColumns.map(state => {
    const monthValues = {};
    let stateTotal = 0;
    filteredData.forEach(row => {
      const val = row.breakdown[state] || 0;
      monthValues[row.month] = val;
      stateTotal += val;
    });
    const share = displayedGrandTotal > 0 ? ((stateTotal / displayedGrandTotal) * 100).toFixed(1) : 0;
    return {
      state,
      monthValues,
      total: stateTotal,
      share: Number(share)
    };
  }).sort((a, b) => b.total - a.total);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Month', 'TA - DA Expenses', 'Total', ...displayedColumns, 'TOTAL'];
    const rows = [headers.join(',')];

    filteredData.forEach(row => {
      const rowTotal = selectedState === 'All' ? row.total : (row.breakdown[selectedState] || 0);
      const rowVals = [
        row.month,
        row.expenseType,
        rowTotal,
        ...displayedColumns.map(col => row.breakdown[col] || 0),
        rowTotal
      ];
      rows.push(rowVals.join(','));
    });

    const totalRow = [
      'TOTAL',
      'TA-Bills',
      displayedGrandTotal,
      ...displayedColumns.map(col => columnTotals[col] || 0),
      displayedGrandTotal
    ];
    rows.push(totalRow.join(','));

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TA_DA_Costing_${selectedMonth}_${selectedState}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#ffffff' }}>
      
      {/* Top Header Bar */}
      <div style={{ padding: '14px 18px', backgroundColor: '#ffffff', color: '#111827', borderBottom: '1px solid #d1d5db', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
            <TableIcon size={18} color="#1d4ed8" />
            TA - DA Expenses State-wise Costing Report
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: '2px 0 0 0' }}>
            Filter by single month, single territory, or combine both
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Orientation switch */}
          <div style={{ display: 'flex', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}>
            <button
              onClick={() => setDisplayOrientation('sheet')}
              style={{
                border: 'none',
                backgroundColor: displayOrientation === 'sheet' ? '#ffffff' : 'transparent',
                color: displayOrientation === 'sheet' ? '#1d4ed8' : '#4b5563',
                fontWeight: 700,
                fontSize: '0.76rem',
                padding: '4px 10px',
                borderRadius: '3px',
                cursor: 'pointer',
                boxShadow: displayOrientation === 'sheet' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Month × State View
            </button>
            <button
              onClick={() => setDisplayOrientation('transposed')}
              style={{
                border: 'none',
                backgroundColor: displayOrientation === 'transposed' ? '#ffffff' : 'transparent',
                color: displayOrientation === 'transposed' ? '#1d4ed8' : '#4b5563',
                fontWeight: 700,
                fontSize: '0.76rem',
                padding: '4px 10px',
                borderRadius: '3px',
                cursor: 'pointer',
                boxShadow: displayOrientation === 'transposed' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              State-wise Ranked View
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            style={{
              height: '30px',
              padding: '0 10px',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '0.76rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR: SINGLE MONTH, SINGLE TERRITORY, OR BOTH */}
      <div style={{ padding: '10px 18px', backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#111827', fontWeight: 700, fontSize: '0.8rem' }}>
            <Filter size={14} color="#1d4ed8" />
            <span>Filter Report:</span>
          </div>

          {/* 1. Filter by Single Month */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>Month:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              style={{
                height: '30px',
                padding: '0 8px',
                borderRadius: '4px',
                border: selectedMonth !== 'All' ? '1px solid #1d4ed8' : '1px solid #d1d5db',
                backgroundColor: selectedMonth !== 'All' ? '#eff6ff' : '#ffffff',
                color: selectedMonth !== 'All' ? '#1d4ed8' : '#111827',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Months (Apr - Aug)</option>
              {monthsList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 2. Filter by Single Territory */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>Territory:</span>
            <select
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              style={{
                height: '30px',
                padding: '0 8px',
                borderRadius: '4px',
                border: selectedState !== 'All' ? '1px solid #1d4ed8' : '1px solid #d1d5db',
                backgroundColor: selectedState !== 'All' ? '#eff6ff' : '#ffffff',
                color: selectedState !== 'All' ? '#1d4ed8' : '#111827',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Territories ({baseColumns.length} States)</option>
              {baseColumns.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                background: '#fef2f2',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          )}

        </div>

        {/* Filter KPI Payout Pill */}
        <div style={{ background: '#ffffff', border: '1.5px solid #0066cc', borderRadius: '8px', padding: '6px 14px', textAlign: 'right' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            {selectedMonth !== 'All' && selectedState !== 'All' 
              ? `${selectedMonth} • ${selectedState} Total` 
              : selectedMonth !== 'All' 
                ? `${selectedMonth} Total` 
                : selectedState !== 'All' 
                  ? `${selectedState} Total` 
                  : 'Grand Total'}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#005bb5' }}>
            ₹{formatNumber(displayedGrandTotal)}
          </div>
        </div>

      </div>

      {/* ORIENTATION 1: EXACT MATCH TO USER'S SCREENSHOT (Month as Rows, States as Columns) */}
      {displayOrientation === 'sheet' && (
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#0B3861', color: '#ffffff', textAlign: 'center' }}>
                <th style={{ padding: '12px 14px', fontWeight: 800, border: '1px solid #072744', minWidth: '70px', textAlign: 'center', background: '#0B3861', color: '#ffffff' }}>Month</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, border: '1px solid #072744', minWidth: '130px', textAlign: 'center', background: '#0B3861', color: '#ffffff' }}>TA - DA Expenses</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, border: '1px solid #072744', minWidth: '110px', background: '#072744', color: '#ffffff', textAlign: 'center' }}>Total</th>
                {displayedColumns.map(col => (
                  <th key={col} style={{ padding: '12px 10px', fontWeight: 800, border: '1px solid #072744', minWidth: '85px', textAlign: 'center', background: selectedState === col ? '#051a2e' : '#0B3861', color: '#ffffff' }}>
                    {col}
                  </th>
                ))}
                <th style={{ padding: '12px 14px', fontWeight: 900, border: '1px solid #072744', minWidth: '115px', background: '#051a2e', color: '#00FF00', textAlign: 'center' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => {
                const rowTotal = selectedState === 'All' 
                  ? displayedColumns.reduce((sum, col) => sum + (row.breakdown[col] || 0), 0)
                  : (row.breakdown[selectedState] || 0);
                return (
                  <tr key={row.month} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f0f7ff', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center', borderRight: '1px solid #e2e8f0', color: selectedMonth === row.month ? '#005bb5' : 'inherit' }}>
                      {row.month}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569', fontWeight: 600, borderRight: '1px solid #e2e8f0' }}>
                      {row.expenseType}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#005bb5', background: idx % 2 === 0 ? '#eff6ff' : '#e0f2fe', borderRight: '1px solid #e2e8f0' }}>
                      {formatNumber(rowTotal)}
                    </td>
                    {displayedColumns.map(col => {
                      const val = row.breakdown[col] || 0;
                      return (
                        <td
                          key={col}
                          style={{
                            padding: '10px 10px',
                            textAlign: 'center',
                            fontFamily: val > 0 ? 'inherit' : 'monospace',
                            color: val > 0 ? '#0f172a' : '#94a3b8',
                            fontWeight: val > 0 ? (selectedState === col ? 800 : 600) : 400,
                            background: selectedState === col ? '#dbeafe' : undefined,
                            borderRight: '1px solid #e2e8f0'
                          }}
                        >
                          {formatNumber(val)}
                        </td>
                      );
                    })}
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 900, color: '#005bb5', background: idx % 2 === 0 ? '#dbeafe' : '#bfdbfe', fontSize: '0.9rem' }}>
                      {formatNumber(rowTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#0f172a', color: '#ffffff', fontWeight: 800, borderTop: '2px solid #005bb5' }}>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>TOTAL</td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#cbd5e1' }}>TA-Bills</td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#93c5fd', fontSize: '0.96rem' }}>
                  {formatNumber(displayedGrandTotal)}
                </td>
                {displayedColumns.map(col => (
                  <td key={col} style={{ padding: '12px 10px', textAlign: 'center', color: '#ffffff' }}>
                    {formatNumber(columnTotals[col] || 0)}
                  </td>
                ))}
                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#38bdf8', background: '#0284c7', fontSize: '1rem', fontWeight: 900 }}>
                  {formatNumber(displayedGrandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ORIENTATION 2: STATEWISE AS ROWS WITH SHARE & PROGRESS BARS */}
      {displayOrientation === 'transposed' && (
        <div className="table-responsive">
          <table className="data-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#0066cc', color: '#ffffff' }}>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th style={{ minWidth: '140px', textAlign: 'center' }}>Territory / State</th>
                {filteredData.map(d => d.month).map(m => (
                  <th key={m} style={{ textAlign: 'center', minWidth: '90px' }}>{m}</th>
                ))}
                <th style={{ textAlign: 'center', minWidth: '130px', background: '#0055b3' }}>Total TA Disbursed</th>
                <th style={{ minWidth: '180px', textAlign: 'center' }}>% Share of Expenditure</th>
              </tr>
            </thead>
            <tbody>
              {stateRows.map((item, idx) => (
                <tr key={item.state} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                  <td style={{ textAlign: 'center' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{item.state}</strong>
                  </td>
                  {filteredData.map(d => d.month).map(m => {
                    const val = item.monthValues[m] || 0;
                    return (
                      <td key={m} style={{ textAlign: 'center', color: val > 0 ? '#0f172a' : '#94a3b8', fontWeight: val > 0 ? 600 : 400 }}>
                        {formatNumber(val)}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#005bb5', background: idx % 2 === 0 ? '#eff6ff' : '#e0f2fe', fontSize: '0.95rem' }}>
                    ₹{formatNumber(item.total)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, maxWidth: '120px', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(0, item.share))}%`,
                            background: 'linear-gradient(90deg, #0066cc, #38bdf8)',
                            borderRadius: '999px'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', minWidth: '42px' }}>
                        {item.share}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#0f172a', color: '#ffffff', fontWeight: 800 }}>
                <td colSpan={2} style={{ textAlign: 'center' }}>Total for Current Filter</td>
                {filteredData.map(d => d.month).map(m => {
                  const mSum = filteredData.find(d => d.month === m)?.total || 0;
                  return (
                    <td key={m} style={{ textAlign: 'center', color: '#93c5fd' }}>
                      {formatNumber(mSum)}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'center', color: '#38bdf8', background: '#0055b3', fontSize: '1rem', fontWeight: 900 }}>
                  ₹{formatNumber(displayedGrandTotal)}
                </td>
                <td style={{ fontWeight: 800, color: '#38bdf8', textAlign: 'center' }}>100% of Filtered Total</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

    </div>
  );
}
