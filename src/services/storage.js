/**
 * Data storage and Google Apps Script integration service
 */
import { DEFAULT_DOCTOR_SOAP_LOGO } from './defaultLogo';

const STORAGE_KEYS = {
  CLAIMS: 'bharti_ta_claims_v8_consolidated_amounts',
  STAFF: 'bharti_ta_staff_v8',
  CONFIG: 'bharti_ta_config_v6',
  PERMISSIONS: 'ta_portal_user_permissions_v1'
};

const DEFAULT_CONFIG = {
  spreadsheetId: '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY',
  secondarySpreadsheetId: '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w',
  spreadsheetIds: ['1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY', '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w'],
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzVFMEJbzicH-8Euoe2k12ZizgFuGA1C6B7T9tZo9Y8yBGME0DWVGsyGW1cd9CHJkew/exec',
  // Supabase Database Integration Settings
  supabaseEnabled: false,
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseTableName: 'ta_claims',
  supabaseSyncMode: 'dual' // 'sheets_only' | 'supabase_only' | 'dual'
};

const DEFAULT_STAFF = [
  { code: 'HOS0182', name: 'Amit Sharma', state: 'Delhi', phone: '+91 98112 34567', designation: 'Sr. Sales Officer' },
  { code: 'HOS0215', name: 'Rajesh Kumar', state: 'U.P. West', phone: '+91 98371 45678', designation: 'Territory Manager' },
  { code: 'HOS0244', name: 'Vikram Singh', state: 'Local Agra', phone: '+91 97582 56789', designation: 'Sales Executive' },
  { code: 'HOS0312', name: 'Sunil Verma', state: 'Haryana', phone: '+91 98123 67890', designation: 'Area Sales Manager' },
  { code: 'HOS0388', name: 'Deepak Yadav', state: 'Rajasthan', phone: '+91 94140 78901', designation: 'Sales Officer' },
  { code: 'HOS0405', name: 'Praveen Tiwari', state: 'Ex-UP', phone: '+91 94520 89012', designation: 'Territory Executive' },
  { code: 'HOS0452', name: 'Manoj Joshi', state: 'UK (Uttarakhand)', phone: '+91 94120 90123', designation: 'Sales Officer' },
  { code: 'HOS0498', name: 'Sanjay Mishra', state: 'MP', phone: '+91 98260 01234', designation: 'Territory Manager' },
  { code: 'HOS0531', name: 'Rakesh Gupta', state: 'Bihar', phone: '+91 94310 12345', designation: 'Sales Executive' },
  { code: 'HOS0589', name: 'Anil Chauhan', state: 'Punjab', phone: '+91 98760 23456', designation: 'Area Sales Manager' }
];

const DEFAULT_CLAIMS = [
  {
    id: 'CLM-001',
    sNo: 1,
    empCode: 'HOS0182',
    name: 'Amit Sharma',
    state: 'Delhi',
    amount: 5400,
    month: 'Aug',
    remarks: 'Monthly routine territory travel & distributor visits',
    status: 'Approved',
    date: '18-Aug-2026 11:30'
  },
  {
    id: 'CLM-002',
    sNo: 2,
    empCode: 'HOS0215',
    name: 'Rajesh Kumar',
    state: 'U.P. West',
    amount: 4850,
    month: 'Aug',
    remarks: 'Dealer network meeting and daily allowances',
    status: 'Approved',
    date: '17-Aug-2026 15:45'
  },
  {
    id: 'CLM-003',
    sNo: 3,
    empCode: 'HOS0312',
    name: 'Sunil Verma',
    state: 'Haryana',
    amount: 6200,
    month: 'Aug',
    remarks: 'Field expansion survey & rural outreach',
    status: 'Pending',
    date: '16-Aug-2026 09:20'
  },
  {
    id: 'CLM-004',
    sNo: 4,
    empCode: 'HOS0244',
    name: 'Vikram Singh',
    state: 'Local Agra',
    amount: 3200,
    month: 'Jul',
    remarks: 'Local distributor coordination & logistics',
    status: 'Settled',
    date: '28-Jul-2026 14:10'
  },
  {
    id: 'CLM-005',
    sNo: 5,
    empCode: 'HOS0388',
    name: 'Deepak Yadav',
    state: 'Rajasthan',
    amount: 5100,
    month: 'Jul',
    remarks: 'Jaipur to Ajmer travel route',
    status: 'Settled',
    date: '25-Jul-2026 17:00'
  },
  {
    id: 'CLM-006',
    sNo: 6,
    empCode: 'HOS0498',
    name: 'Sanjay Mishra',
    state: 'MP',
    amount: 5900,
    month: 'Jun',
    remarks: 'Bhopal to Indore dealer visits',
    status: 'Settled',
    date: '20-Jun-2026 10:45'
  }
];

