import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Loader2, 
  ArrowRight, 
  CheckCircle2, 
  UserPlus, 
  User, 
  ArrowLeft 
} from 'lucide-react';
import { 
  getSavedCredentials, 
  saveSavedCredentials, 
  saveStoredUser, 
  authenticateWithBackend,
  registerUserWithBackend,
  getStoredBranding
} from '../services/storage';

export default function LoginPage({ onLogin, logoutAlert, onClearLogoutAlert, branding: propBranding }) {
  const currentBranding = propBranding || getStoredBranding();
  // Check if opened via Admin link (?portal=admin or ?admin=true)
  const isDirectAdminUrl = typeof window !== 'undefined' && (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = (params.get('portal') || params.get('admin') || '').toLowerCase();
      return p === 'admin' || p === 'true';
    } catch (e) {
      return false;
    }
  })();

  const [isAdminMode, setIsAdminMode] = useState(isDirectAdminUrl);
  // Flip card toggle state (false = Sign In, true = Register)
  const [isFlipped, setIsFlipped] = useState(false);

  // Sign In Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // 1. On user's own machine: load saved 30-day credentials for this computer only
  useEffect(() => {
    if (isDirectAdminUrl) {
      setIsAdminMode(true);
      setEmail('mis@doctorsoap.com');
      setPassword('admin123');
    } else {
      const saved = getSavedCredentials();
      if (saved && saved.email) {
        setEmail(saved.email);
        if (saved.password) {
          setPassword(saved.password);
        }
      }
    }
  }, [isDirectAdminUrl]);

  // Autofill helpers for Admin (fills email only to protect user password privacy)
  const autofillBharti = () => {
    setEmail('salescoordinator1@doctorsoap.com');
    setPassword('');
  };

  const autofillBhawna = () => {
    setEmail('marketing@doctorsoap.com');
    setPassword('');
  };

  const autofillAdmin = () => {
    setEmail('mis@doctorsoap.com');
    setPassword('admin123');
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    const lower = val.toLowerCase().trim();
    if (lower === 'mis@doctorsoap.com' || lower.includes('mis@') || lower.includes('admin')) {
      setIsAdminMode(true);
    }
  };

  const lowerEmail = email.toLowerCase().trim();
  const isBhartiDetected = lowerEmail.includes('bharti') || lowerEmail.includes('salescoordinator1');
  const isBhawnaDetected = lowerEmail.includes('bhawna') || lowerEmail.includes('marketing');
  const detectedUser = isBhartiDetected ? 'Bharti' : isBhawnaDetected ? 'Bhawna' : null;

  // Sign In Handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoginSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both your work email and password.');
      return;
    }

    setLoading(true);

    try {
      const result = await authenticateWithBackend({
        email: email.trim(),
        password: password.trim()
      });

      if (!result.success || !result.user) {
        setError(result.error || result.message || 'Invalid email or password. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Save user session and credentials on this system
      saveStoredUser(result.user, rememberMe);
      saveSavedCredentials(email.trim(), password.trim(), rememberMe);

      setLoading(false);
      if (typeof onLogin === 'function') {
        onLogin(result.user);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('An error occurred during authentication. Please try again.');
      setLoading(false);
    }
  };

  // Register New User Handler
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');

    const cleanEmail = regEmail.trim();
    const cleanPassword = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();
    const cleanName = regName.trim();

    if (!cleanEmail) {
      setRegError('Please provide a valid work email.');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 3) {
      setRegError('Password must be at least 3 characters long.');
      return;
    }
    if (cleanPassword !== cleanConfirm) {
      setRegError('Passwords do not match. Please verify and re-enter.');
      return;
    }

    setRegLoading(true);

    try {
      const result = await registerUserWithBackend({
        name: cleanName || cleanEmail.split('@')[0],
        email: cleanEmail,
        password: cleanPassword
      });

      if (!result || !result.success) {
        setRegError(result?.message || 'Registration failed. Please check your details.');
        setRegLoading(false);
        return;
      }

      // Success! Auto-fill newly registered email on login form and flip back
      setRegLoading(false);
      setEmail(cleanEmail);
      setPassword('');
      setLoginSuccessMsg(`🎉 Account registered for ${cleanEmail}! Please enter your password to sign in.`);
      setError('');
      
      // Clear register passwords
      setRegPassword('');
      setRegConfirmPassword('');

      // Flip smoothly back to Login card
      setIsFlipped(false);
    } catch (err) {
      console.error('Registration error:', err);
      setRegError('Registration failed: ' + (err.message || String(err)));
      setRegLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      padding: '24px',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    }}>
      {/* 3D Flip Card Container */}
      <div style={{
        perspective: '1200px',
        width: '100%',
        maxWidth: '440px',
        position: 'relative'
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          transition: 'transform 0.65s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}>

          {/* ============================================================ */}
          {/* FRONT FACE: SIGN IN                                          */}
          {/* ============================================================ */}
          <div style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            padding: '36px 32px',
            border: '1px solid #d1d5db',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
            position: isFlipped ? 'absolute' : 'relative',
            top: 0,
            left: 0,
            overflow: 'hidden'
          }}>
            {/* Subtle top accent bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              backgroundColor: '#1d4ed8'
            }} />

            {/* Brand Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: currentBranding?.logoUrl ? '68px' : '52px',
                height: currentBranding?.logoUrl ? '68px' : '52px',
                margin: '0 auto 14px',
                borderRadius: '50%',
                backgroundColor: currentBranding?.logoUrl ? '#ffffff' : '#1d4ed8',
                border: currentBranding?.logoUrl ? '2px solid #bfdbfe' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                overflow: 'hidden',
                padding: currentBranding?.logoUrl ? '6px' : '0',
                boxShadow: currentBranding?.logoUrl ? '0 4px 14px rgba(0, 0, 0, 0.08)' : 'none'
              }}>
                {currentBranding?.logoUrl ? (
                  <img 
                    src={currentBranding.logoUrl} 
                    alt={currentBranding.companyName || 'Company Logo'} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} 
                  />
                ) : (
                  <ShieldCheck size={28} strokeWidth={2.2} />
                )}
              </div>
              <h2 style={{
                margin: '0 0 4px',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.01em'
              }}>
                {currentBranding?.companyName || 'TA-DA Portal'}
              </h2>
              <p style={{
                margin: 0,
                color: '#4b5563',
                fontSize: '0.84rem',
                fontWeight: 500
              }}>
                {currentBranding?.companySubtitle || 'Enterprise Management Information System'}
              </p>
            </div>

            {/* Logout Alert Notification Banner */}
            {logoutAlert && (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid #86efac',
                color: '#166534',
                padding: '14px 16px',
                borderRadius: '6px',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                boxShadow: '0 4px 12px rgba(22, 101, 52, 0.08)'
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0
                }}>
                  <CheckCircle2 size={16} strokeWidth={2.4} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#14532d' }}>Logged Out Successfully</div>
                  <div style={{ fontSize: '0.82rem', color: '#166534', marginTop: '2px' }}>{logoutAlert}</div>
                </div>
                {onClearLogoutAlert && (
                  <button
                    type="button"
                    onClick={onClearLogoutAlert}
                    title="Dismiss alert"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#15803d',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      lineHeight: 1,
                      padding: '4px 6px',
                      fontWeight: 700
                    }}
                  >
                    &times;
                  </button>
                )}
              </div>
            )}

            {/* Registration Success Notification Banner */}
            {loginSuccessMsg && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#166534',
                padding: '12px 14px',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px'
              }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span style={{ flex: 1 }}>{loginSuccessMsg}</span>
                <button
                  type="button"
                  onClick={() => setLoginSuccessMsg('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#166534',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    padding: '2px'
                  }}
                >
                  &times;
                </button>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Email Field */}
              <div>
                <label htmlFor="loginEmail" style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#334155',
                  marginBottom: '8px'
                }}>
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    <Mail size={18} />
                  </div>
                  <input
                    id="loginEmail"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="name@company.com"
                    required
                    disabled={loading}
                    autoComplete="email"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#1e293b'
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="loginPassword" style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#334155',
                  marginBottom: '8px'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    <Lock size={18} />
                  </div>
                  <input
                    id="loginPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '11px 42px 11px 42px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#1e293b'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* 30-Day Auto-Save Checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 0'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                  color: '#374151',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#1d4ed8',
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>Remember login for <strong>30 days</strong></span>
                </label>
              </div>

              {/* Error Banner */}
              {error && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s ease',
                  marginTop: '4px',
                  opacity: loading ? 0.75 : 1
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* DETECTED USER NAME DISPLAYED IN CENTER */}
            {detectedUser && !isAdminMode && (
              <div style={{
                marginTop: '18px',
                textAlign: 'center',
                animation: 'fadeIn 0.25s ease'
              }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px'
                }}>
                  Quick Account Select
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#eff6ff',
                      border: '1.5px solid #1d4ed8',
                      color: '#1d4ed8',
                      padding: '8px 34px',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'default',
                      boxShadow: '0 1px 3px rgba(29, 78, 216, 0.08)'
                    }}
                  >
                    {detectedUser}
                  </button>
                </div>
              </div>
            )}

            {/* FLIP CARD TRIGGER: REGISTER FOR NEW USERS */}
            <div style={{
              marginTop: '18px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.86rem',
              color: '#475569'
            }}>
              <span>New user?</span>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setRegError('');
                  setIsFlipped(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '0.86rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'underline'
                }}
              >
                <UserPlus size={15} />
                <span>Register new user ➔</span>
              </button>
            </div>

            {/* ADMIN-ONLY AUTOFILL SECTION (Completely hidden from regular users) */}
            {isAdminMode && (
              <div style={{
                marginTop: '18px',
                padding: '14px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    👑 Admin Autofill (Both Users)
                  </span>
                  <span style={{
                    fontSize: '0.66rem',
                    color: '#16a34a',
                    fontWeight: 700,
                    backgroundColor: '#dcfce7',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    Admin Active
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={autofillAdmin}
                    style={{
                      flex: 1,
                      backgroundColor: email === 'mis@doctorsoap.com' ? '#eff6ff' : '#ffffff',
                      border: email === 'mis@doctorsoap.com' ? '1.5px solid #1d4ed8' : '1px solid #cbd5e1',
                      color: email === 'mis@doctorsoap.com' ? '#1d4ed8' : '#334155',
                      padding: '7px 8px',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={autofillBharti}
                    style={{
                      flex: 1,
                      backgroundColor: email === 'salescoordinator1@doctorsoap.com' ? '#eff6ff' : '#ffffff',
                      border: email === 'salescoordinator1@doctorsoap.com' ? '1.5px solid #1d4ed8' : '1px solid #cbd5e1',
                      color: email === 'salescoordinator1@doctorsoap.com' ? '#1d4ed8' : '#334155',
                      padding: '7px 8px',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Bharti
                  </button>
                  <button
                    type="button"
                    onClick={autofillBhawna}
                    style={{
                      flex: 1,
                      backgroundColor: email === 'marketing@doctorsoap.com' ? '#eff6ff' : '#ffffff',
                      border: email === 'marketing@doctorsoap.com' ? '1.5px solid #1d4ed8' : '1px solid #cbd5e1',
                      color: email === 'marketing@doctorsoap.com' ? '#1d4ed8' : '#334155',
                      padding: '7px 8px',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Bhawna
                  </button>
                </div>
              </div>
            )}

            {/* Security Assurance Footer */}
            <div style={{
              marginTop: '22px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Authorized Access Only • Active 30-Day Session</span>
            </div>
          </div>

          {/* ============================================================ */}
          {/* BACK FACE: REGISTER NEW USER                                  */}
          {/* ============================================================ */}
          <div style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            padding: '36px 32px',
            border: '1px solid #d1d5db',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
            position: isFlipped ? 'relative' : 'absolute',
            top: 0,
            left: 0,
            overflow: 'hidden'
          }}>
            {/* Subtle top accent bar in emerald green */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              backgroundColor: '#16a34a'
            }} />

            {/* Registration Header */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: currentBranding?.logoUrl ? '68px' : '52px',
                height: currentBranding?.logoUrl ? '68px' : '52px',
                margin: '0 auto 14px',
                borderRadius: '50%',
                backgroundColor: currentBranding?.logoUrl ? '#ffffff' : '#16a34a',
                border: currentBranding?.logoUrl ? '2px solid #bbf7d0' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                overflow: 'hidden',
                padding: currentBranding?.logoUrl ? '6px' : '0',
                boxShadow: currentBranding?.logoUrl ? '0 4px 14px rgba(0, 0, 0, 0.08)' : 'none'
              }}>
                {currentBranding?.logoUrl ? (
                  <img 
                    src={currentBranding.logoUrl} 
                    alt={currentBranding.companyName || 'Company Logo'} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} 
                  />
                ) : (
                  <UserPlus size={28} strokeWidth={2.2} />
                )}
              </div>
              <h2 style={{
                margin: '0 0 4px',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.01em'
              }}>
                {currentBranding?.companyName ? `${currentBranding.companyName} Registration` : 'New User Registration'}
              </h2>
              <p style={{
                margin: 0,
                color: '#4b5563',
                fontSize: '0.84rem',
                fontWeight: 500
              }}>
                Create credentials to access {currentBranding?.companyName || 'the TA-DA Portal'}
              </p>
            </div>

            {/* Register Form */}
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Full Name */}
              <div>
                <label htmlFor="regName" style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#334155',
                  marginBottom: '6px'
                }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    <User size={18} />
                  </div>
                  <input
                    id="regName"
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    disabled={regLoading}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 42px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#1e293b'
                    }}
                  />
                </div>
              </div>

              {/* Work Email */}
              <div>
                <label htmlFor="regEmail" style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#334155',
                  marginBottom: '6px'
                }}>
                  Work Email <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    <Mail size={18} />
                  </div>
                  <input
                    id="regEmail"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    disabled={regLoading}
                    autoComplete="email"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 42px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#1e293b'
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="regPassword" style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#334155',
                  marginBottom: '6px'
                }}>
                  Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    <Lock size={18} />
                  </div>
                  <input
                    id="regPassword"
                    type={regShowPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 3 characters"
                    required
                    disabled={regLoading}
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 42px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#1e293b'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setRegShowPassword(!regShowPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={regShowPassword ? 'Hide password' : 'Show password'}
                  >
                    {regShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="regConfirmPassword" style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#334155',
                  marginBottom: '6px'
                }}>
                  Confirm Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    <Lock size={18} />
                  </div>
                  <input
                    id="regConfirmPassword"
                    type={regShowPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    disabled={regLoading}
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 42px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                      color: '#1e293b'
                    }}
                  />
                </div>
              </div>

              {/* Registration Error Banner */}
              {regError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠️</span>
                  <span>{regError}</span>
                </div>
              )}

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={regLoading}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: regLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s ease',
                  marginTop: '4px',
                  opacity: regLoading ? 0.75 : 1
                }}
              >
                {regLoading ? (
                  <>
                    <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <>
                    <span>Register & Go to Login</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* FLIP BACK TO SIGN IN */}
            <div style={{
              marginTop: '18px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.86rem',
              color: '#475569'
            }}>
              <span>Already have an account?</span>
              <button
                type="button"
                onClick={() => {
                  setRegError('');
                  setIsFlipped(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '0.86rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'underline'
                }}
              >
                <ArrowLeft size={15} />
                <span>Back to Sign In</span>
              </button>
            </div>

            {/* Footer */}
            <div style={{
              marginTop: '22px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={14} color="#16a34a" />
              <span>Saves directly into authorized Users database</span>
            </div>
          </div>

        </div>

        {/* Universal Developer Attribution Footer */}
        <div style={{
          marginTop: '28px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.78rem',
          fontWeight: 500,
          letterSpacing: '0.01em'
        }}>
          © 2026 Designed & Engineered by Dev. Anil Kumar Chahar • 8126390611 • v2.5 Cloud Edition
        </div>
      </div>
    </div>
  );
}
