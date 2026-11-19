import React, { useState } from 'react';
import { 
  Save, 
  ExternalLink, 
  RefreshCw, 
  Database, 
  Cloud, 
  ShieldCheck, 
  Users, 
  FileSpreadsheet, 
  FilePlus, 
  Table, 
  BarChart3, 
  Edit3, 
  Trash2, 
  Download, 
  Printer, 
  CheckCircle2, 
  XCircle,
  ToggleLeft,
  ToggleRight,
  Sliders,
  Check,
  UserCheck,
  Building2,
  Image,
  Upload,
  RotateCcw,
  Copy,
  Key,
  Server
} from 'lucide-react';
import { 
  saveStoredConfig, 
  getStoredPermissions, 
  saveStoredPermissions, 
  DEFAULT_PERMISSIONS,
  getStoredBranding,
  saveStoredBranding,
  DEFAULT_BRANDING,
  uploadBrandingToBackend,
  testSupabaseConnection
} from '../services/storage';

function ToggleSwitch({ checked, onChange, label, description, icon: Icon, color = '#16a34a' }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: '10px',
        backgroundColor: checked ? '#f0fdf4' : '#f8fafc',
        border: checked ? '1.5px solid #86efac' : '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {Icon && (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: checked ? '#dcfce7' : '#f1f5f9',
            color: checked ? color : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Icon size={18} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: checked ? '#14532d' : '#1e293b' }}>
            {label}
          </div>
          {description && (
            <div style={{ fontSize: '0.74rem', color: checked ? '#166534' : '#64748b', marginTop: '2px' }}>
              {description}
            </div>
          )}
        </div>
      </div>
      
      {/* Visual Switch Control */}
      <div style={{
        width: '48px',
        height: '26px',
        borderRadius: '13px',
        background: checked ? '#16a34a' : '#cbd5e1',
        position: 'relative',
        transition: 'background-color 0.2s ease',
        flexShrink: 0,
        marginLeft: '12px'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: '#ffffff',
          position: 'absolute',
          top: '3px',
          left: checked ? '25px' : '3px',
          transition: 'left 0.2s ease',
          boxShadow: '0 2px 5px rgba(0,0,0,0.25)'
        }} />
      </div>
    </div>
  );
}