// Safe Storage wrapper for sandboxed iframes (prevents DOMException: Access Denied)
const memStorage = {};

let hasStorage = false;
try {
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    const probe = '__probe_' + Math.random();
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    hasStorage = true;
  }
} catch (e) {
  hasStorage = false;
  console.info('Running in sandboxed/restricted iframe: using resilient in-memory storage.');
}

function safeGet(key, fallback) {
  if (hasStorage) {
    try {
      const val = window.localStorage.getItem(key);
      if (val) return JSON.parse(val);
    } catch (e) {
      console.warn('LocalStorage read failed, using memory store:', e);
    }
  }
  return memStorage[key] !== undefined ? memStorage[key] : fallback;
}

function safeSet(key, value) {
  memStorage[key] = value;
  if (hasStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage write failed:', e);
    }
  }
}

import { MASTER_CLAIMS, MASTER_STAFF } from './masterData.js';

export function getStoredClaims() {
  const stored = safeGet(STORAGE_KEYS.CLAIMS, MASTER_CLAIMS);
  const bhawnaStored = Array.isArray(stored) ? stored.filter(c => 
    c.sourceSpreadsheet === 'Bhawna TA Master' || 
    ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(String(c.state || '').toLowerCase())
  ) : [];
  const bhawnaSum = bhawnaStored.reduce((a, b) => a + (Number(b.amount) || 0), 0);

  // If stored has no Bhawna records, or if Bhawna sum is 0, or if total records < 400: reset to MASTER_CLAIMS!
  if (!stored || !Array.isArray(stored) || stored.length < 400 || bhawnaStored.length === 0 || bhawnaSum <= 0) {
    return MASTER_CLAIMS;
  }
  return stored;
}

export function saveStoredClaims(claims) {
  safeSet(STORAGE_KEYS.CLAIMS, claims);
}

export function getStoredStaff() {
  const stored = safeGet(STORAGE_KEYS.STAFF, null);
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored;
  }
  return MASTER_STAFF;
}

export function saveStoredStaff(staff) {
  safeSet(STORAGE_KEYS.STAFF, staff);
}

