import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Share2, ArrowRight, CheckCircle2, Sparkles, Copy, FileText, ChevronDown, ChevronUp, Heart, CreditCard, Calendar } from 'lucide-react';
import { calculateSettlement, generateLineShareText, getHouseholdDisplayName } from '../utils/settlement';

export default function SettlementView({ members, expenses, tripName, onShowToast }) {
  const [showIndividualDetails, setShowIndividualDetails] = useState(false);

  const settlement = calculateSettlement(members, expenses);
  const { totalAmount, individualBalances, householdConsolidated, transfers } = settlement;

  const handleCopyLineText = () => {
    const text = generateLineShareText(members, expenses, tripName);
    navigator.clipboard.writeText(text).then(() => {
      onShowToast('📋 已將分帳報告複製至剪貼簿！可直接貼至 LINE / 通訊群組');
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      } catch (e) {}
    }).catch(err => {
      console.error('Failed to copy text', err);
      onShowToast('複製失敗，請手動選取文字複製');
    });
  };

  return (
    <div className="settlement-view">
      {/* Overview Stats Header */}
      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#ffffff', padding: '24px 16px' }}>
        <div style={{ fontSize: '0.85rem', opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <Calendar size={14} /> 行程名稱：{tripName || '未命名行程'}
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: '900', margin: '4px 0' }}>
          ${totalAmount.toLocaleString()} <span style={{ fontSize: '0.9rem' }}>TWD</span>
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
          採「誰幫我刷卡就還給誰」直連邏輯，並將夫妻與小孩自動歸併
        </div>

        <button
          className="btn"
          style={{ background: '#ffffff', color: '#4f46e5', marginTop: '14px', width: '100%', fontWeight: '700' }}
          onClick={handleCopyLineText}
        >
          <Share2 size={18} /> 一鍵複製 LINE 群組拆帳訊息
        </button>
      </div>

      {/* Direct Payer Reimbursement Transfers Section */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title" style={{ color: 'var(--primary)' }}>
            <CreditCard size={20} color="var(--primary)" /> 按代付者直連轉帳清償方案 ({transfers.length} 筆)
          </h3>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          💡 原則：僅對您參與且由他人代付的消費進行直連歸還，無跨餐混合相抵。
        </div>

        {transfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--success)' }}>
            <CheckCircle2 size={40} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>所有人帳務平衡！</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>無須進行任何跨戶轉帳。</div>
          </div>
        ) : (
          <div>
            {transfers.map((t, idx) => (
              <div key={idx} className="transfer-card">
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>轉帳步驟 #{idx + 1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginTop: '2px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--danger)' }}>{t.fromName}</span>
                    <ArrowRight size={16} color="var(--primary)" />
                    <span style={{ color: 'var(--success)' }}>{t.toName}</span>
                  </div>
                </div>
                <div className="transfer-amount">
                  ${t.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consolidated Household Balance Sheet Table (收支對照明細表) */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title">
            👨‍👩‍👧‍👦 各戶收支金額對照表 (總代付 vs 總消費)
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.values(householdConsolidated).map(hh => {
            const displayName = getHouseholdDisplayName(hh);
            const net = hh.totalNet;
            const isPositive = net > 0;
            const isNegative = net < 0;

            return (
              <div
                key={hh.id}
                style={{
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  background: 'var(--bg-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {hh.isCouple && <Heart size={14} fill="#ec4899" color="#ec4899" />}
                      {displayName}
                    </div>
                    {hh.children.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        包含小孩：{hh.children.map(c => c.name).join('、')}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className={`badge ${isPositive ? 'badge-positive' : isNegative ? 'badge-negative' : ''}`} style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                      {isPositive && `淨應收 +$${net.toLocaleString()}`}
                      {isNegative && `淨應付 -$${Math.abs(net).toLocaleString()}`}
                      {net === 0 && `已平結 $0`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--card-border)' }}>
                  <div>總代付：${hh.totalPaid.toLocaleString()}</div>
                  <div>總消費：${hh.totalCost.toLocaleString()}</div>
                  <div style={{ fontWeight: '700', color: isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'inherit' }}>
                    淨結算：${net > 0 ? `+${net}` : net}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual Breakdown Toggle */}
      <div className="card">
        <button
          className="btn btn-outline btn-block"
          onClick={() => setShowIndividualDetails(!showIndividualDetails)}
          style={{ justifyContent: 'space-between' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} /> 查看全體個人獨立明細 (大人/小孩未歸併前)
          </span>
          {showIndividualDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showIndividualDetails && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map(m => {
              const bal = individualBalances[m.id] || { paid: 0, cost: 0, net: 0 };
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>{m.name}</span>
                    <span className={`badge ${m.type === 'adult' ? 'badge-adult' : 'badge-child'}`} style={{ marginLeft: '6px', fontSize: '0.65rem' }}>
                      {m.type === 'adult' ? '大人' : '小孩'}
                    </span>
                  </div>
                  <div>
                    代付 ${bal.paid} / 消費 ${bal.cost} (個人金額 ${bal.net})
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Copy Report Floating Trigger */}
      <div style={{ padding: '10px 0', textAlign: 'center' }}>
        <button className="btn btn-primary btn-block" onClick={handleCopyLineText} style={{ padding: '14px', fontSize: '1rem' }}>
          <Copy size={20} /> 複製 LINE 文字分帳報告
        </button>
      </div>
    </div>
  );
}