export default function Settings({ 
  config, 
  setConfig, 
  claims = [], 
  staffList = [], 
  showToast, 
  user,
  permissions: propPermissions,
  setPermissions: propSetPermissions,
  branding: propBranding,
  onUpdateBranding
}) {
  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase().includes('admin') || user?.email?.toLowerCase().includes('mis@');
  const isBhawna = user?.email === 'marketing@doctorsoap.com' || user?.id === 'bhawna' || String(user?.name || '').toLowerCase().includes('bhawna');
  const isBharti = !isAdmin && !isBhawna;
  const loggedInUserKey = isBhawna ? 'bhawna' : (isBharti ? 'bharti' : null);

  // Permissions state
  const [permissions, setLocalPermissions] = useState(() => {
    return propPermissions || getStoredPermissions();
  });

  const loggedInUserPerms = loggedInUserKey ? permissions[loggedInUserKey] : null;
  const canManageBranding = isAdmin || Boolean(loggedInUserPerms?.features?.manageBranding);
  const canManageSupabase = isAdmin || Boolean(loggedInUserPerms?.features?.manageSupabase);

  const [activeTab, setActiveTab] = useState(() => {
    if (!isAdmin && canManageBranding) return 'branding';
    if (!isAdmin && canManageSupabase) return 'supabase';
    return 'permissions'; // 'permissions' | 'branding' | 'supabase' | 'cloud' | 'data'
  });
  const [selectedUserKey, setSelectedUserKey] = useState('bharti'); // 'bharti' | 'bhawna'

  // Branding state
  const [brandingForm, setBrandingForm] = useState(() => {
    return propBranding || getStoredBranding();
  });

  const [formData, setFormData] = useState({
    ...config,
    spreadsheetIds: Array.isArray(config.spreadsheetIds)
      ? config.spreadsheetIds
      : [config.spreadsheetId || '', config.secondarySpreadsheetId || ''],
    supabaseEnabled: Boolean(config.supabaseEnabled),
    supabaseUrl: config.supabaseUrl || '',
    supabaseAnonKey: config.supabaseAnonKey || '',
    supabaseTableName: config.supabaseTableName || 'ta_claims',
    supabaseSyncMode: config.supabaseSyncMode || 'dual'
  });
  const [testing, setTesting] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState(null);

  // Toggle permission handler for a user
  const handleToggle = (userKey, category, featureName) => {
    const updated = {
      ...permissions,
      [userKey]: {
        ...permissions[userKey],
        ...(category === 'direct' ? { [featureName]: !permissions[userKey][featureName] } : {}),
        ...(category === 'pages' ? {
          pages: {
            ...permissions[userKey].pages,
            [featureName]: !permissions[userKey].pages[featureName]
          }
        } : {}),
        ...(category === 'features' ? {
          features: {
            ...permissions[userKey].features,
            [featureName]: !permissions[userKey].features[featureName]
          }
        } : {})
      }
    };

    // Keep direct openSheetLink and features.openSheetLink synchronized
    if (featureName === 'openSheetLink') {
      const newVal = category === 'direct' 
        ? updated[userKey].openSheetLink 
        : updated[userKey].features.openSheetLink;
      updated[userKey].openSheetLink = newVal;
      updated[userKey].features.openSheetLink = newVal;
    }

    setLocalPermissions(updated);
    if (propSetPermissions) {
      propSetPermissions(updated);
    }
    saveStoredPermissions(updated);
  };

  // Quick Action: Enable or Disable all permissions for selected user
  const handleBatchToggle = (userKey, enable) => {
    const updated = {
      ...permissions,
      [userKey]: {
        ...permissions[userKey],
        openSheetLink: enable,
        pages: {
          submit: enable,
          claims: enable,
          analytics: enable,
          directory: enable
        },
        features: {
          openSheetLink: enable,
          editClaim: enable,
          deleteClaim: enable,
          exportData: enable,
          downloadVoucher: enable,
          manageBranding: enable
        }
      }
    };

    setLocalPermissions(updated);
    if (propSetPermissions) {
      propSetPermissions(updated);
    }
    saveStoredPermissions(updated);
    showToast(`${enable ? 'Enabled' : 'Disabled'} all permissions for ${permissions[userKey]?.name || userKey}!`, 'success');
  };

  // Branding state & handlers
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP).', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo file size exceeds 2MB. Please select a smaller image.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result;
      if (base64Url) {
        setBrandingForm(prev => ({ 
          ...prev, 
          logoUrl: base64Url,
          fileName: file.name,
          mimeType: file.type
        }));
        showToast('Logo loaded! Click "Save & Upload to Google Drive" to store it permanently.', 'info');
      }
    };
    reader.onerror = () => {
      showToast('Failed to read image file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canManageBranding) {
      showToast('You do not have permission to manage company branding.', 'error');
      return;
    }

    setIsUploadingToDrive(true);
    try {
      const companyName = (brandingForm.companyName || '').trim() || DEFAULT_BRANDING.companyName;
      const companySubtitle = (brandingForm.companySubtitle || '').trim() || DEFAULT_BRANDING.companySubtitle;
      const base64Data = brandingForm.logoUrl || '';

      // Upload to Google Drive backend automatically
      let driveResult = null;
      if (base64Data) {
        driveResult = await uploadBrandingToBackend({
          companyName: companyName,
          companySubtitle: companySubtitle,
          base64Data: base64Data,
          fileName: brandingForm.fileName || 'company_logo.png',
          mimeType: brandingForm.mimeType || 'image/png',
          logoUrl: base64Data
        });
      }

      const finalLogoUrl = (driveResult && driveResult.driveUrl) ? driveResult.driveUrl : base64Data;
      const updated = {
        companyName: companyName,
        companySubtitle: companySubtitle,
        logoUrl: finalLogoUrl,
        driveUrl: driveResult?.driveUrl || '',
        fileId: driveResult?.fileId || '',
        fileViewUrl: driveResult?.fileViewUrl || ''
      };

      setBrandingForm(updated);
      saveStoredBranding(updated);
      if (onUpdateBranding) {
        onUpdateBranding(updated);
      }

      if (driveResult && driveResult.fileId) {
        showToast('Company logo automatically uploaded to Google Drive folder "TA_Portal_Assets" & saved!', 'success');
      } else {
        showToast('Company branding and logo updated successfully across the portal!', 'success');
      }
    } catch (err) {
      console.warn('Drive upload error:', err);
      const fallback = {
        companyName: (brandingForm.companyName || '').trim() || DEFAULT_BRANDING.companyName,
        companySubtitle: (brandingForm.companySubtitle || '').trim() || DEFAULT_BRANDING.companySubtitle,
        logoUrl: brandingForm.logoUrl || ''
      };
      setBrandingForm(fallback);
      saveStoredBranding(fallback);
      if (onUpdateBranding) onUpdateBranding(fallback);
      showToast('Branding saved locally in portal.', 'info');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleResetBranding = () => {
    setBrandingForm(DEFAULT_BRANDING);
    saveStoredBranding(DEFAULT_BRANDING);
    if (onUpdateBranding) {
      onUpdateBranding(DEFAULT_BRANDING);
    }
    showToast('Branding reset to default settings.', 'info');
  };

  const handleSavePermissions = () => {
    saveStoredPermissions(permissions);
    if (propSetPermissions) {
      propSetPermissions(permissions);
    }
    showToast('User permissions successfully saved and updated!', 'success');
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only the admin can update cloud settings.', 'error');
      return;
    }

    const cleanedIds = [formData.spreadsheetIds?.[0] || '', formData.spreadsheetIds?.[1] || ''];
    const saveData = {
      ...formData,
      spreadsheetId: cleanedIds[0],
      secondarySpreadsheetId: cleanedIds[1],
      spreadsheetIds: cleanedIds.filter(Boolean)
    };

    saveStoredConfig(saveData);
    setConfig(saveData);
    showToast('Configuration settings updated successfully!', 'success');
  };

  const handleSaveSupabaseConfig = (e) => {
    e.preventDefault();
    if (!isAdmin && !canManageSupabase) {
      showToast('You do not have permission to manage Supabase database settings.', 'error');
      return;
    }

    const saveData = {
      ...formData,
      supabaseEnabled: Boolean(formData.supabaseEnabled),
      supabaseUrl: (formData.supabaseUrl || '').trim(),
      supabaseAnonKey: (formData.supabaseAnonKey || '').trim(),
      supabaseTableName: (formData.supabaseTableName || 'ta_claims').trim(),
      supabaseSyncMode: formData.supabaseSyncMode || 'dual'
    };

    saveStoredConfig(saveData);
    setConfig(saveData);
    showToast('Supabase cloud database configuration saved successfully!', 'success');
  };

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSupabaseTestStatus(null);
    try {
      if (!formData.supabaseUrl || !formData.supabaseAnonKey) {
        showToast('Please enter both Supabase Project URL and Anon API Key.', 'error');
        setSupabaseTestStatus({
          success: false,
          message: 'Missing Project URL or Anon Key. Please fill in both fields.'
        });
        return;
      }

      await testSupabaseConnection(formData);
      setSupabaseTestStatus({
        success: true,
        message: `Connected successfully! Supabase table "${formData.supabaseTableName || 'ta_claims'}" is reachable & ready.`
      });
      showToast('Supabase PostgreSQL connection verified successfully!', 'success');
    } catch (err) {
      setSupabaseTestStatus({
        success: false,
        message: `Connection failed: ${err.message}`
      });
      showToast(`Supabase connection notice: ${err.message}`, 'error');
    } finally {
      setTestingSupabase(false);
    }
  };

  const SUPABASE_SQL_SCHEMA = `-- =======================================================
-- 1. Create TA Claims Table in Supabase PostgreSQL
-- =======================================================
CREATE TABLE IF NOT EXISTS ta_claims (
  id TEXT PRIMARY KEY,
  s_no INT,
  emp_code TEXT NOT NULL,
  sales_person_name TEXT NOT NULL,
  state TEXT NOT NULL,
  ta_bill NUMERIC(12, 2) NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  full_and_final TEXT DEFAULT 'No',
  submission_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source_sheet TEXT
);

-- 2. Fast query indexes for filtering
CREATE INDEX IF NOT EXISTS idx_ta_claims_month ON ta_claims(month);
CREATE INDEX IF NOT EXISTS idx_ta_claims_state ON ta_claims(state);
CREATE INDEX IF NOT EXISTS idx_ta_claims_emp ON ta_claims(emp_code);

-- 3. Row Level Security (RLS) - Allows web app access
ALTER TABLE ta_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read and write for TA Portal" 
  ON ta_claims 
  FOR ALL 
  USING (true);`;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    showToast('Copied Supabase SQL schema to clipboard! Paste it into Supabase SQL Editor.', 'success');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      if (!formData.appsScriptUrl) {
        showToast('Please provide an Apps Script Web App URL first.', 'error');
        return;
      }

      if (!isAdmin) {
        showToast('Only the admin can test cloud settings.', 'error');
        return;
      }

      const res = await fetch(`${formData.appsScriptUrl}?action=getDirectory`);
      const json = await res.json();
      if (json && json.success) {
        showToast('Connection verified! Google Apps Script returned active staff directory.', 'success');
      } else {
        showToast('Connected, but endpoint returned non-standard response.', 'info');
      }
    } catch (err) {
      showToast(`Connection notice: ${err.message || 'CORS prevented direct client GET; standard submissions via no-cors will still work.'}`, 'info');
    } finally {
      setTesting(false);
    }
  };

  const handleExportJSON = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      config: formData,
      permissions: permissions,
      staff: staffList,
      claims: claims
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TA_DA_Portal_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Database backup downloaded as JSON!', 'success');
  };

  if (!isAdmin && !canManageBranding && !canManageSupabase) {
    return (
      <div className="card-panel" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <h3 className="panel-title" style={{ fontSize: '1.25rem', color: '#b91c1c' }}>Access Restricted</h3>
        <p className="panel-subtitle" style={{ marginTop: '8px' }}>You do not have permission to access system administration settings.</p>
      </div>
    );
  }

  const currentUserPerms = permissions[selectedUserKey] || DEFAULT_PERMISSIONS[selectedUserKey];
  const isOpenSheetActive = Boolean(currentUserPerms?.openSheetLink ?? currentUserPerms?.features?.openSheetLink ?? true);

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Top Section Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          {isAdmin ? 'System Administration & Settings' : canManageBranding ? 'Company Branding & Logo' : 'Supabase Cloud Database'}
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
          {isAdmin 
            ? 'Manage user permissions, company logo, Supabase database, cloud endpoints, and backups.'
            : 'Customize company branding or configure Supabase cloud database integration.'}
        </p>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        overflowX: 'auto'
      }}>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              color: activeTab === 'permissions' ? '#1d4ed8' : '#64748b',
              borderBottom: activeTab === 'permissions' ? '3px solid #1d4ed8' : '3px solid transparent',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <ShieldCheck size={18} />
            <span>User Permissions</span>
          </button>
        )}

        {canManageBranding && (
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              color: activeTab === 'branding' ? '#1d4ed8' : '#64748b',
              borderBottom: activeTab === 'branding' ? '3px solid #1d4ed8' : '3px solid transparent',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Building2 size={18} />
            <span>Company Branding & Logo</span>
          </button>
        )}

        {canManageSupabase && (
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              color: activeTab === 'supabase' ? '#1d4ed8' : '#64748b',
              borderBottom: activeTab === 'supabase' ? '3px solid #1d4ed8' : '3px solid transparent',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Database size={18} />
            <span>⚡ Supabase Database</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              color: activeTab === 'cloud' ? '#1d4ed8' : '#64748b',
              borderBottom: activeTab === 'cloud' ? '3px solid #1d4ed8' : '3px solid transparent',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Cloud size={18} />
            <span>Google Cloud & Apps Script</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              color: activeTab === 'data' ? '#1d4ed8' : '#64748b',
              borderBottom: activeTab === 'data' ? '3px solid #1d4ed8' : '3px solid transparent',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Database size={18} />
            <span>Data Storage & Backup</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          TAB 1: USER PERMISSIONS & ACCESS CONTROL
          ========================================================================= */}
      {activeTab === 'permissions' && (
        <div>
          {/* User Selection Header Bar */}
          <div className="card-panel" style={{ marginBottom: '20px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#64748b' }}>
                  Select User Account to Configure
                </div>
                <div style={{ fontSize: '0.92rem', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                  Configure what Bharti and Bhawna can see, access, and execute in the web app
                </div>
              </div>

              {/* User Switcher Pill Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedUserKey('bharti')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: selectedUserKey === 'bharti' ? '#eff6ff' : '#f8fafc',
                    border: selectedUserKey === 'bharti' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    color: selectedUserKey === 'bharti' ? '#1d4ed8' : '#475569',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedUserKey === 'bharti' ? '0 2px 8px rgba(37,99,235,0.18)' : 'none'
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: selectedUserKey === 'bharti' ? '#2563eb' : '#94a3b8'
                  }} />
                  <span>Bharti (DB-1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedUserKey('bhawna')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: selectedUserKey === 'bhawna' ? '#eff6ff' : '#f8fafc',
                    border: selectedUserKey === 'bhawna' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    color: selectedUserKey === 'bhawna' ? '#1d4ed8' : '#475569',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedUserKey === 'bhawna' ? '0 2px 8px rgba(37,99,235,0.18)' : 'none'
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: selectedUserKey === 'bhawna' ? '#2563eb' : '#94a3b8'
                  }} />
                  <span>Bhawna (DB-2)</span>
                </button>
              </div>
            </div>
          </div>

          {/* User Profile Overview Card */}
          <div className="card-panel" style={{ marginBottom: '20px', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 800
                }}>
                  {currentUserPerms?.name?.[0] || 'U'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {currentUserPerms?.name}
                    </h3>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe'
                    }}>
                      {currentUserPerms?.linkName || (selectedUserKey === 'bharti' ? 'Link-1' : 'Link-2')}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#f0fdf4',
                      color: '#166534',
                      border: '1px solid #bbf7d0'
                    }}>
                      Active
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                    Account: <strong>{currentUserPerms?.name}</strong> • Role: <strong>{currentUserPerms?.role}</strong>
                  </div>
                </div>
              </div>

              {/* Quick Batch Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleBatchToggle(selectedUserKey, true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Check size={14} />
                  <span>Enable All</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchToggle(selectedUserKey, false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <XCircle size={14} />
                  <span>Disable All</span>
                </button>
              </div>
            </div>
          </div>

          {/* PRIMARY TOGGLE: OPEN SHEET LINK (AS PER USER REQUEST & SCREENSHOT) */}
          <div className="card-panel" style={{
            marginBottom: '20px',
            border: isOpenSheetActive ? '2px solid #2563eb' : '2px dashed #94a3b8',
            backgroundColor: isOpenSheetActive ? '#eff6ff' : '#f8fafc',
            boxShadow: isOpenSheetActive ? '0 4px 14px rgba(37,99,235,0.12)' : 'none',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '650px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: isOpenSheetActive ? '#2563eb' : '#cbd5e1',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: isOpenSheetActive ? '#1e3a8a' : '#1e293b' }}>
                      Open Google Sheet Database Link ({selectedUserKey === 'bharti' ? 'DB-1' : 'DB-2'})
                    </h3>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: isOpenSheetActive ? '#16a34a' : '#64748b',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {isOpenSheetActive ? 'VISIBLE (ON)' : 'HIDDEN (OFF)'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: isOpenSheetActive ? '#1e40af' : '#64748b', lineHeight: 1.45 }}>
                    Controls whether <strong>{currentUserPerms?.name}</strong> can see and click the <strong>"DB"</strong> Google Sheet database button in the top navigation bar. When turned <strong>OFF</strong>, the button is completely hidden from their header.
                  </p>
                </div>
              </div>

              {/* Big Interactive Toggle Switch */}
              <div 
                onClick={() => handleToggle(selectedUserKey, 'direct', 'openSheetLink')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  backgroundColor: isOpenSheetActive ? '#dbeafe' : '#e2e8f0',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isOpenSheetActive ? '#1e40af' : '#475569' }}>
                  {isOpenSheetActive ? 'Allow Sheet Link' : 'Block Sheet Link'}
                </span>
                <div style={{
                  width: '52px',
                  height: '28px',
                  borderRadius: '14px',
                  background: isOpenSheetActive ? '#2563eb' : '#94a3b8',
                  position: 'relative',
                  transition: 'background-color 0.2s ease',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    position: 'absolute',
                    top: '3px',
                    left: isOpenSheetActive ? '27px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Page Access Permission Grid */}
          <div className="card-panel" style={{ marginBottom: '20px' }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="panel-title" style={{ fontSize: '1.05rem' }}>Page Navigation Permissions</h3>
                <p className="panel-subtitle">Select which pages and views {currentUserPerms?.name} is allowed to access</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px' }}>
              <ToggleSwitch
                checked={Boolean(currentUserPerms?.pages?.submit ?? true)}
                onChange={() => handleToggle(selectedUserKey, 'pages', 'submit')}
                label="Submit TA Claim Form"
                description="Allow submitting new traveling allowance expense vouchers"
                icon={FilePlus}
              />

              <ToggleSwitch
                checked={Boolean(currentUserPerms?.pages?.claims ?? true)}
                onChange={() => handleToggle(selectedUserKey, 'pages', 'claims')}
                label="Claims Explorer & Audit Grid"
                description="Allow viewing and searching submitted claims table"
                icon={Table}
              />

              <ToggleSwitch
                checked={Boolean(currentUserPerms?.pages?.analytics ?? true)}
                onChange={() => handleToggle(selectedUserKey, 'pages', 'analytics')}
                label="Executive Analytics & Costing"
                description="Allow viewing analytical dashboards and statewise costing charts"
                icon={BarChart3}
              />

              <ToggleSwitch
                checked={Boolean(currentUserPerms?.pages?.directory ?? true)}
                onChange={() => handleToggle(selectedUserKey, 'pages', 'directory')}
                label="Staff & Territories Directory"
                description="Allow viewing sales officers and territory allocations"
                icon={Users}
              />
            </div>
          </div>

          {/* Functional Actions & Features Permission Grid */}
          <div className="card-panel" style={{ marginBottom: '20px' }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="panel-title" style={{ fontSize: '1.05rem' }}>Functionality & Data Actions</h3>
                <p className="panel-subtitle">Enable or disable specific user capabilities within allowed pages</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px' }}>
              <ToggleSwitch
                checked={Boolean(currentUserPerms?.features?.editClaim ?? true)}
                onChange={() => handleToggle(selectedUserKey, 'features', 'editClaim')}
                label="Edit / Update Claims"
                description="Allow updating amount, month, and remarks for submitted records"
                icon={Edit3}
              />

              <ToggleSwitch
                checked={Boolean(currentUserPerms?.features?.deleteClaim ?? false)}
                onChange={() => handleToggle(selectedUserKey, 'features', 'deleteClaim')}
                label="Delete Claims"
                description="Allow deleting TA claim records from the system"
                icon={Trash2}
                color="#dc2626"
              />

              <ToggleSwitch
                checked={Boolean(currentUserPerms?.features?.exportData ?? true)}
                onChange={() => handleToggle(selectedUserKey, 'features', 'exportData')}
                label="Export Data (CSV / Excel)"
                description="Allow downloading table data as CSV or Excel spreadsheets"
                icon={Download}
              />

              <ToggleSwitch
                checked={Boolean(currentUserPerms?.features?.downloadVoucher ?? true)}
                onChange={() => handleToggle(selectedUserKey, 'features', 'downloadVoucher')}
                label="View & Print Expense Voucher"
                description="Allow opening and printing official TA expense receipts"
                icon={Printer}
              />

              <ToggleSwitch
                checked={Boolean(currentUserPerms?.features?.manageBranding ?? false)}
                onChange={() => handleToggle(selectedUserKey, 'features', 'manageBranding')}
                label="Customize Company Logo & Name"
                description="Allow uploading company logo to Google Drive and updating portal branding"
                icon={Building2}
                color="#2563eb"
              />

              <ToggleSwitch
                checked={Boolean(currentUserPerms?.features?.manageSupabase ?? false)}
                onChange={() => handleToggle(selectedUserKey, 'features', 'manageSupabase')}
                label="Manage Supabase Database Setup"
                description="Allow user to configure Supabase URL, API keys, and cloud database sync"
                icon={Database}
                color="#2563eb"
              />
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Changes take effect immediately across all active browser sessions.
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={handleSavePermissions}
              style={{
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Save size={16} />
              <span>Save All Permissions</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: COMPANY BRANDING & LOGO (AUTOMATIC GOOGLE DRIVE UPLOAD)
          ========================================================================= */}
      {activeTab === 'branding' && canManageBranding && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Panel */}
          <div className="card-panel" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1.5px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1d4ed8',
                flexShrink: 0
              }}>
                <Building2 size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Company Branding & Automatic Drive Upload
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                  Upload your official company logo and set your organization name. Uploaded logos are automatically stored in Google Drive (folder <strong>TA_Portal_Assets</strong>) and synced across the Sidebar, Login page, and Registration page.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Form Column */}
            <div className="card-panel">
              <div className="panel-header" style={{ marginBottom: '18px' }}>
                <div>
                  <h4 className="panel-title" style={{ fontSize: '1.02rem' }}>Brand Details & Logo File</h4>
                  <p className="panel-subtitle">Enter company identity text and choose a logo image</p>
                </div>
              </div>

              <form onSubmit={handleSaveBranding} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Company Name */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1e293b' }}>
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={brandingForm.companyName}
                    onChange={(e) => setBrandingForm({ ...brandingForm, companyName: e.target.value })}
                    placeholder="e.g. Doctor Soap / Enterprise MIS"
                    required
                  />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Replaces "TA-DA Portal" on the Sidebar, Login card, and Registration card.
                  </span>
                </div>

                {/* Subtitle / Tagline */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1e293b' }}>
                    Company Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={brandingForm.companySubtitle}
                    onChange={(e) => setBrandingForm({ ...brandingForm, companySubtitle: e.target.value })}
                    placeholder="e.g. Enterprise MIS / Traveling Allowance System"
                  />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Displays right below the company name.
                  </span>
                </div>

                {/* File Upload Box */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1e293b' }}>
                    Upload Company Logo (Auto-uploaded to Google Drive)
                  </label>
                  
                  <div style={{
                    border: '2px dashed #93c5fd',
                    borderRadius: '10px',
                    padding: '18px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Upload size={20} />
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1d4ed8' }}>
                          Click to browse image
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}> or drag and drop</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        PNG, JPG, WebP, or SVG (Max 2MB) • Stored automatically in Google Drive
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Image URL fallback */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1e293b' }}>
                    Or Image URL / Google Drive Direct URL
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    value={brandingForm.logoUrl}
                    onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                    placeholder="https://drive.google.com/... or https://..."
                  />
                </div>

                {/* Remove Logo Button */}
                {brandingForm.logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setBrandingForm(prev => ({ ...prev, logoUrl: '' }));
                      showToast('Logo removed from preview. Click "Save" to apply.', 'info');
                    }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      border: '1px solid #fca5a5',
                      backgroundColor: '#fef2f2',
                      color: '#b91c1c',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Remove Logo</span>
                  </button>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isUploadingToDrive}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Save size={16} />
                    <span>{isUploadingToDrive ? 'Uploading to Drive & Saving...' : 'Save & Upload to Google Drive'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleResetBranding}
                    title="Reset to default branding"
                    disabled={isUploadingToDrive}
                  >
                    <RotateCcw size={16} />
                    <span>Reset</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview Column */}
            <div className="card-panel">
              <div className="panel-header" style={{ marginBottom: '18px' }}>
                <div>
                  <h4 className="panel-title" style={{ fontSize: '1.02rem' }}>Live Portal Previews</h4>
                  <p className="panel-subtitle">Real-time preview of how users will see your company brand</p>
                </div>
              </div>

              {/* Preview 1: Sidebar Header */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  Sidebar Header Preview
                </div>
                <div style={{
                  backgroundColor: '#0a192f',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  border: '1px solid #1e293b'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: brandingForm.logoUrl ? '#ffffff' : '#2563eb',
                    border: brandingForm.logoUrl ? '2px solid #bfdbfe' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: '4px',
                    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.12)',
                    flexShrink: 0
                  }}>
                    {brandingForm.logoUrl ? (
                      <img
                        src={brandingForm.logoUrl}
                        alt="Logo Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%', transform: 'scale(1.08)' }}
                      />
                    ) : (
                      <Building2 size={24} color="#ffffff" />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#ffffff', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {brandingForm.companyName || 'TA-DA Portal'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {brandingForm.companySubtitle || 'Enterprise MIS'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview 2: Login & Register Card Header */}
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  Login & Registration Card Preview
                </div>
                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '24px 20px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <div style={{
                    width: brandingForm.logoUrl ? '64px' : '48px',
                    height: brandingForm.logoUrl ? '64px' : '48px',
                    margin: '0 auto 12px',
                    borderRadius: '50%',
                    backgroundColor: brandingForm.logoUrl ? '#ffffff' : '#1d4ed8',
                    border: brandingForm.logoUrl ? '2px solid #bfdbfe' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: brandingForm.logoUrl ? '5px' : '0',
                    boxShadow: brandingForm.logoUrl ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none'
                  }}>
                    {brandingForm.logoUrl ? (
                      <img
                        src={brandingForm.logoUrl}
                        alt="Logo Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
                      />
                    ) : (
                      <ShieldCheck size={26} color="#ffffff" />
                    )}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.12rem', color: '#111827', margin: '0 0 2px' }}>
                    {brandingForm.companyName || 'TA-DA Portal'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                    {brandingForm.companySubtitle || 'Enterprise Management Information System'}
                  </div>
                </div>
              </div>

              {/* Google Drive Status Note */}
              <div style={{
                marginTop: '20px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#166534',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Google Drive Integration Active:</strong> When you click save, your logo file is automatically stored in your Google Drive under folder <code>TA_Portal_Assets</code> with full cross-device accessibility.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: SUPABASE POSTGRESQL DATABASE SETUP & PERMISSIONS
          ========================================================================= */}
      {activeTab === 'supabase' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
            borderRadius: '16px',
            padding: '24px 28px',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.4)',
            border: '1px solid rgba(52, 211, 153, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ maxWidth: '600px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  background: '#10b981',
                  borderRadius: '10px',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}>
                  <Database size={22} color="#ffffff" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Supabase Cloud Database Integration
                </h3>
              </div>
              <p style={{ margin: 0, color: '#a7f3d0', fontSize: '0.88rem', lineHeight: 1.5 }}>
                Use free PostgreSQL cloud storage from <strong>Supabase</strong> for your personal account setup, real-time database backups, or high-speed hybrid dual-sync alongside Google Sheets.
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              borderRadius: '12px',
              padding: '10px 16px',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a7f3d0', fontWeight: 700 }}>
                Status
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: formData.supabaseEnabled ? '#34d399' : '#fcd34d', marginTop: '2px' }}>
                {formData.supabaseEnabled ? '● Active & Syncing' : '○ Disabled (Sheets Only)'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
            
            {/* Column 1: Connection Settings Form */}
            <div className="card-panel">
              <div className="panel-header" style={{ marginBottom: '18px' }}>
                <div>
                  <h4 className="panel-title" style={{ fontSize: '1.08rem' }}>Supabase Connection Parameters</h4>
                  <p className="panel-subtitle">Configure your project credentials and sync mode</p>
                </div>
              </div>

              <form onSubmit={handleSaveSupabaseConfig} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Integration Enable / Disable Switch */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, supabaseEnabled: !prev.supabaseEnabled }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: formData.supabaseEnabled ? '#ecfdf5' : '#f8fafc',
                    border: formData.supabaseEnabled ? '1.5px solid #6ee7b7' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: formData.supabaseEnabled ? '#d1fae5' : '#f1f5f9',
                      color: formData.supabaseEnabled ? '#059669' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Server size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: formData.supabaseEnabled ? '#065f46' : '#1e293b' }}>
                        Enable Supabase Integration
                      </div>
                      <div style={{ fontSize: '0.74rem', color: formData.supabaseEnabled ? '#047857' : '#64748b' }}>
                        {formData.supabaseEnabled ? 'Active: Claims will mirror to Supabase PostgreSQL' : 'Inactive: Using Google Sheets exclusively'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    width: '48px',
                    height: '26px',
                    borderRadius: '13px',
                    background: formData.supabaseEnabled ? '#10b981' : '#cbd5e1',
                    position: 'relative',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      position: 'absolute',
                      top: '3px',
                      left: formData.supabaseEnabled ? '25px' : '3px',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.25)'
                    }} />
                  </div>
                </div>

                {/* Sync Mode Selection */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>Database Sync Mode</label>
                  <select
                    className="form-select"
                    value={formData.supabaseSyncMode}
                    onChange={(e) => setFormData(prev => ({ ...prev, supabaseSyncMode: e.target.value }))}
                    disabled={!formData.supabaseEnabled}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="dual">Dual-Sync: Google Sheets + Supabase PostgreSQL (Recommended)</option>
                    <option value="supabase_only">Supabase Only: Direct PostgreSQL Cloud DB</option>
                    <option value="sheets_only">Google Sheets Only: Standard Setup</option>
                  </select>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Dual-sync saves claims in Google Sheets for accounting while simultaneously recording in Supabase.
                  </span>
                </div>

                {/* Project URL */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    value={formData.supabaseUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                    placeholder="https://yourprojectid.supabase.co"
                    disabled={!formData.supabaseEnabled}
                    style={{ fontSize: '0.84rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Find in Supabase ➔ Project Settings ➔ API ➔ Project URL
                  </span>
                </div>

                {/* Anon API Key */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.supabaseAnonKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, supabaseAnonKey: e.target.value }))}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    disabled={!formData.supabaseEnabled}
                    style={{ fontSize: '0.84rem', fontFamily: 'monospace' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Project API key (anon / public) from Project Settings ➔ API
                  </span>
                </div>

                {/* Table Name */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    Target Table Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.supabaseTableName}
                    onChange={(e) => setFormData(prev => ({ ...prev, supabaseTableName: e.target.value }))}
                    placeholder="ta_claims"
                    disabled={!formData.supabaseEnabled}
                    style={{ fontSize: '0.84rem' }}
                  />
                </div>

                {/* Connection Status Box */}
                {supabaseTestStatus && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: supabaseTestStatus.success ? '#ecfdf5' : '#fef2f2',
                    border: supabaseTestStatus.success ? '1px solid #a7f3d0' : '1px solid #fecaca',
                    color: supabaseTestStatus.success ? '#065f46' : '#991b1b',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    {supabaseTestStatus.success ? (
                      <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <div>{supabaseTestStatus.message}</div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Save size={16} />
                    <span>Save Supabase Settings</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleTestSupabase}
                    disabled={testingSupabase || !formData.supabaseUrl || !formData.supabaseAnonKey}
                    style={{ justifyContent: 'center', minWidth: '130px' }}
                  >
                    {testingSupabase ? <RefreshCw size={15} className="spin-animation" /> : <RefreshCw size={15} />}
                    <span>{testingSupabase ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Column 2: 1-Click SQL Schema & Setup Instructions */}
            <div className="card-panel">
              <div className="panel-header" style={{ marginBottom: '14px' }}>
                <div>
                  <h4 className="panel-title" style={{ fontSize: '1.08rem' }}>1-Click SQL Table Generator</h4>
                  <p className="panel-subtitle">Run this SQL in Supabase to create the claims database</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySQL}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Copy size={13} />
                  <span>Copy SQL</span>
                </button>
              </div>

              {/* Instructions steps */}
              <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, marginBottom: '14px' }}>
                <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Create a free project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>supabase.com</a>.</li>
                  <li>Click <strong>SQL Editor</strong> on the left menu.</li>
                  <li>Click <strong>Copy SQL</strong> above, paste it into the editor, and click <strong>Run</strong>.</li>
                  <li>Go to <strong>Project Settings ➔ API</strong>, copy your <strong>URL</strong> and <strong>anon key</strong>, and paste them into the form on the left.</li>
                </ol>
              </div>

              {/* SQL Code Box */}
              <div style={{
                position: 'relative',
                background: '#0f172a',
                color: '#38bdf8',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '0.74rem',
                fontFamily: 'Consolas, monospace',
                maxHeight: '290px',
                overflowY: 'auto',
                border: '1px solid #1e293b'
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#e2e8f0' }}>
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

              {/* Security note */}
              <div style={{
                marginTop: '16px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.74rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldCheck size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Security Ready:</strong> The SQL script automatically enables Row Level Security (RLS) with full support for safe public read/write access.
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: GOOGLE CLOUD & APPS SCRIPT SYNC
          ========================================================================= */}
      {activeTab === 'cloud' && (
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Google Cloud & Apps Script Sync</h3>
              <p className="panel-subtitle">Manage spreadsheet IDs and Web App execution endpoints</p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Google Sheet IDs */}
              {[0, 1].map((idx) => (
                <div className="form-group" key={idx}>
                  <label className="form-label">
                    <span>{idx === 0 ? 'Primary Google Sheet ID (Link-1 Bharti)' : 'Secondary Google Sheet ID (Link-2 Bhawna)'}</span>
                    {((formData.spreadsheetIds?.[idx]) || (idx === 0 ? formData.spreadsheetId : formData.secondarySpreadsheetId)) && (
                      <a
                        href={'https://docs.google.com/spreadsheets/d/' + ((formData.spreadsheetIds?.[idx]) || (idx === 0 ? formData.spreadsheetId : formData.secondarySpreadsheetId)) + '/edit'}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Open Sheet <ExternalLink size={12} />
                      </a>
                    )}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.spreadsheetIds?.[idx] || (idx === 0 ? formData.spreadsheetId : formData.secondarySpreadsheetId) || ''}
                    onChange={e => {
                      const updatedIds = [...(formData.spreadsheetIds || [formData.spreadsheetId || '', formData.secondarySpreadsheetId || ''])];
                      updatedIds[idx] = e.target.value.trim();
                      setFormData({ ...formData, spreadsheetIds: updatedIds });
                    }}
                    placeholder={idx === 0 ? 'Primary sheet ID' : 'Secondary sheet ID'}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    {idx === 0
                      ? 'Main spreadsheet containing primary TA bill data for Bharti.'
                      : 'Secondary spreadsheet containing TA bill data for Bhawna.'}
                  </span>
                </div>
              ))}

              {/* Apps Script Web App URL */}
              <div className="form-group">
                <label className="form-label">
                  <span>Apps Script Web App Exec URL</span>
                  <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>Deployed & Active</span>
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={formData.appsScriptUrl}
                  onChange={e => setFormData({ ...formData, appsScriptUrl: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                  Target endpoint created via <code>clasp deploy</code>. Automatically processes all claim submissions.
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  <RefreshCw size={16} className={testing ? 'pulse-circle' : ''} />
                  <span>{testing ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button type="submit" className="btn-primary">
                  <Save size={16} />
                  <span>Save Cloud Settings</span>
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DATA STORAGE & BACKUP
          ========================================================================= */}
      {activeTab === 'data' && (
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Data Storage & Export</h3>
              <p className="panel-subtitle">Export full system database or download offline backup</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Complete Database Backup</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Download all {claims.length} claims, {staffList.length} staff records, and current user permissions as a JSON backup.
              </div>
            </div>

            <button className="btn-secondary" onClick={handleExportJSON}>
              <Database size={16} />
              <span>Export JSON Backup</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
