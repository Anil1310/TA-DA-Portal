import React from 'react';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { formatINR, numberToWordsINR } from '../services/currency';

export default function VoucherModal({ claim, onClose }) {
  if (!claim) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={20} color="#059669" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>TA Expense Voucher Slip</h3>
          </div>
          <button className="sidebar-collapse-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Printable Voucher Body */}
        <div className="modal-body" style={{ padding: '28px' }}>
          <div style={{ border: '2px solid #0f172a', padding: '24px', borderRadius: '12px', background: '#fff' }}>
            
            {/* Title Block */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                BHARTI SALES & MARKETING
              </h2>
              <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                Traveling Allowance (TA) Claim Voucher
              </div>
            </div>

            {/* Meta Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', fontSize: '0.85rem' }}>
              <div>
                <strong>Voucher No:</strong> <span style={{ fontFamily: 'monospace' }}>{claim.id || 'TA-' + claim.sNo}</span>
              </div>
              <div>
                <strong>Claim Date:</strong> {claim.date || 'N/A'}
              </div>
            </div>

            {/* Details Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.88rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: '#64748b', width: '35%' }}>Sales Person Name:</td>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: '#0f172a' }}>{claim.name}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: '#64748b' }}>Employee Code:</td>
                  <td style={{ padding: '8px 4px', fontFamily: 'monospace', fontWeight: 700 }}>{claim.empCode}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: '#64748b' }}>State / Territory:</td>
                  <td style={{ padding: '8px 4px' }}>{claim.state}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: '#64748b' }}>Expense Month:</td>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: '#1e40af' }}>{claim.month}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: '#64748b' }}>Purpose / Remarks:</td>
                  <td style={{ padding: '8px 4px', fontStyle: 'italic' }}>{claim.remarks || 'Standard Monthly Field Travel'}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td style={{ padding: '12px 4px', fontWeight: 800, fontSize: '0.98rem' }}>Total TA Bill Amount:</td>
                  <td style={{ padding: '12px 4px', fontWeight: 900, fontSize: '1.25rem', color: '#1e40af' }}>
                    {formatINR(claim.amount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Amount In Words */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', marginBottom: '28px', fontSize: '0.84rem' }}>
              <strong style={{ color: '#1e40af' }}>Amount in Words: </strong>
              <span style={{ color: '#1e3a8a', fontWeight: 600 }}>{numberToWordsINR(claim.amount)}</span>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed #94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>
              <div style={{ width: '30%' }}>
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '6px' }}>Claimant Signature</div>
              </div>
              <div style={{ width: '30%' }}>
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '6px' }}>Verified By Accounts</div>
              </div>
              <div style={{ width: '30%' }}>
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '6px' }}>Authorized Signatory</div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer size={16} />
            <span>Print Voucher</span>
          </button>
        </div>

      </div>
    </div>
  );
}
