import React, { useEffect, useState } from "react";
import { useSchedules } from "../hooks/useSchedules";
import Link from "next/link";
import { useAuth } from '../hooks/useAuth';
import { registerOrUnregisterDuty } from '../lib/api';
import { useRouter } from 'next/router';

const fieldId = 1; // 仮: 畑ID固定
const today = new Date();

// (中略...ヘルパー関数は変更なし)

const CalendarPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(today);
  const yyyyMM = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const { schedules, isLoading, isError, mutateSchedules } = useSchedules(user ? fieldId : null, yyyyMM);

  const [tab, setTab] = useState<'month' | 'week'>('month');
  const [myDutyDates, setMyDutyDates] = useState<number[]>([]);
  const [registerDates, setRegisterDates] = useState<number[]>([]);
  const [unregisterDates, setUnregisterDates] = useState<number[]>([]);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [unregisterLoading, setUnregisterLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // (中略...useEffectやヘルパー関数は変更なし)

  // 登録ボタンのonClickハンドラ
  const handleRegister = async () => {
    if (!user) return;
    setRegisterLoading(true);
    try {
      for (const d of registerDates) {
        await registerOrUnregisterDuty({
          user_id: user.id,
          field_id: fieldId,
          date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          action: 'register',
        });
      }
      mutateSchedules(); // SWRのキャッシュを更新
      setRegisterDates([]);
    } catch (e) {
      alert('登録に失敗しました');
    } finally {
      setRegisterLoading(false);
    }
  };

  // 解除ボタンのonClickハンドラ
  const handleUnregister = async () => {
    if (!user) return;
    setUnregisterLoading(true);
    try {
      for (const d of unregisterDates) {
        await registerOrUnregisterDuty({
          user_id: user.id,
          field_id: fieldId,
          date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          action: 'unregister',
        });
      }
      mutateSchedules(); // SWRのキャッシュを更新
      setUnregisterDates([]);
    } catch (e) {
      alert('解除に失敗しました');
    } finally {
      setUnregisterLoading(false);
    }
  };

  // (中略...JSX部分は、登録・解除ボタンのonClickを上記ハンドラに変更する以外はほぼ同じ)

  return (
    <main style={{ padding: '16px', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* (中略...カレンダー表示部分) */}
      <div style={{ maxWidth: '600px', margin: '0 auto', marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px' }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: 8, fontWeight: 500, textAlign: 'center' }}>水かけ当番日: {myDutyDates.length === 0 ? '未登録' : myDutyDates.sort((a,b)=>a-b).join(', ')}日</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={handleRegister}
            disabled={registerDates.length === 0 || registerLoading || authLoading}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              background: registerDates.length === 0 || registerLoading || authLoading ? '#ccc' : '#1976d2',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: registerDates.length === 0 || registerLoading || authLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              letterSpacing: 1,
              boxShadow: registerDates.length === 0 ? 'none' : '0 2px 8px #e3e3e3',
              transition: 'background 0.2s',
              opacity: registerLoading ? 0.7 : 1,
              minWidth: '80px',
            }}
          >
            {registerLoading ? '登録中...' : '登録'}
          </button>
          <button
            onClick={handleUnregister}
            disabled={unregisterDates.length === 0 || unregisterLoading || authLoading}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              background: unregisterDates.length === 0 || unregisterLoading || authLoading ? '#ccc' : '#e53935',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: unregisterDates.length === 0 || unregisterLoading || authLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              letterSpacing: 1,
              boxShadow: unregisterDates.length === 0 ? 'none' : '0 2px 8px #f8d7da',
              transition: 'background 0.2s',
              opacity: unregisterLoading ? 0.7 : 1,
              minWidth: '80px',
            }}
          >
            {unregisterLoading ? '解除中...' : '解除'}
          </button>
        </div>
      </div>
      {/* (中略...凡例とフッター) */}
    </main>
  );
}; 

export default CalendarPage; 