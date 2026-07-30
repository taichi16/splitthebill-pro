import React, { useState } from 'react';
import { UserPlus, UserCheck, Trash2, Edit2, Baby, User, ShieldCheck, Heart } from 'lucide-react';

export default function MemberManager({ members, setMembers, onShowToast }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('adult'); // 'adult' | 'child'
  const [parentId, setParentId] = useState('');
  const [spouseId, setSpouseId] = useState('');

  const adults = members.filter(m => m.type === 'adult');

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setType('adult');
    setParentId(adults[0]?.id || '');
    setSpouseId('');
    setShowAddModal(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setName(member.name);
    setType(member.type);
    setParentId(member.parentId || (adults[0]?.id || ''));
    setSpouseId(member.spouseId || '');
    setShowAddModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('請輸入成員姓名！');
      return;
    }

    let updated = [...members];

    if (editingMember) {
      // Update existing
      updated = updated.map(m => {
        if (m.id === editingMember.id) {
          return {
            ...m,
            name: name.trim(),
            type,
            parentId: type === 'child' ? (parentId || null) : null,
            spouseId: type === 'adult' ? (spouseId || null) : null
          };
        }
        return m;
      });

      // Handle reciprocal spouse setting if adult
      if (type === 'adult') {
        const oldSpouseId = editingMember.spouseId;
        // Unbind old spouse if changed
        if (oldSpouseId && oldSpouseId !== spouseId) {
          updated = updated.map(m => m.id === oldSpouseId ? { ...m, spouseId: null } : m);
        }
        // Bind new spouse
        if (spouseId) {
          updated = updated.map(m => m.id === spouseId ? { ...m, spouseId: editingMember.id } : m);
        }
      }

      setMembers(updated);
      onShowToast(`已更新成員「${name}」`);
    } else {
      // Add new
      const newId = 'm_' + Date.now();
      const newMember = {
        id: newId,
        name: name.trim(),
        type,
        parentId: type === 'child' ? (parentId || null) : null,
        spouseId: type === 'adult' ? (spouseId || null) : null,
        color: type === 'adult' ? '#3b82f6' : '#ec4899'
      };

      if (type === 'adult' && spouseId) {
        updated = updated.map(m => m.id === spouseId ? { ...m, spouseId: newId } : m);
      }

      updated.push(newMember);
      setMembers(updated);
      onShowToast(`已新增成員「${name}」`);
    }

    setShowAddModal(false);
  };

  const handleDelete = (id, name) => {
    if (confirm(`確定要刪除成員「${name}」嗎？若已有相關消費紀錄可能會受影響。`)) {
      const filtered = members.filter(m => m.id !== id).map(m => {
        if (m.parentId === id) return { ...m, parentId: null };
        if (m.spouseId === id) return { ...m, spouseId: null };
        return m;
      });
      setMembers(filtered);
      onShowToast(`已刪除成員「${name}」`);
    }
  };

  // Organize display into Household Units (夫妻檔 + 小孩 / 獨立大人 / 未歸屬小孩)
  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m; });

  const processedAdultIds = new Set();
  const householdGroups = [];

  adults.forEach(adult => {
    if (processedAdultIds.has(adult.id)) return;

    const spouse = adult.spouseId ? memberMap[adult.spouseId] : null;
    const isCouple = spouse && spouse.type === 'adult' && spouse.spouseId === adult.id;

    const groupAdults = [adult];
    processedAdultIds.add(adult.id);
    if (isCouple) {
      groupAdults.push(spouse);
      processedAdultIds.add(spouse.id);
    }

    const adultIdSet = new Set(groupAdults.map(a => a.id));
    const children = members.filter(m => m.type === 'child' && adultIdSet.has(m.parentId));

    householdGroups.push({ adults: groupAdults, children, isCouple });
  });

  const unassignedChildren = members.filter(m => m.type === 'child' && (!m.parentId || !memberMap[m.parentId]));

  return (
    <div className="member-manager">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <UserCheck className="icon" size={20} color="var(--primary)" /> 成員與家庭/夫妻關係設定
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            支援設定「夫妻檔 (互相幫忙代付與統一結算)」以及「小孩歸屬家長」
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <UserPlus size={18} />
          <span>新增成員</span>
        </button>
      </div>

      {/* Household Groups */}
      {householdGroups.map((group, gIdx) => {
        const { adults: hAdults, children, isCouple } = group;
        return (
          <div key={gIdx} className="card">
            {/* Header: Couple or Single Adult */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: children.length > 0 ? '12px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: isCouple ? '#fce7f3' : '#dbeafe',
                    color: isCouple ? '#ec4899' : '#1e40af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700'
                  }}
                >
                  {isCouple ? <Heart size={22} fill="#ec4899" color="#ec4899" /> : <User size={22} />}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {hAdults.map(a => a.name).join(' & ')}
                    {isCouple ? (
                      <span className="badge badge-child" style={{ background: '#fbcfe8', color: '#9d174d' }}>
                        <Heart size={12} fill="#9d174d" /> 夫妻檔 (由其中一人統一代付/結算)
                      </span>
                    ) : (
                      <span className="badge badge-adult">
                        <ShieldCheck size={12} /> 大人 (獨立戶頭)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    家庭附帶小孩：{children.length} 位
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                {hAdults.map(a => (
                  <button key={a.id} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.78rem', minHeight: 'auto' }} onClick={() => openEditModal(a)}>
                    <Edit2 size={12} /> {a.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Children list under parent / couple */}
            {children.length > 0 && (
              <div style={{ paddingLeft: '16px', borderLeft: '3px solid var(--primary-light)', marginTop: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  歸屬小孩 (費用最終由 {hAdults.map(a => a.name).join('/')} 負擔)：
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {children.map(child => (
                    <div
                      key={child.id}
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        background: 'var(--bg-color)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Baby size={16} color="#ec4899" />
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{child.name}</span>
                        <span className="badge badge-child">小孩</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', minHeight: 'auto' }} onClick={() => openEditModal(child)}>
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', color: 'var(--danger)', minHeight: 'auto' }} onClick={() => handleDelete(child.id, child.name)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Unassigned Children if any */}
      {unassignedChildren.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--warning)' }}>
          <div className="section-title" style={{ color: 'var(--warning)', fontSize: '0.9rem', marginBottom: '8px' }}>
            未歸屬家長的小孩成員 ({unassignedChildren.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {unassignedChildren.map(child => (
              <div key={child.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Baby size={16} color="var(--warning)" />
                  <span>{child.name}</span>
                </div>
                <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => openEditModal(child)}>
                  設定歸屬家長
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingMember ? '編輯成員' : '新增成員'}</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">成員姓名 *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="例如：陳大明、林美玲、小明"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">成員類別</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn btn-block ${type === 'adult' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setType('adult')}
                  >
                    <User size={16} /> 大人 (可配對夫妻)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-block ${type === 'child' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setType('child')}
                  >
                    <Baby size={16} /> 小孩 (可歸屬家長)
                  </button>
                </div>
              </div>

              {type === 'adult' && (
                <div className="form-group">
                  <label className="form-label">💑 設定配偶/伴侶 (夫妻檔關係)</label>
                  <select
                    className="form-select"
                    value={spouseId}
                    onChange={e => setSpouseId(e.target.value)}
                  >
                    <option value="">-- 無 (單身/獨立計算) --</option>
                    {adults.filter(a => !editingMember || a.id !== editingMember.id).map(adult => (
                      <option key={adult.id} value={adult.id}>
                        {adult.name} (配對後兩人之帳務合併由其中一人收付)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {type === 'child' && (
                <div className="form-group">
                  <label className="form-label">👨‍👩‍👧 歸屬家長（結算時小孩費用合併至此家長帳下）</label>
                  {adults.length === 0 ? (
                    <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                      尚未新增任何大人，請先新增大人家長。
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={parentId}
                      onChange={e => setParentId(e.target.value)}
                    >
                      <option value="">-- 無歸屬 (獨立計算) --</option>
                      {adults.map(adult => (
                        <option key={adult.id} value={adult.id}>
                          {adult.name} (家長)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary btn-block" onClick={() => setShowAddModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary btn-block">
                  儲存成員設定
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
