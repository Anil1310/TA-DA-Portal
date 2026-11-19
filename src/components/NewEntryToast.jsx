import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileText, X, Sparkles, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { formatINR, getTerritoryStyle, normalizeStateName } from '../services/currency';

export default function NewEntryToast({ entry, onClose, onViewVoucher }) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  const DURATION_MS = 7000;

  useEffect(() => {
    if (!entry) return;

    const interval = 50;
    const step = (interval / DURATION_MS) * 100;

    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return Math.max(0, prev - step);
        });
      }
    }, interval);

    return () => clearInterval(timer);
  }, [entry, isPaused, onClose]);

  if (!entry) return null;

  const claim = entry.claim || entry;
  const stateNorm = normalizeStateName(claim.state);
  const territory = getTerritoryStyle(stateNorm);

  return (
    <div
      className="new-entry-toast-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 999999,
        maxWidth: '420px',
        width: 'calc(100vw - 32px)',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '16px',
        boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(37, 99, 235, 0.15)',
        border: '1.5px solid #bfdbfe',
        overflow: 'hidden',
        animation: 'slideInTopBounce 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'inherit'
      }}
    >
      {/* Top Accent Strip */}
      <div style={{
        height: '4px',
        width: '100%',
        background: 'linear-gradient(90deg, #10b981 0%, #2563eb 50%, #7c3aed 100%)'
      }} />

      <div style={{ padding: '16px 18px 14px' }}>
        {/* Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#dcfce7',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)'
            }}>
              <CheckCircle2 size={16} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {entry.toastTitle || 'Latest Claim Record'}
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '999px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Sparkles size={10} />
                  {entry.toastBadge || 'RECENT'}
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {entry.toastSubtitle || 'Traveling allowance recorded in Google Sheets'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '6px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            title="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>

        {/* Claim Summary Card */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '10px 12px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#0f172a' }}>
              {claim.name || 'Sales Representative'}
            </span>
            <span style={{
              fontSize: '0.92rem',
              fontWeight: 800,
              color: '#059669',
              background: '#ecfdf5',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid #a7f3d0'
            }}>
              {formatINR(claim.amount)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '0.70rem' }}>
            <span style={{
              padding: '2px 6px',
              borderRadius: '4px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontFamily: 'monospace',
              fontWeight: 700
            }}>
              {claim.empCode || claim.id || 'EMP'}
            </span>

            <span style={{
              padding: '2px 6px',
              borderRadius: '999px',
              background: territory.bg,
              color: territory.text,
              border: `1px solid ${territory.border}`,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <MapPin size={9} />
              {stateNorm || 'State'}
            </span>

            <span style={{
              padding: '2px 6px',
              borderRadius: '4px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <Calendar size={10} />
              Month: {claim.month || 'Current'}
            </span>

            {claim.remarks && (
              <span style={{
                color: '#64748b',
                fontStyle: 'italic',
                maxWidth: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                "{claim.remarks}"
              </span>
            )}
          </div>
        </div>

        {/* Action Button Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: '#64748b',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>

          {typeof onViewVoucher === 'function' && (
            <button
              type="button"
              onClick={() => {
                onViewVoucher(claim);
                onClose();
              }}
              style={{
                padding: '6px 14px',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
              }}
            >
              <FileText size={12} />
              <span>View Voucher</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Auto-dismiss Animated Progress Bar */}
      <div style={{
        height: '3px',
        width: '100%',
        background: '#e2e8f0',
        position: 'relative'
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #10b981 0%, #2563eb 100%)',
          transition: isPaused ? 'none' : 'width 50ms linear'
        }} />
      </div>
    </div>
  );
}
