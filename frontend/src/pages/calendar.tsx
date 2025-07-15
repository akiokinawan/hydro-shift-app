import React, { useEffect, useState } from "react";
import { fetchSchedules } from "../lib/api";
import Link from "next/link";
import { useAuth } from '../hooks/useAuth';
import { registerOrUnregisterDuty } from '../lib/api';

const fieldId = 1; // 仮: 畑ID固定
const today = new Date();
const yyyyMM = today.toISOString().slice(0, 7);

function getMonthMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const matrix: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay.getDay()).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(d);
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }
  return matrix;
}

function getCurrentWeekMatrix(year: number, month: number, date: number) {
  // 今週の日曜～土曜の日付配列を返す
  const current = new Date(year, month, date);
  const dayOfWeek = current.getDay();
  const weekStart = new Date(year, month, date - dayOfWeek);
  const week: (number | null)[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    if (d.getMonth() === month) {
      week.push(d.getDate());
    } else {
      week.push(null);
    }
  }
  return [week];
}

const CalendarPage: React.FC = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'month' | 'week'>('month');
  // 自分の当番日（数字配列、例: [3, 10, 21]）
  const [myDutyDates, setMyDutyDates] = useState<number[]>([]);
  // 登録候補
  const [registerDates, setRegisterDates] = useState<number[]>([]);
  // 解除候補
  const [unregisterDates, setUnregisterDates] = useState<number[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [registerLoading, setRegisterLoading] = useState(false);
  const [unregisterLoading, setUnregisterLoading] = useState(false);

  // スケジュールを取得（現在の月のみ）
  useEffect(() => {
    setLoading(true);
    const year = today.getFullYear();
    const month = today.getMonth();
    const yyyyMM = `${year}-${String(month + 1).padStart(2, '0')}`;
    fetchSchedules(fieldId, yyyyMM)
      .then((s) => {
        setSchedules(s);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // schedules取得後、ログインユーザーの当番日をmyDutyDatesに反映
  useEffect(() => {
    if (!user) return;
    const myDates = schedules
      .filter((sch) => sch.user_id === user.id)
      .map((sch) => {
        const d = new Date(sch.date);
        return d.getDate();
      });
    setMyDutyDates(myDates);
  }, [schedules, user]);

  // 他のユーザーが登録済みの日を取得
  const getOtherUserDutyDates = () => {
    if (!user) return [];
    return schedules
      .filter((sch) => sch.user_id !== user.id)
      .map((sch) => {
        const d = new Date(sch.date);
        return d.getDate();
      });
  };

  // 指定日の当番ユーザー名を取得
  const getDutyUserName = (day: number) => {
    const targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const schedule = schedules.find(sch => sch.date === targetDate);
    return schedule ? schedule.user.name : null;
  };

  // 指定日の当番ユーザーIDを取得
  const getDutyUserId = (day: number) => {
    const targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const schedule = schedules.find(sch => sch.date === targetDate);
    return schedule ? schedule.user_id : null;
  };

  // ユーザーごとの色を定義
  const getUserColor = (userId: number) => {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];
    return colors[userId % colors.length];
  };

  // 他のユーザーの当番情報を取得（凡例用）
  const getOtherUserDuties = () => {
    if (!user) return [];
    const otherDuties = schedules
      .filter((sch) => sch.user_id !== user.id)
      .map((sch) => ({
        userId: sch.user_id,
        userName: sch.user.name,
        date: new Date(sch.date).getDate()
      }));
    
    // ユーザーごとにグループ化
    const userGroups = otherDuties.reduce((acc, duty) => {
      if (!acc[duty.userId]) {
        acc[duty.userId] = {
          userId: duty.userId,
          userName: duty.userName,
          dates: []
        };
      }
      acc[duty.userId].dates.push(duty.date);
      return acc;
    }, {} as Record<number, { userId: number; userName: string; dates: number[] }>);
    
    return Object.values(userGroups);
  };

  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const date = today.getDate();
  const monthMatrix = getMonthMatrix(year, month);
  const weekMatrix = getCurrentWeekMatrix(year, month, date);

  if (loading) return <main style={{ padding: 32 }}>読み込み中...</main>;
  if (error) return <main style={{ padding: 32, color: 'red' }}>エラー: {error}</main>;

  return (
    <main style={{ padding: '16px', maxWidth: '100%', overflowX: 'hidden' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px', textAlign: 'center' }}>カレンダー</h1>
      
      <div style={{ maxWidth: '600px', margin: '0 auto 16px', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        <button onClick={() => setTab('month')} style={{ padding: '6px 20px', borderRadius: 8, border: tab === 'month' ? '2px solid #1976d2' : '1px solid #ccc', background: tab === 'month' ? '#1976d2' : '#f5f5f5', color: tab === 'month' ? '#fff' : '#333', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>月カレンダー</button>
        <button onClick={() => setTab('week')} style={{ padding: '6px 20px', borderRadius: 8, border: tab === 'week' ? '2px solid #1976d2' : '1px solid #ccc', background: tab === 'week' ? '#1976d2' : '#f5f5f5', color: tab === 'week' ? '#fff' : '#333', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>週カレンダー</button>
      </div>
      <div style={{ maxWidth: '600px', margin: '0 auto 32px', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: '12px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', fontWeight: 600, marginBottom: 8 }}>
          {year}年 {month + 1}月
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fafafa', minWidth: '280px' }}>
          <thead>
            <tr>
              {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
                <th key={w} style={{ 
                  padding: '4px 2px', 
                  color: '#fff', 
                  fontWeight: 500, 
                  fontSize: '12px',
                  background: '#adb5bd'
                }}>{w}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(tab === 'month' ? monthMatrix : weekMatrix).map((week, i) => (
              <tr key={i}>
                {week.map((d, j) => {
                  let color = '#222';
                  if (d === date) {
                    color = '#fff';
                  } else if (j === 0) {
                    color = '#e53935'; // 日曜
                  } else if (j === 6) {
                    color = '#1976d2'; // 土曜
                  }
                  // 当番登録済みかどうか
                  const isMyDuty = d ? myDutyDates.includes(d) : false;
                  // 他のユーザーが登録済みかどうか
                  const isOtherUserDuty = d ? getOtherUserDutyDates().includes(d) : false;
                  // 登録候補か
                  const isRegister = d ? registerDates.includes(d) : false;
                  // 解除候補か
                  const isUnregister = d ? unregisterDates.includes(d) : false;
                  // 過去日かどうか
                  const isPast = d ? (new Date(year, month, d) < new Date(year, month, date)) : false;
                  
                  let bg = 'transparent';
                  if (d === date) bg = '#1976d2';
                  else if (isMyDuty && isUnregister) bg = '#ffcdd2'; // 解除候補:薄赤
                  else if (isMyDuty) bg = '#ffe082'; // 登録済み:黄色
                  else if (isRegister) bg = '#fff9c4'; // 登録候補:薄黄色
                  return (
                    <td
                      key={j}
                      style={{
                        padding: 0,
                        height: '40px',
                        minHeight: '40px',
                        textAlign: 'center',
                        background: bg,
                        color,
                        borderRadius: d === date ? 8 : 0,
                        fontWeight: d === date ? 700 : 400,
                        border: '1px solid #eee',
                        position: 'relative',
                        cursor: d && !isPast && !isOtherUserDuty ? 'pointer' : 'not-allowed',
                        opacity: d ? (isPast ? 0.4 : 1) : 0.3,
                        transition: 'background 0.2s',
                      }}
                      onClick={() => {
                        if (!d || isPast || isOtherUserDuty) return;
                        if (isMyDuty) {
                          // 解除候補トグル
                          setUnregisterDates((prev) =>
                            prev.includes(d)
                              ? prev.filter((x) => x !== d)
                              : [...prev, d]
                          );
                        } else {
                          // 登録候補トグル
                          setRegisterDates((prev) =>
                            prev.includes(d)
                              ? prev.filter((x) => x !== d)
                              : [...prev, d]
                          );
                        }
                      }}
                    >
                      {d ? (
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '12px', background: d === date ? '#1976d2' : 'transparent', color: d === date ? '#fff' : color, fontWeight: d === date ? 700 : 500 }}>
                          <div style={{ fontSize: '12px', lineHeight: 1, marginBottom: isOtherUserDuty ? 2 : 0 }}>{d}</div>
                          {isOtherUserDuty && (
                            <span style={{ 
                              color: getUserColor(getDutyUserId(d)!),
                              fontSize: 6,
                              lineHeight: 1
                            }}>
                              ●
                            </span>
                          )}
                        </div>
                      ) : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ maxWidth: '600px', margin: '0 auto', marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px' }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: 8, fontWeight: 500, textAlign: 'center' }}>水かけ当番日: {myDutyDates.length === 0 ? '未登録' : myDutyDates.sort((a,b)=>a-b).join(', ')}日</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={async () => {
              if (!user) return;
              setRegisterLoading(true);
              try {
                for (const d of registerDates) {
                                  await registerOrUnregisterDuty({
                  user_id: user.id,
                  field_id: fieldId,
                  date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                  action: 'register',
                });
                }
                setMyDutyDates((prev) => Array.from(new Set([...prev, ...registerDates])));
                setRegisterDates([]);
              } catch (e) {
                alert('登録に失敗しました');
              } finally {
                setRegisterLoading(false);
              }
            }}
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
            onClick={async () => {
              if (!user) return;
              setUnregisterLoading(true);
              try {
                for (const d of unregisterDates) {
                                  await registerOrUnregisterDuty({
                  user_id: user.id,
                  field_id: fieldId,
                  date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                  action: 'unregister',
                });
                }
                setMyDutyDates((prev) => prev.filter((x) => !unregisterDates.includes(x)));
                setUnregisterDates([]);
              } catch (e) {
                alert('解除に失敗しました');
              } finally {
                setUnregisterLoading(false);
              }
            }}
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
      
      {/* 凡例 */}
      {getOtherUserDuties().length > 0 && (
        <div style={{ maxWidth: '600px', margin: '0 auto 20px', padding: '16px', background: '#f9f9f9', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '14px' }}>他のユーザーの当番</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {getOtherUserDuties().map((userDuty) => (
              <div key={userDuty.userId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ 
                  color: getUserColor(userDuty.userId),
                  fontSize: 12,
                  fontWeight: 'bold'
                }}>
                  ●
                </span>
                <span style={{ fontSize: 12, color: '#666' }}>
                  {userDuty.userName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <ul>
        {schedules.map((sch) => (
          <li key={sch.id}>
            <Link href={`/schedule/${sch.id}`}>{sch.date}：{sch.user.name}（{sch.status}）</Link>
          </li>
        ))}
      </ul>
      <ul>
      </ul>
    </main>
  );
};

export default CalendarPage; 