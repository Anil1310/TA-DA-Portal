import React, { useState } from 'react';
import {
  Zap,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Table,
  Tag,
  Type,
  Calculator,
  Calendar,
  Lock,
  Unlock,
  Clock,
  Trash2,
  Copy,
  ShieldCheck,
  ChevronRight,
  Database
} from 'lucide-react';
import { executeSheetAutomation } from '../services/storage';

const SPREADSHEETS = [
  {
    id: 'bharti',
    name: 'Link-1 (TA Bill 2026:- 1)',
    sheetId: '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY',
    coordinator: 'salescoordinator1@doctorsoap.com',
    states: ['Delhi', 'Haryana', 'Punjab', 'UP West', 'MP', 'CG', 'UK'],
    badgeColor: '#2563eb',
    desc: 'Primary expense sheet covering North and Central India territories (Bharti).'
  },
  {
    id: 'bhawna',
    name: 'Link-2 (TA Bill 2026:- 2)',
    sheetId: '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w',
    coordinator: 'marketing@doctorsoap.com',
    states: ['Rajasthan', 'Gujarat', 'Bihar', 'Jharkhand'],
    badgeColor: '#7c3aed',
    desc: 'Designated 4-state matrix (Rajasthan, Gujarat, Bihar, Jharkhand - Bhawna).'
  }
];

// 12 financial year & calendar accounting months
const ALL_12_MONTHS = [
  { value: 'Apr', label: 'Apr (April)' },
  { value: 'May', label: 'May (May)' },
  { value: 'Jun', label: 'Jun (June)' },
  { value: 'Jul', label: 'Jul (July)' },
  { value: 'Aug', label: 'Aug (August)' },
  { value: 'Sep', label: 'Sep (September)' },
  { value: 'Oct', label: 'Oct (October)' },
  { value: 'Nov', label: 'Nov (November)' },
  { value: 'Dec', label: 'Dec (December)' },
  { value: 'Jan', label: 'Jan (January)' },
  { value: 'Feb', label: 'Feb (February)' },
  { value: 'Mar', label: 'Mar (March)' }
];

// Dedicated continuous rotating spinner component
function ActionSpinner({ isRunning, size = 16, color }) {
  return (
    <span
      className={isRunning ? "action-spinner-active" : ""}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        lineHeight: 1,
        animation: isRunning ? 'spinContinuous 0.75s linear infinite' : 'none',
        transformOrigin: '50% 50%',
        flexShrink: 0
      }}
    >
      <RefreshCw size={size} color={color} />
    </span>
  );
}