export function getStoredConfig() {
  const cfg = safeGet(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
  if (!cfg) return DEFAULT_CONFIG;

  const spreadsheetIds = Array.isArray(cfg.spreadsheetIds)
    ? cfg.spreadsheetIds.filter(Boolean)
    : [cfg.spreadsheetId || '', cfg.secondarySpreadsheetId || ''].filter(Boolean);

  return {
    ...DEFAULT_CONFIG,
    ...cfg,
    spreadsheetId: cfg.spreadsheetId || spreadsheetIds[0] || DEFAULT_CONFIG.spreadsheetId,
    secondarySpreadsheetId: cfg.secondarySpreadsheetId || spreadsheetIds[1] || DEFAULT_CONFIG.secondarySpreadsheetId,
    spreadsheetIds: (spreadsheetIds.length >= 2) ? spreadsheetIds : DEFAULT_CONFIG.spreadsheetIds
  };
}

export function saveStoredConfig(cfg) {
  const safeCfg = {
    ...DEFAULT_CONFIG,
    ...cfg,
    spreadsheetIds: Array.isArray(cfg?.spreadsheetIds) ? cfg.spreadsheetIds.filter(Boolean) : [cfg?.spreadsheetId || '', cfg?.secondarySpreadsheetId || ''].filter(Boolean)
  };
  safeCfg.spreadsheetId = safeCfg.spreadsheetIds[0] || safeCfg.spreadsheetId || DEFAULT_CONFIG.spreadsheetId;
  safeCfg.secondarySpreadsheetId = safeCfg.spreadsheetIds[1] || safeCfg.secondarySpreadsheetId || '';
  safeSet(STORAGE_KEYS.CONFIG, safeCfg);
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_STORAGE_KEY = 'ta_portal_session_v2';
const SAVED_CREDS_KEY = 'ta_portal_saved_creds_v2';

export const DEFAULT_USER = {
  id: 'admin',
  name: 'Admin',
  email: 'admin@company.com',
  password: 'admin123',
  role: 'admin',
  allowedStates: []
};

/**
 * Returns currently logged-in user if active within 30-day session window.
 */
export function getStoredUser() {
  const session = safeGet(SESSION_STORAGE_KEY, null);
  if (session && session.user && session.expiresAt) {
    if (Date.now() < session.expiresAt) {
      return session.user;
    } else {
      // Session expired after 30 days
      clearStoredSession();
      return null;
    }
  }

  // Fallback to check legacy storage if valid
  const legacy = safeGet('ta_portal_user', null);
  if (legacy && legacy.email && legacy.role) {
    saveStoredUser(legacy, true);
    return legacy;
  }

  return null;
}

/**
 * Saves logged-in user with automatic 30-day expiration.
 */
export function saveStoredUser(user, remember30Days = true) {
  if (user) {
    const session = {
      user: user,
      savedAt: Date.now(),
      expiresAt: remember30Days ? Date.now() + THIRTY_DAYS_MS : Date.now() + (24 * 60 * 60 * 1000)
    };
    safeSet(SESSION_STORAGE_KEY, session);
    safeSet('ta_portal_user', user);
  } else {
    clearStoredSession();
  }
}

/**
 * Clears active session.
 */
export function clearStoredSession() {
  memStorage[SESSION_STORAGE_KEY] = null;
  memStorage['ta_portal_user'] = null;
  if (hasStorage) {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem('ta_portal_user');
    } catch (e) {}
  }
}

/**
 * Retrieves saved email and password if stored within 30-day period.
 */
export function getSavedCredentials() {
  const creds = safeGet(SAVED_CREDS_KEY, null);
  if (creds && creds.email && creds.password && creds.expiresAt) {
    if (Date.now() < creds.expiresAt) {
      return { email: creds.email, password: creds.password, remember: true };
    } else {
      clearSavedCredentials();
    }
  }
  return { email: '', password: '', remember: true };
}

/**
 * Stores or clears credentials on client system for 30 days.
 */
export function saveSavedCredentials(email, password, remember = true) {
  if (remember && email) {
    const creds = {
      email: String(email).trim(),
      password: String(password || '').trim(),
      expiresAt: Date.now() + THIRTY_DAYS_MS
    };
    safeSet(SAVED_CREDS_KEY, creds);
  } else {
    clearSavedCredentials();
  }
}

export function clearSavedCredentials() {
  memStorage[SAVED_CREDS_KEY] = null;
  if (hasStorage) {
    try {
      localStorage.removeItem(SAVED_CREDS_KEY);
    } catch (e) {}
  }
}

/**
 * Authenticates user credentials against the 'Users' sheet tab in Google Sheets.
 */
export async function authenticateWithBackend({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  // 1. If running inside Google Apps Script Web App iframe
  if (typeof window !== 'undefined' && window.google && window.google.script && window.google.script.run) {
    return new Promise((resolve) => {
      window.google.script.run
        .withSuccessHandler((res) => {
          if (res && res.success && res.user) {
            resolve({ success: true, user: res.user });
          } else {
            resolve({ success: false, error: (res && res.message) || 'Invalid email or password.' });
          }
        })
        .withFailureHandler((err) => {
          resolve({ success: false, error: (err && err.message) || String(err) });
        })
        .authenticateUser({ email: cleanEmail, password: cleanPass });
    });
  }

  // 2. Fallback via Apps Script REST Web App URL
  const config = getStoredConfig();
  if (config.appsScriptUrl) {
    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'login',
          email: cleanEmail,
          password: cleanPass
        })
      });
      const data = await response.json();
      if (data && data.success && data.user) {
        return { success: true, user: data.user };
      } else {
        return { success: false, error: (data && data.message) || 'Invalid email or password.' };
      }
    } catch (err) {
      console.warn('Network auth failed, checking local credentials:', err);
    }
  }

  // 3. Fallback for offline / emergency system admin access only
  if ((cleanEmail === 'mis@doctorsoap.com' || cleanEmail === 'admin@company.com') && cleanPass === 'admin123') {
    return {
      success: true,
      user: {
        id: 'admin',
        name: 'System Administrator',
        email: cleanEmail,
        role: 'admin',
        status: 'Active',
        allowedStates: []
      }
    };
  }

  return { success: false, error: 'Authentication failed. Please verify credentials or contact Admin.' };
}

