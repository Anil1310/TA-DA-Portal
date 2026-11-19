/**
 * Currency and Indian numbering utilities
 */

export function formatINR(amount, forceDecimals = false) {
  const num = Number(amount) || 0;
  if (forceDecimals || !Number.isInteger(num)) {
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return '₹' + num.toLocaleString('en-IN');
}

export function numberToWordsINR(amount) {
  const num = parseInt(amount, 10);
  if (isNaN(num) || num <= 0) return '';
  if (num === 0) return 'Zero Rupees';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n) {
    let s = '';
    if (n > 19) {
      s += tens[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + ones[n % 10] : '');
    } else if (n > 0) {
      s += ones[n];
    }
    return s;
  }

  let n = num;
  let words = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  n %= 100;

  if (crore > 0) words += convertChunk(crore) + ' Crore ';
  if (lakh > 0) words += convertChunk(lakh) + ' Lakh ';
  if (thousand > 0) words += convertChunk(thousand) + ' Thousand ';
  if (hundred > 0) words += convertChunk(hundred) + ' Hundred ';
  if (n > 0) {
    if (words !== '') words += 'and ';
    words += convertChunk(n) + ' ';
  }

  return words.trim() + ' Rupees Only';
}

export const MONTHS_3_LETTER = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const STATES = [
  'Delhi',
  'Ex-UP',
  'Haryana',
  'Local Agra',
  'MP',
  'Punjab',
  'U.P. West',
  'Uttarakhand',
  'Bihar',
  'Chhattisgarh',
  'Gujarat',
  'Rajasthan',
  'Jharkhand',
  'Meghalaya'
];

export const TERRITORIES = STATES.filter(state =>
  !['Other', 'Himachal Pradesh', 'Jammu & Kashmir', 'Maharashtra'].includes(state)
);

export const BHAWNA_STATES = ['Rajasthan', 'Gujarat', 'Bihar', 'Jharkhand'];
export const BHARTI_STATES = [
  'Delhi',
  'Ex-UP',
  'Haryana',
  'Local Agra',
  'MP',
  'Punjab',
  'U.P. West',
  'Uttarakhand',
  'Chhattisgarh',
  'Meghalaya'
];

export function isUserBhawnaHelper(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const email = String(user.email || '').toLowerCase();
  const name = String(user.name || '').toLowerCase();
  if (role === 'admin' || email.includes('admin') || email.includes('mis@')) return false;
  if (email.includes('bhawna') || name.includes('bhawna') || email.includes('marketing@')) return true;
  if (Array.isArray(user.allowedStates) && user.allowedStates.length > 0) {
    const bLower = BHAWNA_STATES.map(s => s.toLowerCase());
    return user.allowedStates.every(s => bLower.includes(String(s).toLowerCase().trim()));
  }
  return false;
}

export function isUserBhartiHelper(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const email = String(user.email || '').toLowerCase();
  if (role === 'admin' || email.includes('admin') || email.includes('mis@')) return false;
  return !isUserBhawnaHelper(user);
}

export function normalizeMonthName(mVal) {
  if (!mVal) return '';
  const s = String(mVal).trim().toLowerCase();
  const map = {
    'jan': 'Jan', 'january': 'Jan',
    'feb': 'Feb', 'february': 'Feb',
    'mar': 'Mar', 'march': 'Mar',
    'apr': 'Apr', 'april': 'Apr',
    'may': 'May',
    'jun': 'Jun', 'june': 'Jun',
    'jul': 'Jul', 'july': 'Jul',
    'aug': 'Aug', 'august': 'Aug',
    'sep': 'Sep', 'sept': 'Sep', 'september': 'Sep', 'spe': 'Sep',
    'oct': 'Oct', 'october': 'Oct',
    'nov': 'Nov', 'november': 'Nov',
    'dec': 'Dec', 'december': 'Dec'
  };
  for (const [key, val] of Object.entries(map)) {
    if (s === key || s.startsWith(key)) return val;
  }
  return String(mVal).trim();
}

