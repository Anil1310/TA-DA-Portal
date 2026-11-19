import React, { useState, useMemo } from 'react';
import { Users, UserPlus, Search, Phone, MapPin, Briefcase, X, Edit2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { TERRITORIES, BHAWNA_STATES, BHARTI_STATES, isUserBhawnaHelper, isStateAllowed } from '../services/currency';

export default function Directory({ staffList, onAddStaff, onUpdateStaff, claims, showToast, user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRep, setEditingRep] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic territories derived directly from staffList, claims, and strictly scoped by user
  const dynamicTerritories = useMemo(() => {
    const isAdmin = user?.role === 'admin' || (user?.email || '').toLowerCase().includes('mis@');
    const isBhawna = isUserBhawnaHelper(user);

    if (!isAdmin) {
      return isBhawna ? BHAWNA_STATES : BHARTI_STATES;
    }

    const set = new Set();
    TERRITORIES.forEach(t => set.add(t));
    staffList.forEach(s => {
      if (s.state && isNaN(Number(s.state))) set.add(s.state.trim());
    });
    const list = Array.from(set).filter(Boolean);
    list.sort();
    return list.length > 0 ? list : ['Delhi', 'Rajasthan', 'Gujarat', 'Bihar', 'Jharkhand'];
  }, [staffList, user]);

  const [newRep, setNewRep] = useState({
    code: '',
    name: '',
    state: dynamicTerritories[0] || 'Delhi',
    designation: 'Sales Executive',
    phone: ''
  });

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return staffList.filter(s => {
      if (!q) return true;
      return (
        (s.code || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.state || '').toLowerCase().includes(q) ||
        (s.designation || '').toLowerCase().includes(q)
      );
    });
  }, [staffList, searchQuery]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newRep.code || !newRep.name || !newRep.state) {
      showToast('Please provide Employee Code, Name, and Territory.', 'error');
      return;
    }

    const codeUpper = newRep.code.trim().toUpperCase();
    if (staffList.some(s => s.code.toUpperCase() === codeUpper)) {
      showToast(`Employee Code ${codeUpper} already exists!`, 'error');
      return;
    }

    setIsSaving(true);
    try {
      await onAddStaff({
        ...newRep,
        code: codeUpper,
        name: newRep.name.trim()
      });
      setShowAddModal(false);
      setNewRep({ code: '', name: '', state: dynamicTerritories[0] || 'Delhi', designation: 'Sales Executive', phone: '' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEdit = (member) => {
    setEditingRep({
      originalCode: member.code,
      originalName: member.name,
      code: member.code,
      name: member.name,
      state: member.state || dynamicTerritories[0] || 'Delhi',
      designation: member.designation || 'Sales Representative',
      phone: member.phone || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRep.code || !editingRep.name || !editingRep.state) {
      showToast('Please specify Employee Code, Name, and Territory.', 'error');
      return;
    }

    const newCodeUpper = editingRep.code.trim().toUpperCase();
    const oldCodeUpper = editingRep.originalCode.trim().toUpperCase();

    // Check if new code conflicts with another representative
    if (newCodeUpper !== oldCodeUpper && staffList.some(s => s.code.toUpperCase() === newCodeUpper)) {
      showToast(`Employee Code ${newCodeUpper} is already in use by another person!`, 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = {
        code: newCodeUpper,
        name: editingRep.name.trim(),
        state: editingRep.state.trim(),
        designation: (editingRep.designation || '').trim(),
        phone: (editingRep.phone || '').trim()
      };

      if (onUpdateStaff) {
        await onUpdateStaff(updatedData, editingRep.originalCode, editingRep.originalName);
      }
      setEditingRep(null);
    } catch (err) {
      showToast('Failed to update: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getStaffClaimsCount = (code) => {
    if (!claims || !code) return 0;
    const cUpper = code.toUpperCase();
    return claims.filter(c => c.empCode && c.empCode.toUpperCase() === cUpper).length;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Compact Controls Header */}
      <div className="card-panel" style={{ padding: '12px 16px', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px', maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', height: '36px', width: '100%' }}>
              <Search size={15} color="#64748b" style={{ marginRight: '8px' }} />
              <input
                type="text"
                placeholder="Search representative, code, or territory..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
              {filteredStaff.length} Reps
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ height: '36px', padding: '0 14px', fontSize: '0.82rem', gap: '6px' }}>
              <UserPlus size={15} />
              <span>Add Representative</span>
            </button>
          </div>

        </div>
      </div>

      {/* Compact Staff Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
        {filteredStaff.map(member => {
          const claimsCount = getStaffClaimsCount(member.code);
          return (
            <div 
              key={member.code} 
              className="card-panel" 
              style={{ 
                margin: 0, 
                padding: '14px 16px', 
                transition: 'all 0.18s ease', 
                position: 'relative', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                border: '1px solid #e2e8f0'
              }}
            >
              <div>
                {/* Header: Avatar, Code & Edit Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                      color: '#1d4ed8', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 800, 
                      fontSize: '0.9rem',
                      border: '1px solid #bfdbfe'
                    }}>
                      {member.name.charAt(0)}
                    </div>
                    <span className="code-pill" style={{ fontSize: '0.74rem', padding: '2px 8px' }}>{member.code}</span>
                  </div>

                  <button 
                    type="button"
                    title="Edit Name, Code, or Territory"
                    onClick={() => handleOpenEdit(member)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#0284c7',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#0284c7';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderColor = '#0284c7';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.color = '#0284c7';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    <Edit2 size={11} />
                    <span>Edit</span>
                  </button>
                </div>

                {/* Name */}
                <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', lineHeight: 1.25 }}>
                  {member.name}
                </h4>
                
                {/* Designation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                  <Briefcase size={12} color="#94a3b8" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.designation || 'Sales Representative'}</span>
                </div>

                {/* State */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', color: '#0369a1', marginBottom: member.phone ? '4px' : '8px', fontWeight: 600 }}>
                  <MapPin size={12} color="#0284c7" />
                  <span>{member.state}</span>
                </div>

                {/* Phone */}
                {member.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#64748b', marginBottom: '8px' }}>
                    <Phone size={12} color="#94a3b8" />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>

              {/* Bottom footer: Submitted claims */}
              <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                <span style={{ color: '#64748b' }}>Claims:</span>
                <span style={{ fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>
                  {claimsCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Representative Modal */}
      {editingRep && (
        <div className="modal-overlay" onClick={() => setEditingRep(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '18px 20px' }}>
            <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Edit Representative</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Modifying: <strong>{editingRep.originalName}</strong> ({editingRep.originalCode})
                </span>
              </div>
              <button className="sidebar-collapse-btn" onClick={() => setEditingRep(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px 0' }}>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Employee Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                    placeholder="e.g. HOS0612"
                    value={editingRep.code}
                    onChange={e => setEditingRep({ ...editingRep, code: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                    placeholder="Representative full name"
                    value={editingRep.name}
                    onChange={e => setEditingRep({ ...editingRep, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Assigned Territory / State *</label>
                  <select
                    className="form-select"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                    value={editingRep.state}
                    onChange={e => setEditingRep({ ...editingRep, state: e.target.value })}
                    required
                  >
                    {dynamicTerritories.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Designation</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                    placeholder="e.g. Area Sales Manager"
                    value={editingRep.designation}
                    onChange={e => setEditingRep({ ...editingRep, designation: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Mobile Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                    placeholder="+91 98XXX XXXXX"
                    value={editingRep.phone}
                    onChange={e => setEditingRep({ ...editingRep, phone: e.target.value })}
                  />
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 10px', fontSize: '0.73rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} color="#16a34a" />
                  <span>Updates code & name across Staff, Master, and claims in Google Sheets.</span>
                </div>

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingRep(null)} disabled={isSaving} style={{ height: '34px', padding: '0 12px', fontSize: '0.8rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving} style={{ height: '34px', padding: '0 14px', fontSize: '0.8rem' }}>
                  {isSaving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '18px 20px' }}>
            <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Add New Sales Representative</h3>
              <button className="sidebar-collapse-btn" onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px 0' }}>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Employee Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                    placeholder="e.g. HOS0612"
                    value={newRep.code}
                    onChange={e => setNewRep({ ...newRep, code: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                    placeholder="Representative full name"
                    value={newRep.name}
                    onChange={e => setNewRep({ ...newRep, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Assigned Territory / State *</label>
                  <select
                    className="form-select"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                    value={newRep.state}
                    onChange={e => setNewRep({ ...newRep, state: e.target.value })}
                    required
                  >
                    {dynamicTerritories.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Designation</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                    placeholder="e.g. Territory Sales Executive"
                    value={newRep.designation}
                    onChange={e => setNewRep({ ...newRep, designation: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Mobile Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    style={{ height: '36px', fontSize: '0.85rem' }}
                    placeholder="+91 98XXX XXXXX"
                    value={newRep.phone}
                    onChange={e => setNewRep({ ...newRep, phone: e.target.value })}
                  />
                </div>

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)} disabled={isSaving} style={{ height: '34px', padding: '0 12px', fontSize: '0.8rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving} style={{ height: '34px', padding: '0 14px', fontSize: '0.8rem' }}>
                  {isSaving ? 'Saving...' : 'Save Representative'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