/**
 * Registers a new user with Google Apps Script Users database sheet.
 */
export async function registerUserWithBackend({ email, password, name, state }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();
  const cleanName = String(name || '').trim() || cleanEmail.split('@')[0];
  const cleanState = String(state || 'All').trim();

  // 1. Google Apps Script Web App environment
  if (typeof window !== 'undefined' && window.google && window.google.script && window.google.script.run) {
    return new Promise((resolve) => {
      window.google.script.run
        .withSuccessHandler((res) => resolve(res || { success: true }))
        .withFailureHandler((err) => resolve({ success: false, message: (err && err.message) || String(err) }))
        .registerUser({ email: cleanEmail, password: cleanPass, name: cleanName, state: cleanState });
    });
  }

  // 2. Apps Script REST URL fallback
  const config = getStoredConfig();
  if (config.appsScriptUrl) {
    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'register',
          email: cleanEmail,
          password: cleanPass,
          name: cleanName,
          state: cleanState
        })
      });
      const data = await response.json();
      return data || { success: true };
    } catch (err) {
      console.warn('Network registration notice:', err);
    }
  }

  // 3. Fallback for offline/preview
  return {
    success: true,
    message: `Account registered successfully for ${cleanEmail}! Please sign in.`
  };
}

export function getStoredActivePage() {
  return safeGet('ta_portal_active_page', 'directory');
}

export function saveStoredActivePage(page) {
  safeSet('ta_portal_active_page', page);
}

export const DEFAULT_PERMISSIONS = {
  bharti: {
    id: 'bharti',
    name: 'Bharti',
    role: 'Sales Coordinator',
    email: 'salescoordinator1@doctorsoap.com',
    linkName: 'Link-1',
    openSheetLink: true,
    pages: {
      submit: true,
      claims: true,
      analytics: true,
      directory: true
    },
    features: {
      openSheetLink: true,
      editClaim: true,
      deleteClaim: false,
      exportData: true,
      downloadVoucher: true,
      manageBranding: false,
      manageSupabase: false
    }
  },
  bhawna: {
    id: 'bhawna',
    name: 'Bhawna',
    role: 'Marketing Coordinator',
    email: 'marketing@doctorsoap.com',
    linkName: 'Link-2',
    openSheetLink: true,
    pages: {
      submit: true,
      claims: true,
      analytics: true,
      directory: true
    },
    features: {
      openSheetLink: true,
      editClaim: true,
      deleteClaim: false,
      exportData: true,
      downloadVoucher: true,
      manageBranding: false,
      manageSupabase: false
    }
  }
};

