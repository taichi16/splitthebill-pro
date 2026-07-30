import React, { useState, useEffect } from 'react';
import { Utensils, Car, Bed, Ticket, ShoppingBag, HelpCircle, CheckSquare, Square, Camera, Image, Trash2 } from 'lucide-react';
import { getExpensePhotos, saveExpensePhotos, fileToDataURL } from '../utils/photoStorage';

export const CATEGORIES = [
  { id: 'dining', name: '餐飲美食', icon: Utensils, color: '#f97316' },
  { id: 'transport', name: '交通油資', icon: Car, color: '#3b82f6' },
  { id: 'lodging', name: '飯店住宿', icon: Bed, color: '#8b5cf6' },
  { id: 'entertainment', name: '景點娛樂', icon: Ticket, color: '#ec4899' },
  { id: 'shopping', name: '購物消費', icon: ShoppingBag, color: '#10b981' },
  { id: 'other', name: '其他雜項', icon: HelpCircle, color: '#64748b' }
];

export default function ExpenseModal({ show, onClose, onSave, editingExpense, members }) {
  if (!show) return null;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('dining');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(members[0]?.id || '');
  const [beneficiaryIds, setBeneficiaryIds] = useState(members.map(m => m.id));
  const [splitType, setSplitType] = useState('equal');
  const [customShares, setCustomShares] = useState({});
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Pro features states
  const [photos, setPhotos] = useState([]);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsPlaces, setGpsPlaces] = useState([]);
  const [showGpsDropdown, setShowGpsDropdown] = useState(false);

  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m; });

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title || '');
      setCategory(editingExpense.category || 'dining');
      setAmount(editingExpense.amount || '');
      setPayerId(editingExpense.payerId || members[0]?.id || '');
      setBeneficiaryIds(editingExpense.beneficiaryIds || members.map(m => m.id));
      setSplitType(editingExpense.splitType || 'equal');
      setCustomShares(editingExpense.customShares || {});
      setNotes(editingExpense.notes || '');
      setDate(editingExpense.date || new Date().toISOString().split('T')[0]);
      
      // Load photos asynchronously from IndexedDB
      getExpensePhotos(editingExpense.id).then(storedPhotos => {
        setPhotos(storedPhotos);
      });
    } else {
      setTitle('');
      setCategory('dining');
      setAmount('');
      setPayerId(members[0]?.id || '');
      setBeneficiaryIds(members.map(m => m.id));
      setSplitType('equal');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setPhotos([]);

      // Initialize child defaults
      const defaults = {};
      members.forEach(m => {
        if (m.type === 'child') defaults[m.id] = 200;
        else defaults[m.id] = 1.0;
      });
      setCustomShares(defaults);
    }
    // Reset GPS states
    setGpsPlaces([]);
    setShowGpsDropdown(false);
  }, [editingExpense, members, show]);

  const toggleBeneficiary = (id) => {
    if (beneficiaryIds.includes(id)) {
      setBeneficiaryIds(beneficiaryIds.filter(bId => bId !== id));
    } else {
      setBeneficiaryIds([...beneficiaryIds, id]);
    }
  };

  const selectAllBeneficiaries = () => {
    setBeneficiaryIds(members.map(m => m.id));
  };

  const selectAdultsOnly = () => {
    setBeneficiaryIds(members.filter(m => m.type === 'adult').map(m => m.id));
  };

  const clearBeneficiaries = () => {
    setBeneficiaryIds([]);
  };

  const handleCustomShareChange = (memberId, val) => {
    setCustomShares({
      ...customShares,
      [memberId]: val
    });
  };

  // GPS places fetching via OpenStreetMap & Overpass
  const fetchNearbyPlaces = () => {
    if (!navigator.geolocation) {
      alert('您的瀏覽器不支援定位功能。');
      return;
    }

    setGpsLoading(true);
    setGpsPlaces([]);
    setShowGpsDropdown(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // 1. Query Overpass API for nearby amenities/shops/tourism within 150 meters
          const overpassQuery = `[out:json][timeout:15];(node(around:150,${latitude},${longitude})[amenity];node(around:150,${latitude},${longitude})[shop];node(around:150,${latitude},${longitude})[tourism];way(around:150,${latitude},${longitude})[amenity];way(around:150,${latitude},${longitude})[shop];way(around:150,${latitude},${longitude})[tourism];);out tags center;`;
          const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
          if (!response.ok) throw new Error('Overpass API error');
          const data = await response.json();

          const places = [];
          if (data && data.elements) {
            data.elements.forEach(el => {
              const name = el.tags?.name;
              let typeZh = '店家';
              if (el.tags?.amenity === 'restaurant') typeZh = '餐廳';
              else if (el.tags?.amenity === 'cafe') typeZh = '咖啡廳';
              else if (el.tags?.amenity === 'fast_food') typeZh = '速食店';
              else if (el.tags?.shop === 'supermarket') typeZh = '超市';
              else if (el.tags?.shop === 'convenience') typeZh = '超商';
              else if (el.tags?.tourism === 'hotel' || el.tags?.tourism === 'guest_house') typeZh = '飯店旅宿';

              if (name && !places.some(p => p.name === name)) {
                places.push({ name, type: typeZh });
              }
            });
          }

          // 2. Query Nominatim Reverse Geocoding as a fallback
          const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=zh-TW`;
          const reverseRes = await fetch(reverseUrl);
          if (reverseRes.ok) {
            const reverseData = await reverseRes.json();
            const address = reverseData.address;
            const road = address?.road || address?.suburb || address?.neighbourhood;
            const amenity = address?.amenity || address?.restaurant || address?.cafe || address?.shop;
            
            if (amenity && !places.some(p => p.name === amenity)) {
              places.unshift({ name: amenity, type: '定位點' });
            }
            if (road && !places.some(p => p.name === road)) {
              places.push({ name: road, type: '路名' });
            }
          }

          if (places.length === 0) {
            places.push({ name: '找不到周邊商店，請確認定位權限', type: '提示' });
          }

          setGpsPlaces(places);
        } catch (error) {
          console.error('Failed to fetch nearby places:', error);
          setGpsPlaces([{ name: '定位查詢失敗，請再試一次', type: '錯誤' }]);
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let msg = '定位失敗，請確保手機已開啟 GPS 並授權定位權限。';
        if (error.code === error.PERMISSION_DENIED) {
          msg = '您拒絕了定位權限授權，請至瀏覽器設定中開啟。';
        }
        setGpsPlaces([{ name: msg, type: '錯誤' }]);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Photos upload & delete handlers
  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = [];
    for (const file of files) {
      try {
        const dataUrl = await fileToDataURL(file);
        newPhotos.push(dataUrl);
      } catch (err) {
        console.error('Failed to convert file to data URL:', err);
      }
    }
    setPhotos(prev => [...prev, ...newPhotos]);
    // Clear input value to allow uploading same file again
    e.target.value = '';
  };

  const handleDeletePhoto = (indexToDelete) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== indexToDelete));
  };

  // Preview calculations for split mode
  const totalAmt = Number(amount) || 0;
  const splitShares = {};

  const adultsInExp = beneficiaryIds.filter(id => memberMap[id]?.type === 'adult');
  const childrenInExp = beneficiaryIds.filter(id => memberMap[id]?.type === 'child');

  if (totalAmt > 0 && beneficiaryIds.length > 0) {
    if (splitType === 'equal') {
      const perHead = Math.round(totalAmt / beneficiaryIds.length);
      beneficiaryIds.forEach(id => {
        splitShares[id] = perHead;
      });
    } else if (splitType === 'child_fixed') {
      let childrenSum = 0;
      childrenInExp.forEach(cId => {
        const val = customShares[cId] !== undefined ? Number(customShares[cId]) : 200;
        childrenSum += val;
        splitShares[cId] = val;
      });

      const remain = Math.max(0, totalAmt - childrenSum);
      const perAdult = adultsInExp.length > 0 ? Math.round(remain / adultsInExp.length) : 0;

      adultsInExp.forEach(aId => {
        splitShares[aId] = perAdult;
      });
    } else if (splitType === 'weighted') {
      let totalW = 0;
      beneficiaryIds.forEach(id => {
        const m = memberMap[id];
        const w = customShares[id] !== undefined ? Number(customShares[id]) : (m?.type === 'child' ? 0.5 : 1.0);
        totalW += w;
      });

      if (totalW > 0) {
        beneficiaryIds.forEach(id => {
          const m = memberMap[id];
          const w = customShares[id] !== undefined ? Number(customShares[id]) : (m?.type === 'child' ? 0.5 : 1.0);
          splitShares[id] = Math.round(totalAmt * (w / totalW));
        });
      }
    } else if (splitType === 'custom') {
      beneficiaryIds.forEach(id => {
        splitShares[id] = Number(customShares[id]) || 0;
      });
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('請輸入消費品項名稱！');
    if (!amount || Number(amount) <= 0) return alert('請輸入有效的金額！');
    if (!payerId) return alert('請選擇代付人！');
    if (beneficiaryIds.length === 0) return alert('請至少勾選一位參與分攤的成員！');

    const expId = editingExpense?.id || 'e_' + Date.now();

    // Save photos to IndexedDB first
    await saveExpensePhotos(expId, photos);

    const expData = {
      id: expId,
      title: title.trim(),
      category,
      amount: Number(amount),
      payerId,
      beneficiaryIds,
      splitType,
      customShares,
      notes: notes.trim(),
      date,
      hasPhotos: photos.length > 0
    };

    onSave(expData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{editingExpense ? '📝 編輯消費紀錄 (專業版)' : '➕ 新增消費紀錄 (專業版)'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title & GPS Location */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>消費品項名稱 *</span>
              <button
                type="button"
                className={`btn btn-outline ${gpsLoading ? 'animate-pulse' : ''}`}
                style={{ padding: '2px 8px', fontSize: '0.75rem', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: '3px' }}
                onClick={fetchNearbyPlaces}
              >
                📍 {gpsLoading ? '定位中...' : '抓取周邊店家'}
              </button>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="例如：海鮮晚餐、加油費、包棟民宿"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />

              {showGpsDropdown && (
                <div style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: 0, 
                  right: 0, 
                  backgroundColor: 'var(--card-bg)', 
                  border: '1px solid var(--card-border)', 
                  borderRadius: '8px', 
                  boxShadow: 'var(--shadow-lg)', 
                  zIndex: 1000, 
                  maxHeight: '180px', 
                  overflowY: 'auto',
                  marginTop: '4px',
                  padding: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: '0.7rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)' }}>
                    <span>📍 周邊店家 (點擊填入)</span>
                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowGpsDropdown(false)}>關閉</button>
                  </div>
                  {gpsLoading ? (
                    <div style={{ padding: '12px', fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-muted)' }}>正在讀取 GPS 並搜尋店家...</div>
                  ) : gpsPlaces.length > 0 ? (
                    gpsPlaces.map((place, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: '0.82rem', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderRadius: '4px'
                        }}
                        className="dropdown-item"
                        onClick={() => {
                          if (place.type !== '錯誤' && place.type !== '提示') {
                            setTitle(place.name);
                            setShowGpsDropdown(false);
                          }
                        }}
                      >
                        <span style={{ fontWeight: '500' }}>{place.name}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.7, padding: '2px 4px', background: 'var(--bg-color)', borderRadius: '3px' }}>{place.type}</span>
                      </div>
                    ))
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">消費金額 (TWD) *</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                min="1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">消費類別</label>
              <select
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Payer dropdown showing couple indicator */}
          <div className="form-group">
            <label className="form-label">誰暫時幫大家付款？(代付者) *</label>
            <select
              className="form-select"
              value={payerId}
              onChange={e => setPayerId(e.target.value)}
            >
              {members.map(m => {
                const spouse = m.spouseId ? memberMap[m.spouseId] : null;
                const coupleText = spouse ? ` (與 ${spouse.name} 夫妻檔代付)` : '';
                return (
                  <option key={m.id} value={m.id}>
                    💳 {m.name} {m.type === 'adult' ? `[大人${coupleText}]` : '[小孩]'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Split Mode Options */}
          <div className="form-group">
            <label className="form-label">拆帳計算模式</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
              <button
                type="button"
                className={`btn ${splitType === 'equal' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 4px', fontSize: '0.8rem' }}
                onClick={() => setSplitType('equal')}
              >
                👥 全員均分
              </button>
              <button
                type="button"
                className={`btn ${splitType === 'child_fixed' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 4px', fontSize: '0.8rem' }}
                onClick={() => setSplitType('child_fixed')}
              >
                👶 小孩固定金額 + 大人平分
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                className={`btn ${splitType === 'weighted' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 4px', fontSize: '0.8rem' }}
                onClick={() => setSplitType('weighted')}
              >
                ⚖️ 權重拆帳 (大人/小孩)
              </button>
              <button
                type="button"
                className={`btn ${splitType === 'custom' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 4px', fontSize: '0.8rem' }}
                onClick={() => setSplitType('custom')}
              >
                ✏️ 全員自訂金額
              </button>
            </div>
          </div>

          {/* Child fixed amount UI */}
          {splitType === 'child_fixed' && (
            <div className="card" style={{ background: 'var(--primary-light)', padding: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '8px', color: 'var(--primary)' }}>
                👶 為小孩輸入固定金額（剩餘將自動由 {adultsInExp.length} 位大人平分）：
              </div>
              {childrenInExp.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>已勾選名單中暫無小孩。</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {childrenInExp.map(cId => {
                    const child = memberMap[cId];
                    return (
                      <div key={cId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', flex: 1, fontWeight: '600' }}>{child?.name} (小孩)：</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.85rem' }}>$</span>
                          <input
                            type="number"
                            className="form-control"
                            style={{ width: '90px', padding: '4px 8px', fontSize: '0.85rem' }}
                            placeholder="0"
                            value={customShares[cId] !== undefined ? customShares[cId] : 200}
                            onChange={e => handleCustomShareChange(cId, e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Beneficiaries Selection */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                參與成員勾選 ({beneficiaryIds.length}/{members.length} 人)
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.75rem', minHeight: 'auto' }} onClick={selectAllBeneficiaries}>
                  全選
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.75rem', minHeight: 'auto' }} onClick={selectAdultsOnly}>
                  僅大人
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.75rem', minHeight: 'auto' }} onClick={clearBeneficiaries}>
                  清空
                </button>
              </div>
            </div>

            <div className="member-grid">
              {members.map(m => {
                const isChecked = beneficiaryIds.includes(m.id);
                const shareAmt = splitShares[m.id];
                return (
                  <div
                    key={m.id}
                    className={`member-chip ${isChecked ? 'selected' : ''}`}
                    onClick={() => toggleBeneficiary(m.id)}
                    style={{ flex: '1 1 calc(50% - 8px)', justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: m.color, display: 'inline-block' }}></span>
                      <span>{m.name}</span>
                      <span className={`badge ${m.type === 'adult' ? 'badge-adult' : 'badge-child'}`} style={{ fontSize: '0.65rem' }}>
                        {m.type === 'adult' ? '大' : '小'}
                      </span>
                    </div>

                    {isChecked && shareAmt !== undefined && (
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)' }}>
                        ${shareAmt}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weighted inputs if weighted splitType */}
          {splitType === 'weighted' && (
            <div className="card" style={{ background: 'var(--primary-light)', padding: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '6px' }}>
                ⚖️ 權重設定（大人 1 份、小孩 0.5 份）：
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {members.filter(m => beneficiaryIds.includes(m.id)).map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', flex: 1 }}>{m.name}:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="form-control"
                      style={{ width: '64px', padding: '4px 6px', fontSize: '0.8rem' }}
                      value={customShares[m.id] !== undefined ? customShares[m.id] : (m.type === 'child' ? 0.5 : 1)}
                      onChange={e => handleCustomShareChange(m.id, e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>份</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom amounts if custom splitType */}
          {splitType === 'custom' && (
            <div className="card" style={{ background: 'var(--primary-light)', padding: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '6px' }}>
                ✏️ 輸入個別成員負擔金額：
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {members.filter(m => beneficiaryIds.includes(m.id)).map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.85rem', flex: 1 }}>{m.name}</span>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '100px', padding: '4px 8px' }}
                      placeholder="0"
                      value={customShares[m.id] || ''}
                      onChange={e => handleCustomShareChange(m.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">日期</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">備註 (選填)</label>
              <input
                type="text"
                className="form-control"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="如：現金付清"
              />
            </div>
          </div>

          {/* Camera/Photo Upload Section */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📸 帳單明細照片 (不限張數)</span>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => document.getElementById('photo-input').click()}
              >
                <Camera size={14} /> 拍攝 / 上傳照片
              </button>
            </label>
            <input 
              type="file" 
              id="photo-input" 
              multiple 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handlePhotoChange} 
            />

            {photos.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '6px 0', scrollbarWidth: 'thin' }}>
                {photos.map((src, idx) => (
                  <div key={idx} style={{ position: 'relative', flex: '0 0 76px', width: '76px', height: '76px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                    <img src={src} alt={`Receipt ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setLightboxImage(src)} />
                    <button 
                      type="button" 
                      style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.85)', color: 'white', border: 'none', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      onClick={() => handleDeletePhoto(idx)}
                      title="刪除此相片"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', border: '1px dashed var(--card-border)', borderRadius: '8px', padding: '16px', textAlign: 'center', backgroundColor: 'var(--primary-light)' }}>
                暫無帳單照片，點擊右上角新增
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary btn-block">
              儲存消費紀錄
            </button>
          </div>
        </form>
      </div>

      {/* Fullscreen Lightbox for receipts */}
      {lightboxImage && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.95)' }} 
          onClick={() => setLightboxImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <img src={lightboxImage} alt="Receipt Full" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: 'var(--shadow-lg)' }} />
            <button 
              type="button"
              style={{ position: 'absolute', top: '-40px', right: '0px', color: 'white', background: 'rgba(255,255,255,0.1)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onClick={() => setLightboxImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