export default function Automation({ config, showToast, user }) {
  const [selectedTarget, setSelectedTarget] = useState('both'); // 'bharti', 'bhawna', 'both'
  const [runningAction, setRunningAction] = useState(null);
  const [logs, setLogs] = useState([]);

  // Month creation state dynamically calculated from current month:
  // Target month is current month - 1 month (e.g. Sep when current month is October)
  // Source month is current month - 2 months (e.g. Aug when current month is October)
  const now = new Date();
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const defaultTargetIdx = (now.getMonth() - 1 + 12) % 12; // E.g. Sep (8) if current month is October (9)
  const defaultSourceIdx = (now.getMonth() - 2 + 12) % 12; // E.g. Aug (7) if current month is October (9)

  const [sourceMonth, setSourceMonth] = useState(MONTHS_SHORT[defaultSourceIdx]); // e.g. 'Aug'
  const [newMonthName, setNewMonthName] = useState(MONTHS_SHORT[defaultTargetIdx]); // e.g. 'Sep'

  // Month locking state
  const [lockMonth, setLockMonth] = useState('Aug');
  const [isLocking, setIsLocking] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.email === 'mis@doctorsoap.com' || !user || user?.permissions?.manageAutomation !== false;

  const addLog = (entry) => {
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: true }),
      ...entry
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const clearLogs = () => {
    setLogs([]);
    showToast('Activity console cleared.', 'info');
  };

  const copyLogs = () => {
    if (logs.length === 0) {
      showToast('No logs to copy.', 'info');
      return;
    }
    const text = logs.map((l) => `[${l.timestamp}] [${l.target}] ${l.actionName}: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast('Copied logs to clipboard!', 'success');
  };

  const getTargetIds = () => {
    if (selectedTarget === 'both') {
      return SPREADSHEETS.map((s) => ({ id: s.sheetId, name: s.name }));
    }
    const found = SPREADSHEETS.find((s) => s.id === selectedTarget);
    return found ? [{ id: found.sheetId, name: found.name }] : [{ id: SPREADSHEETS[0].sheetId, name: SPREADSHEETS[0].name }];
  };

  const handleRunAutomation = async (actionKey, actionName, extraParams = {}) => {
    if (!isAdmin) {
      showToast('Admin authorization required to run sheet automations.', 'error');
      return;
    }

    setRunningAction(actionKey);
    const targets = getTargetIds();
    let overallSuccess = true;

    for (const target of targets) {
      addLog({
        actionName,
        target: target.name,
        status: 'running',
        message: `Executing "${actionName}" on ${target.name}...`
      });

      try {
        const res = await executeSheetAutomation(actionKey, {
          spreadsheetId: target.id,
          targetSpreadsheetId: target.id,
          userRole: user?.role,
          ...extraParams
        });

        if (res && res.success) {
          const msg = res.message || `Successfully completed ${actionName} on ${target.name}.`;
          addLog({
            actionName,
            target: target.name,
            status: 'success',
            message: msg,
            details: res
          });
        } else {
          overallSuccess = false;
          const errMsg = (res && res.message) || 'Action failed on server.';
          addLog({
            actionName,
            target: target.name,
            status: 'error',
            message: `Error: ${errMsg}`,
            details: res
          });
        }
      } catch (err) {
        overallSuccess = false;
        addLog({
          actionName,
          target: target.name,
          status: 'error',
          message: `Network/Execution error: ${err.message || String(err)}`
        });
      }
    }

    setRunningAction(null);

    if (overallSuccess) {
      showToast(`Automation "${actionName}" completed successfully!`, 'success');
    } else {
      showToast(`Automation "${actionName}" finished with warnings or errors. Check console below.`, 'error');
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Dynamic Keyframes for guaranteed continuous button rotation */}
      <style>{`
        @keyframes spinContinuous {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .action-spinner-active {
          display: inline-flex !important;
          animation: spinContinuous 0.75s linear infinite !important;
          transform-origin: 50% 50% !important;
        }
      `}</style>

      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '20px',
        padding: '28px 32px',
        color: '#ffffff',
        marginBottom: '28px',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              borderRadius: '10px',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
            }}>
              <Zap size={22} color="#ffffff" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Sheet Automation Center
            </h2>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Admin Control
            </span>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.94rem', lineHeight: 1.5 }}>
            Automate Master tab compilation (starting from Row 2), state territory corrections, Calibri 10 font formatting, and monthly rollovers across connected Google Sheets from your Admin ID (<strong style={{ color: '#f8fafc' }}>{user?.name || 'Administrator'}</strong>).
          </p>
        </div>

        {/* Live Admin Identity Badge */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: '14px 18px',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Operating As
          </div>
          <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
            {user?.name || 'Administrator'}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
            System Administrator
          </div>
        </div>
      </div>

      {/* Target Spreadsheet Selector */}
      <div className="card-panel" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 className="panel-title" style={{ fontSize: '1.15rem' }}>Select Target Spreadsheet</h3>
            <p className="panel-subtitle">Choose which Google Sheet(s) will be updated when running automation commands</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setSelectedTarget('both')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: selectedTarget === 'both' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: selectedTarget === 'both' ? '#eff6ff' : '#ffffff',
                color: selectedTarget === 'both' ? '#1d4ed8' : '#475569',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ⚡ Both Sheets (All-in-One)
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {SPREADSHEETS.map((s) => {
            const isSelected = selectedTarget === s.id || selectedTarget === 'both';
            return (
              <div
                key={s.id}
                onClick={() => setSelectedTarget(s.id)}
                style={{
                  border: isSelected ? `2px solid ${s.badgeColor}` : '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  background: isSelected ? '#faf5ff' : '#ffffff',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 8px 20px -8px rgba(124, 58, 237, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: s.badgeColor
                    }}></div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{s.name}</span>
                  </div>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${s.sheetId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.78rem',
                      color: s.badgeColor,
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                    title="Open sheet in new Google Sheets tab"
                  >
                    Open Tab <ExternalLink size={13} />
                  </a>
                </div>

                <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#64748b' }}>
                  {s.desc}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {s.states.map((st) => (
                    <span
                      key={st}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        color: '#334155'
                      }}
                    >
                      {st}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: '12px', fontSize: '0.7rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                  Sheet ID: <code>{s.sheetId}</code>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hero Action: One-Click Full Synchronization */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
        borderRadius: '20px',
        padding: '26px 30px',
        color: '#ffffff',
        marginBottom: '28px',
        boxShadow: '0 12px 30px -10px rgba(30, 64, 175, 0.45)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              background: '#38bdf8',
              color: '#0369a1',
              fontWeight: 800,
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '6px',
              textTransform: 'uppercase'
            }}>
              Primary Workflow
            </span>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
              Complete Sync & Normalization Pipeline
            </h3>
          </div>
          <p style={{ margin: 0, color: '#bfdbfe', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Executes all 5 operations in sequence: <strong>1) Consolidates Row 2 records to Master</strong>, <strong>2) Fixes State Names</strong> (strict 4 states for Bhawna), <strong>3) Formats Column H Dates</strong>, <strong>4) Applies Calibri 10 & Middle Alignment</strong>, and <strong>5) Recalculates all section formulas & grand totals</strong>.
          </p>
        </div>

        <button
          type="button"
          disabled={runningAction !== null}
          onClick={() => handleRunAutomation('runFullAutomation', 'Complete Sync & Normalization Pipeline')}
          style={{
            background: runningAction === 'runFullAutomation' ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '14px 28px',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 800,
            cursor: runningAction !== null ? (runningAction === 'runFullAutomation' ? 'wait' : 'not-allowed') : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 6px 18px rgba(245, 158, 11, 0.4)',
            transition: 'all 0.15s ease'
          }}
        >
          <ActionSpinner isRunning={runningAction === 'runFullAutomation'} size={20} color="#ffffff" />
          {runningAction === 'runFullAutomation' ? 'Running Full Pipeline...' : 'Run Full Automation Now'}
        </button>
      </div>

      {/* Individual Modular Automation Cards */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
        Modular Sheet Automations
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>

        {/* 1. Combine Data to Master */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ background: '#dbeafe', color: '#1e40af', padding: '8px', borderRadius: '10px' }}>
                <Table size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Consolidate to Master Tab
              </h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
              Extracts all employee records starting strictly from <strong>Row 2</strong> of each monthly sheet tab (Apr to Mar). Cleans summary rows, updates S.No, and populates the Master tab.
            </p>
          </div>
          <button
            type="button"
            disabled={runningAction !== null}
            onClick={() => handleRunAutomation('combineMaster', 'Combine Data to Master')}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontWeight: 700,
              gap: '8px',
              backgroundColor: runningAction === 'combineMaster' ? '#dbeafe' : undefined,
              borderColor: runningAction === 'combineMaster' ? '#2563eb' : undefined,
              color: runningAction === 'combineMaster' ? '#1d4ed8' : undefined,
              cursor: runningAction !== null ? (runningAction === 'combineMaster' ? 'wait' : 'not-allowed') : 'pointer'
            }}
          >
            <ActionSpinner isRunning={runningAction === 'combineMaster'} size={16} />
            {runningAction === 'combineMaster' ? 'Consolidating to Master...' : 'Run Consolidation'}
          </button>
        </div>

        {/* 2. Fix Master Tab States */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ background: '#f3e8ff', color: '#7e22ce', padding: '8px', borderRadius: '10px' }}>
                <Tag size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Fix State Names in Master
              </h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
              Removes incorrect "Delhi" state entries. For Bhawna sheet, strictly maps all 31 staff codes to <strong>Rajasthan, Gujarat, Bihar, Jharkhand</strong>. For Bharti sheet, aligns Delhi, Haryana, Punjab, UP West, etc.
            </p>
          </div>
          <button
            type="button"
            disabled={runningAction !== null}
            onClick={() => handleRunAutomation('fixStates', 'Fix State Names in Master')}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontWeight: 700,
              gap: '8px',
              backgroundColor: runningAction === 'fixStates' ? '#f3e8ff' : undefined,
              borderColor: runningAction === 'fixStates' ? '#7e22ce' : undefined,
              color: runningAction === 'fixStates' ? '#6b21a8' : undefined,
              cursor: runningAction !== null ? (runningAction === 'fixStates' ? 'wait' : 'not-allowed') : 'pointer'
            }}
          >
            <ActionSpinner isRunning={runningAction === 'fixStates'} size={16} />
            {runningAction === 'fixStates' ? 'Normalizing State Column...' : 'Normalize State Column'}
          </button>
        </div>

        {/* 3. Apply Calibri 10 & Middle Alignment */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ background: '#ecfdf5', color: '#047857', padding: '8px', borderRadius: '10px' }}>
                <Type size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Apply Calibri 10 & Middle Alignment
              </h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
              Enforces corporate styling across all tabs: font <strong>Calibri</strong>, size <strong>10pt</strong>, and <strong>Middle vertical alignment</strong> across every cell.
            </p>
          </div>
          <button
            type="button"
            disabled={runningAction !== null}
            onClick={() => handleRunAutomation('formatCalibri', 'Apply Calibri 10 & Middle Alignment')}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontWeight: 700,
              gap: '8px',
              backgroundColor: runningAction === 'formatCalibri' ? '#ecfdf5' : undefined,
              borderColor: runningAction === 'formatCalibri' ? '#047857' : undefined,
              color: runningAction === 'formatCalibri' ? '#065f46' : undefined,
              cursor: runningAction !== null ? (runningAction === 'formatCalibri' ? 'wait' : 'not-allowed') : 'pointer'
            }}
          >
            <ActionSpinner isRunning={runningAction === 'formatCalibri'} size={16} />
            {runningAction === 'formatCalibri' ? 'Applying Calibri 10 Styling...' : 'Apply Calibri 10 Styling'}
          </button>
        </div>

        {/* 4. Recalculate State Sums & Grand Totals */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ background: '#fef3c7', color: '#b45309', padding: '8px', borderRadius: '10px' }}>
                <Calculator size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Recalculate State Sums & Totals
              </h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
              Scans monthly tabs and recalculates state section sub-totals (SUM formulas), writes 'Grand Total' in Column C, and sets the Row 1 black banner total.
            </p>
          </div>
          <button
            type="button"
            disabled={runningAction !== null}
            onClick={() => handleRunAutomation('updateSums', 'Recalculate State Sums & Totals')}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontWeight: 700,
              gap: '8px',
              backgroundColor: runningAction === 'updateSums' ? '#fef3c7' : undefined,
              borderColor: runningAction === 'updateSums' ? '#b45309' : undefined,
              color: runningAction === 'updateSums' ? '#92400e' : undefined,
              cursor: runningAction !== null ? (runningAction === 'updateSums' ? 'wait' : 'not-allowed') : 'pointer'
            }}
          >
            <ActionSpinner isRunning={runningAction === 'updateSums'} size={16} />
            {runningAction === 'updateSums' ? 'Updating Formulas & Totals...' : 'Update Formulas & Totals'}
          </button>
        </div>

        {/* 5. Format Column H Dates */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '8px', borderRadius: '10px' }}>
                <Clock size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Format Column H Dates
              </h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
              Normalizes submission date timestamps in the Master tab to standard format (<code>dd yyyy HH:mm:ss</code>) and prevents corrupted numeric strings.
            </p>
          </div>
          <button
            type="button"
            disabled={runningAction !== null}
            onClick={() => handleRunAutomation('formatDates', 'Format Column H Dates')}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontWeight: 700,
              gap: '8px',
              backgroundColor: runningAction === 'formatDates' ? '#e0f2fe' : undefined,
              borderColor: runningAction === 'formatDates' ? '#0369a1' : undefined,
              color: runningAction === 'formatDates' ? '#075985' : undefined,
              cursor: runningAction !== null ? (runningAction === 'formatDates' ? 'wait' : 'not-allowed') : 'pointer'
            }}
          >
            <ActionSpinner isRunning={runningAction === 'formatDates'} size={16} />
            {runningAction === 'formatDates' ? 'Standardizing Dates...' : 'Standardize Dates'}
          </button>
        </div>

        {/* 6. Create / Roll Over New Month Tab */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px', borderRadius: '10px' }}>
                <Calendar size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Create New Month Tab
              </h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 12px' }}>
              Duplicates the source month tab (e.g. <strong>{sourceMonth}</strong>) to create the next accounting month sheet (<strong>{newMonthName}</strong> = current month - 1 month). Preserves employee master list & state structure, resets expense amounts and dates, and updates the Month column.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>Source Tab (Existing)</label>
                <select
                  className="form-select"
                  value={sourceMonth}
                  onChange={(e) => setSourceMonth(e.target.value)}
                  style={{ fontSize: '0.84rem', padding: '6px 10px', height: '38px', width: '100%', borderRadius: '8px', cursor: 'pointer' }}
                >
                  {ALL_12_MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>New Tab Name (To Create)</label>
                <select
                  className="form-select"
                  value={newMonthName}
                  onChange={(e) => setNewMonthName(e.target.value)}
                  style={{ fontSize: '0.84rem', padding: '6px 10px', height: '38px', width: '100%', borderRadius: '8px', cursor: 'pointer' }}
                >
                  {ALL_12_MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={runningAction !== null || !newMonthName.trim()}
            onClick={() => handleRunAutomation('createMonth', `Create Month "${newMonthName}"`, { sourceMonth, newMonth: newMonthName })}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontWeight: 700,
              gap: '8px',
              backgroundColor: runningAction === 'createMonth' ? '#fee2e2' : undefined,
              borderColor: runningAction === 'createMonth' ? '#b91c1c' : undefined,
              color: runningAction === 'createMonth' ? '#991b1b' : undefined,
              cursor: runningAction !== null ? (runningAction === 'createMonth' ? 'wait' : 'not-allowed') : 'pointer'
            }}
          >
            <ActionSpinner isRunning={runningAction === 'createMonth'} size={16} />
            {runningAction === 'createMonth' ? `Creating "${newMonthName}" Sheet...` : `Create "${newMonthName}" Sheet`}
          </button>
        </div>

        {/* 7. Protect / Lock Month Sheet */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ background: '#fef3c7', color: '#d97706', padding: '8px', borderRadius: '10px' }}>
                {isLocking ? <Lock size={20} /> : <Unlock size={20} />}
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Lock / Unlock Month Sheet
              </h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 12px' }}>
              Lock a month sheet (e.g. Aug) after accounting reconciliation so standard users and coordinators cannot edit or delete claims.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>Month Name</label>
                <select
                  className="form-select"
                  value={lockMonth}
                  onChange={(e) => setLockMonth(e.target.value)}
                  style={{ fontSize: '0.84rem', padding: '6px 10px', height: '38px', width: '100%', borderRadius: '8px', cursor: 'pointer' }}
                >
                  {ALL_12_MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>Action</label>
                <select
                  className="form-select"
                  value={isLocking ? 'lock' : 'unlock'}
                  onChange={(e) => setIsLocking(e.target.value === 'lock')}
                  style={{ fontSize: '0.84rem', padding: '6px 8px', height: '38px', width: '100%', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <option value="lock">🔒 Lock</option>
                  <option value="unlock">🔓 Unlock</option>
                </select>
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={runningAction !== null || !lockMonth.trim()}
            onClick={() => handleRunAutomation('toggleLock', `${isLocking ? 'Lock' : 'Unlock'} Month "${lockMonth}"`, { month: lockMonth, lock: isLocking })}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontWeight: 700,
              gap: '8px',
              backgroundColor: runningAction === 'toggleLock' ? '#fef3c7' : undefined,
              borderColor: runningAction === 'toggleLock' ? '#d97706' : undefined,
              color: runningAction === 'toggleLock' ? '#92400e' : undefined,
              cursor: runningAction !== null ? (runningAction === 'toggleLock' ? 'wait' : 'not-allowed') : 'pointer'
            }}
          >
            <ActionSpinner isRunning={runningAction === 'toggleLock'} size={16} />
            {runningAction === 'toggleLock' ? `Applying ${isLocking ? 'Lock' : 'Unlock'} to "${lockMonth}"...` : `Apply ${isLocking ? 'Lock' : 'Unlock'} to "${lockMonth}"`}
          </button>
        </div>

      </div>

      {/* Live Automation Terminal / Activity Log */}
      <div className="card-panel" style={{ background: '#0b1120', border: '1px solid #1e293b', color: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: runningAction ? '#f59e0b' : '#10b981' }}></div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              Automation Execution Log
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              ({logs.length} events recorded)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={copyLogs}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Copy size={13} /> Copy Log
            </button>
            <button
              type="button"
              onClick={clearLogs}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={13} /> Clear
            </button>
          </div>
        </div>

        {/* Log Viewer Container */}
        <div style={{
          maxHeight: '320px',
          overflowY: 'auto',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          padding: '14px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '0.82rem',
          lineHeight: 1.6
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
              No automation actions have been executed in this session yet.
              <br />
              Click any button above to execute an automation on Google Sheets.
            </div>
          ) : (
            logs.map((log) => {
              const isSuccess = log.status === 'success';
              const isError = log.status === 'error';
              const isRunning = log.status === 'running';

              return (
                <div
                  key={log.id}
                  style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <span style={{ color: '#64748b', fontSize: '0.75rem', flexShrink: 0 }}>
                    [{log.timestamp}]
                  </span>

                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    flexShrink: 0,
                    background: isSuccess ? 'rgba(16, 185, 129, 0.2)' : isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: isSuccess ? '#34d399' : isError ? '#f87171' : '#fbbf24'
                  }}>
                    {log.target}
                  </span>

                  <div style={{ flex: 1, color: isError ? '#fca5a5' : isSuccess ? '#e2e8f0' : '#fef08a' }}>
                    {log.message}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