const BRANDING_STORAGE_KEY = 'ta_portal_branding_v2';
export const DEFAULT_BRANDING = {
  companyName: 'MIS TA-DA Portal',
  companySubtitle: 'Pee Cee Cosma Pvt. Ltd',
  logoUrl: DEFAULT_DOCTOR_SOAP_LOGO
};

export function getStoredBranding() {
  const saved = safeGet(BRANDING_STORAGE_KEY, null);
  if (!saved || typeof saved !== 'object') {
    return DEFAULT_BRANDING;
  }
  return {
    companyName: saved.companyName || DEFAULT_BRANDING.companyName,
    companySubtitle: saved.companySubtitle || DEFAULT_BRANDING.companySubtitle,
    logoUrl: saved.logoUrl || DEFAULT_BRANDING.logoUrl
  };
}

export function saveStoredBranding(branding) {
  safeSet(BRANDING_STORAGE_KEY, branding);
}

/**
 * Uploads company logo and branding to Google Drive via Apps Script backend.
 */
export async function uploadBrandingToBackend(payload) {
  // If in Apps Script environment:
  if (typeof window !== 'undefined' && window.google && window.google.script && window.google.script.run) {
    return new Promise((resolve) => {
      window.google.script.run
        .withSuccessHandler((res) => resolve(res || { success: true }))
        .withFailureHandler((err) => resolve({ success: false, message: (err && err.message) || String(err) }))
        .uploadCompanyLogoToDrive(payload);
    });
  }

  // If in REST API environment:
  const config = getStoredConfig();
  if (!config.appsScriptUrl) return { success: true, localOnly: true };

  try {
    const postPayload = { action: 'uploadCompanyLogo', ...payload };
    const res = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(postPayload)
    });
    const data = await res.json();
    return data || { success: true };
  } catch (err) {
    console.warn('Upload logo to Google Drive failed:', err);
    return { success: false, message: err.message };
  }
}

export function getStoredPermissions() {
  const saved = safeGet(STORAGE_KEYS.PERMISSIONS, null);
  if (!saved || typeof saved !== 'object') {
    return DEFAULT_PERMISSIONS;
  }
  return {
    bharti: {
      ...DEFAULT_PERMISSIONS.bharti,
      ...(saved.bharti || {}),
      openSheetLink: saved.bharti?.openSheetLink ?? saved.bharti?.features?.openSheetLink ?? true,
      pages: { ...DEFAULT_PERMISSIONS.bharti.pages, ...(saved.bharti?.pages || {}) },
      features: { 
        ...DEFAULT_PERMISSIONS.bharti.features, 
        ...(saved.bharti?.features || {}),
        manageBranding: saved.bharti?.features?.manageBranding ?? false,
        manageSupabase: saved.bharti?.features?.manageSupabase ?? false
      }
    },
    bhawna: {
      ...DEFAULT_PERMISSIONS.bhawna,
      ...(saved.bhawna || {}),
      openSheetLink: saved.bhawna?.openSheetLink ?? saved.bhawna?.features?.openSheetLink ?? true,
      pages: { ...DEFAULT_PERMISSIONS.bhawna.pages, ...(saved.bhawna?.pages || {}) },
      features: { 
        ...DEFAULT_PERMISSIONS.bhawna.features, 
        ...(saved.bhawna?.features || {}),
        manageBranding: saved.bhawna?.features?.manageBranding ?? false,
        manageSupabase: saved.bhawna?.features?.manageSupabase ?? false
      }
    }
  };
}

export function saveStoredPermissions(perms) {
  safeSet(STORAGE_KEYS.PERMISSIONS, perms);
}

/**
 * Submit claim to Google Apps Script Web App
 */