export const TERRITORY_COLORS = {
  'Delhi': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Ex-UP': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Haryana': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Local Agra': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'MP': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Punjab': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'U.P. West': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'UK': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Uttarakhand': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Bihar': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Chhattisgarh': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Gujarat': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Rajasthan': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Jharkhand': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
  'Meghalaya': { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' }
};

export function getTerritoryStyle(stateName) {
  const norm = normalizeStateName(stateName);
  return TERRITORY_COLORS[norm] || { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
}

export function normalizeStateName(state, empCode) {
  const raw = String(state || '').trim();
  const isInvalid = !raw || raw.includes('₹') || raw.includes('$') || !/[a-zA-Z]/.test(raw) || (/^\d+$/.test(raw.replace(/\D/g, '')) && raw.replace(/\D/g, '').length > 0);

  if (!isInvalid) {
    const s = raw.toLowerCase();
    if (s === 'uk' || s === 'uttarakhand' || s === 'uk (uttarakhand)' || s === 'uttaranchal') return 'UK';
    if (s === 'raj' || s === 'rajasthan') return 'Rajasthan';
    if (s === 'gujrat' || s === 'gujarat' || s === 'guj') return 'Gujarat';
    if (s === 'cg' || s === 'chhattisgarh' || s === 'chattisgarh') return 'Chhattisgarh';
    if (s === 'bihar' || s === 'bih') return 'Bihar';
    if (s === 'jharkhand' || s === 'jh' || s === 'jhk') return 'Jharkhand';
    if (s === 'delhi' || s === 'del') return 'Delhi';
    if (s === 'haryana' || s === 'har') return 'Haryana';
    if (s === 'punjab' || s === 'pun' || s === 'pb') return 'Punjab';
    if (s === 'mp' || s === 'madhya pradesh') return 'MP';
    if (s === 'ex-up' || s === 'up' || s === 'u.p.' || s === 'ex up') return 'Ex-UP';
    if (s === 'u.p. west' || s === 'up west' || s === 'upw' || s === 'up-west') return 'U.P. West';
    if (s === 'local agra' || s === 'agra') return 'Local Agra';
    if (s === 'meghalaya' || s === 'megalaya') return 'Meghalaya';

    const matched = STATES.find(st => st.toLowerCase() === s);
    if (matched) return matched === 'Uttarakhand' ? 'UK' : matched;
    return raw;
  }

  // Recover from empCode
  if (empCode) {
    const code = String(empCode).trim().toUpperCase();
    if (code === 'HOS0330' || code === 'HOS0214' || code === 'HOS0282') return 'UK';
    if (code === 'HOS0182' || code === 'HOS0198' || code === 'HOS0183' || code === 'HOS0211' || code === 'HOS0301' || code === 'HOS0302') return 'Delhi';
  }

  return 'Delhi';
}

export function isStateAllowed(state, allowedStates, empCode, empName) {
  if (!allowedStates || !Array.isArray(allowedStates) || allowedStates.length === 0) return false;
  const normState = normalizeStateName(state, empCode, empName).toLowerCase();
  return allowedStates.some(allowed => normalizeStateName(allowed).toLowerCase() === normState);
}

export function formatSubmissionDate(val) {
  if (!val) return '—';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return '—';
    // If it already matches "30 2026 13:29:00" format: dd yyyy HH:mm:ss
    if (/^\d{1,2}\s+\d{4}\s+\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      return trimmed;
    }
    // If it's just month + year like "Sep 2026" or "Sep", return as-is:
    if (/^[A-Za-z]{3,9}(\s+\d{4})?$/i.test(trimmed)) {
      return trimmed;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
      if (trimmed.includes(':') || /\d{1,2}/.test(trimmed)) {
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getDate())} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }
    }
    return trimmed;
  }
  if (val instanceof Date) {
    const pad = n => String(n).padStart(2, '0');
    return `${pad(val.getDate())} ${val.getFullYear()} ${pad(val.getHours())}:${pad(val.getMinutes())}:${pad(val.getSeconds())}`;
  }
  return String(val);
}

