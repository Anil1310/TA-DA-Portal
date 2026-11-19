import React, { useState, useMemo, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, Sparkles, Receipt, UserCheck } from 'lucide-react';
import { 
  MONTHS_3_LETTER, 
  TERRITORIES, 
  BHAWNA_STATES, 
  BHARTI_STATES, 
  isUserBhawnaHelper, 
  isUserBhartiHelper, 
  numberToWordsINR, 
  isStateAllowed, 
  normalizeStateName 
} from '../services/currency';
import { submitClaimToBackend } from '../services/storage';
import { MASTER_CLAIMS, MASTER_STAFF } from '../services/masterData';

export default function SubmitClaim({ staffList, onClaimSubmitted, showToast, user, claimsCount }) {
  // Always default to last completed expense month ('Sep')
  const defaultExpenseMonth = 'Sep';

  // All 12 expense months available for selection
  const allowedExpenseMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  const uEmail = (user?.email || '').toLowerCase();
  const uRole = (user?.role || '').toLowerCase();
  const isAdmin = uRole === 'admin' || uEmail.includes('admin') || uEmail.includes('mis@');

  const isUserBhawna = isUserBhawnaHelper(user);
  const isUserBharti = isUserBhartiHelper(user);

  // Available territories strictly scoped:
  // Admin: All 14 territories
  // Bhawna: ONLY her 4 states (Rajasthan, Gujarat, Bihar, Jharkhand)
  // Bharti: ONLY her territories (Delhi, UP, Haryana, Punjab, MP, etc.)
  const availableTerritories = isAdmin
    ? TERRITORIES
    : isUserBhawna
      ? BHAWNA_STATES
      : BHARTI_STATES;

  const defaultTerritory = availableTerritories[0] || (isUserBhawna ? 'Rajasthan' : 'Delhi');

  // Build complete directory combining MASTER_STAFF, MASTER_CLAIMS and live staffList
  const comprehensiveStaffList = useMemo(() => {
    const map = new Map();

    const isGenuineEmployee = (code, name) => {
      if (!code || !name) return false;
      const c = String(code).trim().toUpperCase();
      const n = String(name).trim().toUpperCase();
      if (c.includes('TOTAL') || c.includes('GRAND') || n.includes('TOTAL') || n.includes('GRAND')) return false;
      if (c.includes('TA-BILL') || c.includes('TA BILL') || c.includes('TA_BILL') || c.includes('TABILL')) return false;
      if (n.includes('TA-BILL') || n.includes('TA BILL') || n.includes('TA_BILL') || n.includes('TABILL')) return false;
      if (c.includes('EMP. CODE') || c.includes('EMP CODE') || c === 'CODE') return false;
      if (n.includes('SALES PERSON') || n.includes('PERSON NAME') || n === 'NAME') return false;
      if (c === 'S.NO' || c === 'S.NO.' || c === 'SL.NO' || c === 'SR.NO') return false;
      return true;
    };

    // 1. Seed from verified MASTER_STAFF
    if (Array.isArray(MASTER_STAFF)) {
      MASTER_STAFF.forEach(s => {
        const code = String(s.code || '').trim().toUpperCase();
        const name = String(s.name || '').trim();
        const state = normalizeStateName(s.state);
        if (isGenuineEmployee(code, name) && !map.has(code)) {
          map.set(code, { code, name, state });
        }
      });
    }

    // 2. Overlay MASTER_CLAIMS
    if (Array.isArray(MASTER_CLAIMS)) {
      MASTER_CLAIMS.forEach(c => {
        const code = String(c.empCode || '').trim().toUpperCase();
        const name = String(c.name || '').trim();
        const state = normalizeStateName(c.state);
        const sourceSpreadsheet = c.sourceSpreadsheet;
        if (isGenuineEmployee(code, name)) {
          if (!map.has(code)) {
            map.set(code, { code, name, state, sourceSpreadsheet });
          } else if (state && (!map.get(code).state || map.get(code).state === 'General')) {
            map.get(code).state = state;
          }
        }
      });
    }

    // 3. Overlay live staffList from Google Sheets
    if (Array.isArray(staffList)) {
      staffList.forEach(s => {
        const code = String(s.code || '').trim().toUpperCase();
        const name = String(s.name || '').trim();
        const rawState = normalizeStateName(s.state);
        const sourceSpreadsheet = s.sourceSpreadsheet;
        if (isGenuineEmployee(code, name)) {
          const existing = map.get(code);
          const finalState = rawState || (existing && existing.state) || '';
          map.set(code, { 
            code, 
            name, 
            state: finalState,
            sourceSpreadsheet: sourceSpreadsheet || (existing && existing.sourceSpreadsheet)
          });
        }
      });
    }

    // Resolve any remaining missing states so NO employee ever has empty state or 'General'
    map.forEach((item, code) => {
      if (!item.state || item.state === 'General') {
        const found = MASTER_STAFF.find(m => m.code.toUpperCase() === code) ||
                      MASTER_CLAIMS.find(m => (m.empCode || '').toUpperCase() === code);
        if (found) {
          item.state = normalizeStateName(found.state);
        }
        if (!item.state) {
          item.state = isUserBhawna ? 'Rajasthan' : 'Delhi';
        }
      }
    });

    let list = Array.from(map.values());

    const bhawnaLower = BHAWNA_STATES.map(s => s.toLowerCase());
    const bhartiLower = BHARTI_STATES.map(s => s.toLowerCase());

    // Filter strictly by user territory permissions
    if (!isAdmin) {
      list = list.filter(item => {
        const itemState = normalizeStateName(item.state).toLowerCase();
        const isBhawnaItem = item.sourceSpreadsheet === 'Bhawna TA Master' || bhawnaLower.includes(itemState);

        if (isUserBhawna) {
          // Bhawna: ONLY employees belonging to her 4 states (Rajasthan, Gujarat, Bihar, Jharkhand)
          return isBhawnaItem || bhawnaLower.includes(itemState);
        } else {
          // Bharti: ONLY employees belonging to Bharti's territories (STRICTLY EXCLUDES Bhawna's 4 states)
          if (isBhawnaItem || bhawnaLower.includes(itemState)) {
            return false;
          }
          if (bhartiLower.includes(itemState)) {
            return true;
          }
          if (user?.allowedStates && Array.isArray(user.allowedStates) && user.allowedStates.length > 0) {
            return isStateAllowed(item.state, user.allowedStates, item.code);
          }
          return true;
        }
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [staffList, user, isUserBhawna, isUserBharti, isAdmin]);

  const [formData, setFormData] = useState({
    month: '',
    empCode: '',
    name: '',
    state: defaultTerritory,
    amount: '',
    remarks: ''
  });

  // Ensure formData.state stays within available territories
  useEffect(() => {
    if (formData.state && !availableTerritories.includes(formData.state)) {
      setFormData(prev => ({ ...prev, state: defaultTerritory }));
    }
  }, [availableTerritories, defaultTerritory]);

  const [selectedRepCode, setSelectedRepCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Quick Representative Dropdown selection
  const handleSelectRepresentative = (codeVal) => {
    const code = String(codeVal || '').trim().toUpperCase();
    setSelectedRepCode(code);
    if (!code) return;

    const match = comprehensiveStaffList.find(s => s.code.toUpperCase() === code);
    if (match) {
      setFormData(prev => ({
        ...prev,
        empCode: match.code,
        name: match.name,
        state: match.state || prev.state
      }));
    }
  };

  // Handle Employee Code input and auto-fill name + state
  const handleEmpCodeChange = (codeVal) => {
    const upperCode = codeVal.trim().toUpperCase();
    const match = comprehensiveStaffList.find(s => s.code.toUpperCase() === upperCode);

    if (match) {
      setSelectedRepCode(match.code);
      setFormData(prev => ({
        ...prev,
        empCode: upperCode,
        name: match.name,
        state: match.state || prev.state
      }));
    } else {
      setSelectedRepCode('');
      setFormData(prev => ({ ...prev, empCode: upperCode }));
    }
  };

  // Handle Employee Name input and auto-fill code + state
  const handleNameChange = (nameVal) => {
    const lowerName = nameVal.trim().toLowerCase();
    const match = comprehensiveStaffList.find(s => s.name.toLowerCase() === lowerName);

    if (match) {
      setSelectedRepCode(match.code);
      setFormData(prev => ({
        ...prev,
        name: nameVal,
        empCode: match.code,
        state: match.state || prev.state
      }));
    } else {
      setFormData(prev => ({ ...prev, name: nameVal }));
    }
  };

  const handleRemarkChip = (text) => {
    setFormData(prev => ({ ...prev, remarks: text }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amt = Number(formData.amount);
    if (!formData.month || !formData.empCode || !formData.name || !formData.state || isNaN(amt) || amt <= 0) {
      showToast('Please choose an Expense Month and fill out all required fields marked with * properly.', 'error');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const formattedNow = `${pad(now.getDate())} ${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const nextSNo = (claimsCount || 300) + 1;

    const newClaim = {
      id: `CLM-${String(nextSNo).padStart(3, '0')}`,
      sNo: nextSNo,
      empCode: formData.empCode,
      name: formData.name,
      state: formData.state,
      amount: amt,
      month: formData.month,
      remarks: formData.remarks.trim(),
      status: 'Approved',
      date: formattedNow,
      submissionDate: formattedNow
    };

    try {
      // 1. Submit to Google Apps Script backend
      await submitClaimToBackend(newClaim);

      // 2. Update local state
      onClaimSubmitted(newClaim);

      showToast(`TA Claim of ₹${amt.toLocaleString('en-IN')} for ${formData.name} (${formData.month}) submitted & saved!`, 'success');

      // Reset form
      setFormData({
        month: '',
        empCode: '',
        name: '',
        state: defaultTerritory,
        amount: '',
        remarks: ''
      });
      setSelectedRepCode('');
    } catch (err) {
      showToast(`Error submitting claim: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group comprehensive staff by state for the dropdown optgroups (Zero 'General' groups)
  const groupedStaffByState = useMemo(() => {
    const groups = {};
    comprehensiveStaffList.forEach(s => {
      let st = normalizeStateName(s.state);
      if (!st) {
        const found = MASTER_STAFF.find(m => m.code.toUpperCase() === s.code.toUpperCase()) ||
                      MASTER_CLAIMS.find(m => (m.empCode || '').toUpperCase() === s.code.toUpperCase());
        if (found) {
          st = normalizeStateName(found.state);
        }
      }
      if (!st) {
        st = defaultTerritory;
      }
      s.state = st; // Ensure state in the employee option label is never empty!
      if (!groups[st]) groups[st] = [];
      groups[st].push(s);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [comprehensiveStaffList, defaultTerritory]);

  return (
    <div className="card-panel" style={{ maxWidth: '1060px', margin: '0 auto', border: '1px solid #d1d5db', borderRadius: '6px', padding: '24px 30px', backgroundColor: '#ffffff' }}>
      <div className="panel-header" style={{ paddingBottom: '12px', marginBottom: '14px', borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              backgroundColor: '#eff6ff', 
              color: '#1d4ed8', 
              fontSize: '0.68rem', 
              fontWeight: 700, 
              padding: '2px 6px', 
              borderRadius: '2px', 
              letterSpacing: '0.04em',
              border: '1px solid #bfdbfe'
            }}>
              TA EXPENSE VOUCHER
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#15803d', fontSize: '0.74rem', fontWeight: 700 }}>
              <span className="pulse-circle" style={{ width: '6px', height: '6px', backgroundColor: '#15803d' }}></span>
              <span>Sheets Live Sync</span>
            </div>
          </div>
          <h2 className="panel-title" style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#111827' }}>Submit Traveling Allowance Claim</h2>
          <p className="panel-subtitle" style={{ fontSize: '0.78rem', margin: '2px 0 0', color: '#4b5563' }}>Select representative to auto-fetch details. Submits directly into Google Sheets.</p>
        </div>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '4px',
          backgroundColor: '#1d4ed8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          flexShrink: 0
        }}>
          <Receipt size={16} />
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* PRIMARY EMPLOYEE SELECTION DROPDOWN */}
        <div style={{ 
          backgroundColor: '#f9fafb', 
          border: '1px solid #d1d5db', 
          borderRadius: '4px', 
          padding: '14px 16px', 
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <label htmlFor="primaryEmployeeSelect" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={16} color="#1d4ed8" />
              <span>INSERT / SELECT EMPLOYEE (AUTO-FETCHES DETAILS) <span style={{ color: '#b91c1c' }}>*</span></span>
            </label>
            <span style={{ fontSize: '0.7rem', backgroundColor: '#1d4ed8', color: '#ffffff', fontWeight: 700, padding: '2px 8px', borderRadius: '2px' }}>
              Auto-Fetch Active
            </span>
          </div>

          <select
            id="primaryEmployeeSelect"
            className="form-select"
            value={selectedRepCode}
            onChange={e => handleSelectRepresentative(e.target.value)}
            required
            style={{ 
              fontWeight: 600, 
              fontSize: '0.9rem', 
              height: '38px',
              borderColor: selectedRepCode ? '#1d4ed8' : '#d1d5db',
              backgroundColor: '#ffffff',
              color: '#111827'
            }}
          >
            <option value="">
              {isUserBhawna
                ? `-- Choose Employee / Sales Representative (${comprehensiveStaffList.length} in Bhawna's 4 States) --`
                : isUserBharti
                ? `-- Choose Employee / Sales Representative (${comprehensiveStaffList.length} in Bharti's Territories) --`
                : `-- Choose Employee / Sales Representative (${comprehensiveStaffList.length} Available) --`}
            </option>
            {groupedStaffByState.map(([stateGroup, members]) => (
              <optgroup key={stateGroup} label={`📍 ${stateGroup} (${members.length} Representatives)`}>
                {members.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.name} • {s.code} ({s.state})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Auto-Fetched Confirmation Badge */}
          {selectedRepCode ? (
            <div style={{
              marginTop: '10px',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#111827', fontWeight: 600, flexWrap: 'wrap' }}>
                <span style={{ color: '#15803d' }}>✓ <strong>Auto-Fetched:</strong></span>
                <span>Name: <strong style={{ color: '#111827' }}>{formData.name}</strong></span>
                <span style={{ color: '#9ca3af' }}>•</span>
                <span>Code: <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '2px', color: '#111827' }}>{formData.empCode}</code></span>
                <span style={{ color: '#9ca3af' }}>•</span>
                <span>State: <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '2px', border: '1px solid #bfdbfe' }}>{formData.state}</span></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRepCode('');
                  setFormData(prev => ({ ...prev, empCode: '', name: '', state: defaultTerritory }));
                }}
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Clear ✕
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>
              💡 Select an employee from the dropdown above to automatically fill Name, Code, and State!
            </div>
          )}
        </div>

        <div className="form-grid">

          {/* 3-Letter Month Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="claimMonth">
              <span>Expense Month <span style={{ color: '#ef4444' }}>*</span></span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Choose Month</span>
            </label>
            <select
              id="claimMonth"
              className="form-select"
              value={formData.month || ''}
              onChange={e => setFormData({ ...formData, month: e.target.value })}
              required
              style={{ fontWeight: 700, color: formData.month ? '#0f172a' : '#64748b' }}
            >
              <option value="" disabled>Choose Month</option>
              {allowedExpenseMonths.map(m => (
                <option key={m} value={m} style={{ color: '#0f172a' }}>{m}</option>
              ))}
            </select>
          </div>

          {/* Employee Code (Auto-Fetched) */}
          <div className="form-group">
            <label className="form-label" htmlFor="claimEmpCode">
              <span>Employee Code <span style={{ color: '#ef4444' }}>*</span></span>
              <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                {selectedRepCode ? '✓ Auto-Fetched' : '⚡ Auto-completes'}
              </span>
            </label>
            <input
              id="claimEmpCode"
              list="staffDatalist"
              type="text"
              className="form-input"
              placeholder="e.g. HOS0182, HOS0289..."
              value={formData.empCode}
              onChange={e => handleEmpCodeChange(e.target.value)}
              autoComplete="off"
              required
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontWeight: 700, background: selectedRepCode ? '#f8fafc' : '#ffffff' }}
            />
            <datalist id="staffDatalist">
              {comprehensiveStaffList.map(s => (
                <option key={s.code} value={s.code}>{s.name} ({s.state})</option>
              ))}
            </datalist>
          </div>

          {/* Sales Person Name (Auto-Fetched) */}
          <div className="form-group">
            <label className="form-label" htmlFor="claimName">
              <span>Sales Person Full Name <span style={{ color: '#ef4444' }}>*</span></span>
              <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                {selectedRepCode ? '✓ Auto-Fetched' : ''}
              </span>
            </label>
            <input
              id="claimName"
              type="text"
              className="form-input"
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              onChange={e => handleNameChange(e.target.value)}
              required
              style={{ fontWeight: 600, background: selectedRepCode ? '#f8fafc' : '#ffffff' }}
            />
          </div>

          {/* State Dropdown (Auto-Fetched) */}
          <div className="form-group">
            <label className="form-label" htmlFor="claimState">
              <span>State / Territory <span style={{ color: '#ef4444' }}>*</span></span>
              <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                {selectedRepCode ? '✓ Auto-Fetched' : ''}
              </span>
            </label>
            <select
              id="claimState"
              className="form-select"
              value={formData.state || defaultTerritory}
              onChange={e => setFormData({ ...formData, state: e.target.value })}
              required
              style={{ fontWeight: 600, background: selectedRepCode ? '#f8fafc' : '#ffffff' }}
            >
              <option value="" disabled>-- Select State / Territory --</option>
              {availableTerritories.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* TA Claim Amount */}
          <div className="form-group form-grid-full">
            <label className="form-label" htmlFor="claimAmount">
              <span>TA Claim Amount (₹) <span style={{ color: '#ef4444' }}>*</span></span>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Total Traveling Allowance</span>
            </label>
            <div className="currency-input-box">
              <span className="currency-symbol">₹</span>
              <input
                id="claimAmount"
                type="number"
                min="1"
                step="1"
                className="form-input currency-input"
                placeholder="0"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                required
                style={{ height: '42px', fontSize: '1.05rem' }}
              />
            </div>
            {formData.amount > 0 && (
              <div className="words-display" style={{ marginTop: '4px', fontSize: '0.78rem' }}>
                <span style={{ opacity: 0.8, marginRight: '4px' }}>In Words:</span>
                <strong>{numberToWordsINR(formData.amount)}</strong>
              </div>
            )}
          </div>

          {/* Remarks / Full & Final */}
          <div className="form-group form-grid-full">
            <label className="form-label" htmlFor="claimRemarks">
              <span>Remarks / Full & Final / Notes (Optional)</span>
            </label>
            <input
              id="claimRemarks"
              type="text"
              className="form-input"
              placeholder="e.g. routine field travel, distributor review, monthly settlement"
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
            />
            <div className="chips-row" style={{ marginTop: '6px', gap: '6px' }}>
              <button type="button" className="tag-chip" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => handleRemarkChip('Monthly Routine Field Travel')}>⚡ Monthly Routine</button>
              <button type="button" className="tag-chip" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => handleRemarkChip('Dealer Network Visit & DA')}>🏢 Dealer Visit</button>
              <button type="button" className="tag-chip" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => handleRemarkChip('Full & Final Settlement')}>🔒 Full & Final</button>
              <button type="button" className="tag-chip" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => handleRemarkChip('Outstation Market Expansion')}>🚀 Market Expansion</button>
            </div>
          </div>

        </div>

        {/* Submit Action */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          <button
            type="submit"
            className="btn-primary"
            style={{ minWidth: '180px', height: '40px', fontSize: '0.88rem', fontWeight: 800 }}
            disabled={isSubmitting}
          >
            <Send size={16} />
            <span>{isSubmitting ? 'Recording in Sheet...' : 'Submit TA Claim'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