export async function submitClaimToBackend(claim) {
  const config = getStoredConfig();

  // If Supabase database integration is enabled, also mirror claim row to Supabase
  if (config?.supabaseEnabled && config?.supabaseUrl && config?.supabaseAnonKey) {
    mirrorClaimToSupabase(claim, config).catch(e => console.warn('Supabase auto-sync notice:', e));
  }

  // If hosted inside Google Apps Script Web App environment:
  if (typeof window !== 'undefined' && window.google && window.google.script && window.google.script.run) {
    return new Promise((resolve) => {
      window.google.script.run
        .withSuccessHandler((res) => resolve(res || { success: true }))
        .withFailureHandler((err) => resolve({ success: false, error: (err && err.message) || String(err) }))
        .submitTABill({
          month: claim.month,
          empCode: claim.empCode,
          name: claim.name,
          state: claim.state,
          taBill: claim.amount,
          remarks: claim.remarks || '',
          fullFinal: ''
        });
    });
  }

  // Fallback for external web app / localhost:
  if (!config.appsScriptUrl) {
    return { success: true, localOnly: true };
  }

  try {
    const payload = {
      month: claim.month,
      empCode: claim.empCode,
      name: claim.name,
      state: claim.state,
      taBill: claim.amount,
      remarks: claim.remarks,
      fullFinal: claim.remarks
    };

    await fetch(config.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return { success: true };
  } catch (err) {
    console.warn('Sync to Google Apps Script failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Test connectivity to Supabase PostgreSQL REST endpoint
 */
export async function testSupabaseConnection(supabaseConfig) {
  const url = (supabaseConfig.supabaseUrl || '').trim().replace(/\/+$/, '');
  const key = (supabaseConfig.supabaseAnonKey || '').trim();
  const table = (supabaseConfig.supabaseTableName || 'ta_claims').trim();

  if (!url || !key) {
    throw new Error('Supabase Project URL and Anon API Key are required.');
  }

  const endpoint = `${url}/rest/v1/${table}?select=*&limit=1`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
  }

  const data = await res.json();
  return { success: true, count: Array.isArray(data) ? data.length : 0 };
}

/**
 * Mirror claim submission directly to Supabase ta_claims table
 */
export async function mirrorClaimToSupabase(claim, supabaseConfig) {
  try {
    const url = (supabaseConfig.supabaseUrl || '').trim().replace(/\/+$/, '');
    const key = (supabaseConfig.supabaseAnonKey || '').trim();
    const table = (supabaseConfig.supabaseTableName || 'ta_claims').trim();
    if (!url || !key) return;

    const row = {
      id: claim.id || `CLM-${Date.now()}`,
      s_no: Number(claim.sNo) || null,
      emp_code: claim.empCode,
      sales_person_name: claim.name,
      state: claim.state,
      ta_bill: Number(claim.amount) || 0,
      month: claim.month,
      full_and_final: claim.remarks || '',
      submission_date: claim.date || new Date().toISOString()
    };

    await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    });
  } catch (e) {
    console.warn('Supabase mirror notice:', e);
  }
}

/**
 * Update existing claim in Google Sheet backend
 */
export async function updateClaimInBackend(claim, userRole) {
  const config = getStoredConfig();
  const payload = {
    ...claim,
    userRole: userRole || (getStoredUser()?.role) || 'sales'
  };

  if (typeof window !== 'undefined' && window.google && window.google.script && window.google.script.run) {
    return new Promise((resolve) => {
      window.google.script.run
        .withSuccessHandler((res) => resolve(res || { success: true }))
        .withFailureHandler((err) => resolve({ success: false, error: (err && err.message) || String(err) }))
        .updateTABill(payload);
    });
  }

  if (!config.appsScriptUrl) return { success: true, localOnly: true };

  try {
    const postPayload = { action: 'update', ...payload };
    const res = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(postPayload)
    });
    const data = await res.json();
    return data || { success: true };
  } catch (err) {
    console.warn('Update to Google Apps Script failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete claim from Google Sheet backend
 */
export async function deleteClaimFromBackend(claim, userRole) {
  const config = getStoredConfig();
  const payload = {
    ...claim,
    userRole: userRole || (getStoredUser()?.role) || 'sales'
  };

  if (typeof window !== 'undefined' && window.google && window.google.script && window.google.script.run) {
    return new Promise((resolve) => {
      window.google.script.run
        .withSuccessHandler((res) => resolve(res || { success: true }))
        .withFailureHandler((err) => resolve({ success: false, error: (err && err.message) || String(err) }))
        .deleteTABill(payload);
    });
  }

  if (!config.appsScriptUrl) return { success: true, localOnly: true };

  try {
    const postPayload = { action: 'delete', ...payload };
    const res = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(postPayload)
    });
    const data = await res.json();
    return data || { success: true };
  } catch (err) {
    console.warn('Delete from Google Apps Script failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Toggle lock/unlock for a monthly sheet (Admin only)
 */
export async function toggleSheetLockInBackend(month, lockStatus, userRole) {
  const config = getStoredConfig();
  const payload = {
    month: month,
    lock: lockStatus,
    role: userRole || 'admin',
    spreadsheetId: config.spreadsheetId,
    secondarySpreadsheetId: config.secondarySpreadsheetId,
    spreadsheetIds: Array.isArray(config.spreadsheetIds) ? config.spreadsheetIds : [config.spreadsheetId, config.secondarySpreadsheetId].filter(Boolean)
  };

  if (typeof window !== 'undefined' && window.google && window.google.script && window.google.script.run) {
    return new Promise((resolve) => {
      window.google.script.run
        .withSuccessHandler((res) => resolve(res || { success: true }))
        .withFailureHandler((err) => resolve({ success: false, message: (err && err.message) || String(err) }))
        .toggleMonthSheetLock(payload);
    });
  }

  if (!config.appsScriptUrl) return { success: true, localOnly: true };

  try {
    const postPayload = { action: 'toggleLock', ...payload };
    const res = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(postPayload)
    });
    const data = await res.json();
    return data || { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}


/**
 * Add new staff representative to Google Sheet backend
 */
export async function addStaffToBackend(staff) {
  if (typeof window !== 'undefined' && window.google && window.google.script && window.google.script.run) {
    return new Promise((resolve) => {
      window.google.script.run
        .withSuccessHandler((res) => resolve(res || { success: true }))
        .withFailureHandler((err) => resolve({ success: false, error: (err && err.message) || String(err) }))
        .addStaffMember(staff);
    });
  }

  if (!config.appsScriptUrl) return { success: true, localOnly: true };

  try {
    const payload = { action: 'addStaff', ...staff };
    await fetch(config.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (err) {
    console.warn('Add staff to Google Apps Script failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update existing staff representative in Google Sheet backend
 */
export async function updateStaffInBackend(payload) {
  if (typeof window !== 'undefined' && window.google && window.google.script && window.google.script.run) {
    return new Promise((resolve) => {
      window.google.script.run
        .withSuccessHandler((res) => resolve(res || { success: true }))
        .withFailureHandler((err) => resolve({ success: false, error: (err && err.message) || String(err) }))
        .updateStaffMember(payload);
    });
  }

  if (!config.appsScriptUrl) return { success: true, localOnly: true };

  try {
    const postPayload = { action: 'updateStaff', ...payload };
    await fetch(config.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postPayload)
    });
    return { success: true };
  } catch (err) {
    console.warn('Update staff to Google Apps Script failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Export claims as CSV file
 */
export function exportClaimsCSV(claims) {
  if (!claims || claims.length === 0) return false;

  const headers = ['Claim ID', 'S.No', 'Source Master Tab', 'Emp Code', 'Sales Person Name', 'Territory / State', 'TA Bill (INR)', 'Month', 'Status', 'Remarks', 'Date'];
  const rows = [headers.join(',')];

  claims.forEach((c, idx) => {
    rows.push([
      `"${c.id || 'CLM-' + (idx + 1)}"`,
      idx + 1,
      `"${c.sourceSpreadsheet || 'Bharti TA Master'}"`,
      `"${c.empCode}"`,
      `"${c.name}"`,
      `"${c.state}"`,
      c.amount,
      `"${c.month}"`,
      `"${c.status || 'Approved'}"`,
      `"${(c.remarks || '').replace(/"/g, '""')}"`,
      `"${c.date || ''}"`
    ].join(','));
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TA_Expenses_Master_Consolidated_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Executes a sheet automation action on the Google Apps Script backend.
 * Supports:
 * - 'runFullAutomation': Complete 5-step pipeline
 * - 'combineMaster': Consolidate month sheets to Master
 * - 'fixStates': Normalize territory state names
 * - 'formatCalibri': Calibri 10 & middle vertical alignment
 * - 'formatDates': Format Column H dates
 * - 'updateSums': Refresh month section sums and grand totals
 * - 'createMonth': Clone and rollover new month tab
 * - 'toggleLock': Lock/Unlock month tab
 */
export async function executeSheetAutomation(action, params = {}) {
  const payload = {
    action: action,
    automationAction: action,
    ...params
  };

  // 1. Google Apps Script Web App environment (Production runtime)
  if (typeof window !== 'undefined' && window.google && window.google.script && window.google.script.run) {
    return new Promise((resolve) => {
      const runner = window.google.script.run
        .withSuccessHandler((res) => {
          resolve(res || { success: true, message: 'Automation executed successfully!' });
        })
        .withFailureHandler((err) => {
          resolve({
            success: false,
            message: (err && err.message) || String(err)
          });
        });

      const sId = params.spreadsheetId || params.targetSpreadsheetId;

      try {
        if (action === 'combineMaster' && typeof runner.combineDataToMaster === 'function') {
          runner.combineDataToMaster(sId);
        } else if ((action === 'fixStates' || action === 'correctStates') && typeof runner.correctMasterTabStates === 'function') {
          runner.correctMasterTabStates(sId);
        } else if ((action === 'formatCalibri' || action === 'applyFormatting') && typeof runner.applyCalibriFormattingToAllSheets === 'function') {
          runner.applyCalibriFormattingToAllSheets(sId);
        } else if (action === 'formatDates' && typeof runner.formatMasterTabColHDates === 'function') {
          runner.formatMasterTabColHDates(sId);
        } else if (action === 'updateSums' && typeof runner.updateStateSumsForSpreadsheet === 'function') {
          runner.updateStateSumsForSpreadsheet(sId);
        } else if (action === 'createMonth' && typeof runner.createNewMonthSheet === 'function') {
          runner.createNewMonthSheet(payload);
        } else if (action === 'toggleLock' && typeof runner.toggleMonthSheetLock === 'function') {
          runner.toggleMonthSheetLock(payload);
        } else if (action === 'runFullAutomation' && typeof runner.runFullSheetAutomation === 'function') {
          runner.runFullSheetAutomation(sId);
        } else if (typeof runner.runAutomationAction === 'function') {
          runner.runAutomationAction(payload);
        } else {
          runner.combineDataToMaster(sId);
        }
      } catch (e) {
        if (typeof runner.runAutomationAction === 'function') {
          runner.runAutomationAction(payload);
        } else {
          resolve({ success: false, message: e.message });
        }
      }
    });
  }

  // 2. Direct HTTP REST API call (when running in Vite dev server or standalone preview)
  const config = getStoredConfig();
  if (config.appsScriptUrl) {
    try {
      const res = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data || { success: true, message: 'Executed via cloud endpoint.' };
    } catch (err) {
      console.warn('REST automation call notice (CORS/Standalone):', err);
    }
  }

  // 3. Resilient simulated response for standalone Vite development preview
  // Gives visible rotating feedback while simulating cloud sheet operations
  await new Promise((r) => setTimeout(r, 2200));
  const sheetName = params.spreadsheetId === '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w'
    ? 'Bhawna TA Master'
    : 'Bharti TA Master';

  return {
    success: true,
    isSimulated: true,
    count: 31,
    message: `[Preview Mode] Simulated ${action} for ${sheetName}. Real automation executes directly inside deployed Google Apps Script.`
  };
}
