import React, { useEffect, useState } from "react";
import { fetchSchedules } from "../lib/api";
import Link from "next/link";
import { useAuth } from '../hooks/useAuth';
import { registerOrUnregisterDuty } from '../lib/api';

const fieldId = 1; // 仮: 畑ID固定
const today = new Date();
const yyyyMM = today.toISOString().slice(0, 7);

// 今日の日付を取得する関数
const getTodayDate = () => {
  const now = new Date();
  return now.getDate();
};

// 今日の年を取得する関数
const getTodayYear = () => {
  const now = new Date();
  return now.getFullYear();
};

// 今日の月を取得する関数
const getTodayMonth = () => {
  const now = new Date();
  return now.getMonth();
};

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

const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
const weekDaysMondayStart = ["月", "火", "水", "木", "金", "土", "日"];

function getCurrentWeekMatrixMondayStart(year: number, month: number, date: number) {
  // 今週の月曜～日曜の日付配列を返す
  const current = new Date(year, month, date);
  const dayOfWeek = (current.getDay() + 6) % 7; // 月曜=0, 日曜=6
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
  const [isMobile, setIsMobile] = useState(false);
  const [currentDate, setCurrentDate] = useState(today);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // スケジュールを取得（現在の月のみ）
  useEffect(() => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const yyyyMM = `${year}-${String(month + 1).padStart(2, '0')}`;
    fetchSchedules(fieldId, yyyyMM)
      .then((s) => {
        setSchedules(s);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentDate]);

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

  // ユーザーごとの色を定義（明るい単色）
  const getUserColor = (userId: number) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45D1DD', '#96B4D8', '#FFEAA7', '#DDA0DD', '#98D8DC', '#6F42C1'];
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); //0dexed
  const date = currentDate.getDate();
  const monthMatrix = getMonthMatrix(year, month);
  // 週カレンダーでは、今月の場合は今日の週、次月の場合はその月の1週目を表示
  const todayYear = getTodayYear();
  const todayMonth = getTodayMonth();
  const todayDate = getTodayDate();
  let weekMatrix;
  if (tab === 'week') {
    if (year === todayYear && month === todayMonth) {
      weekMatrix = getCurrentWeekMatrixMondayStart(todayYear, todayMonth, todayDate);
    } else {
      weekMatrix = getCurrentWeekMatrixMondayStart(year, month, 1);
    }
  } else {
    weekMatrix = getMonthMatrix(year, month);
  }

  if (loading) return <main style={{ padding: 32 }}>読み込み中...</main>;
  if (error) return <main style={{ padding: 32, color: 'red' }}>エラー: {error}</main>;

  return (
    <main style={{ padding: '16px', maxWidth: '100%', overflowX: 'hidden' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px', textAlign: 'center' }}>カレンダー</h1>
      
      {/* 月切り替えボタン */}
      <div style={{ maxWidth: '600px', margin: '0 auto 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* 今月以外の場合は前月ボタンを表示 */}
        {(year > getTodayYear() || (year === getTodayYear() && month > getTodayMonth())) && (
          <button
            onClick={() => {
              // 前月へ（年・月補正）
              let newYear = year;
              let newMonth = month - 1;
              if (newMonth < 0) {
                newYear -= 1;
                newMonth = 11;
              }
              const newDate = new Date(newYear, newMonth, 1);
              setCurrentDate(newDate);
            }}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: '#f0f0f0',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#000',
              borderRadius: '6px',
              minWidth: '70px',
              touchAction: 'manipulation'
            }}
          >
            ＜ 前月
          </button>
        )}
        <div style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '90px', textAlign: 'center' }}>
          {year}年 {month + 1}月
        </div>
        <button
          onClick={() => {
            // 次月へ（年・月補正）
            let newYear = year;
            let newMonth = month + 1;
            if (newMonth > 11) {
              newYear += 1;
              newMonth = 0;
            }
            const newDate = new Date(newYear, newMonth, 1);
            setCurrentDate(newDate);
          }}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: '#f0f0f0',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#000',
            borderRadius: '6px',
            minWidth: '70px',
            touchAction: 'manipulation'
          }}
        >
          次月 ＞
        </button>
      </div>
      
      <div style={{ maxWidth: '600px', margin: '0 auto 16px', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        <button onClick={() => setTab('month')} style={{ padding: '6px 20px', borderRadius: 8, border: tab === 'month' ? '2px solid #1976d2' : '1px solid #ccc', background: tab === 'month' ? '#1976d2' : '#f5f5f5', color: tab === 'month' ? '#fff' : '#333', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>月カレンダー</button>
        <button onClick={() => setTab('week')} style={{ padding: '6px 20px', borderRadius: 8, border: tab === 'week' ? '2px solid #1976d2' : '1px solid #ccc', background: tab === 'week' ? '#1976d2' : '#f5f5f5', color: tab === 'week' ? '#fff' : '#333', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>週カレンダー</button>
      </div>
      <div style={{ maxWidth: '600px', margin: '0 auto 32px', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: '12px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', fontWeight: 600, marginBottom: 8 }}>
          {year}年 {month + 1}月
        </div>
        {isMobile ? (
          // モバイル時はリスト形式
          <div>
            {(tab === 'month' ? monthMatrix : weekMatrix).flat().map((d, idx) => {
              if (!d) return null;
              // 曜日を計算
              const weekIndex = Math.floor(idx / 7);
              const dayIndex = idx % 7;
              const w = (tab === 'week' ? weekDaysMondayStart : weekDays)[dayIndex];
              // 週カレンダー時の色分け
              let weekColor = '#555';
              if (tab === 'week') {
                if (dayIndex === 6) weekColor = '#e53935'; // 日曜
                if (dayIndex === 5) weekColor = '#1976d2'; // 土曜
              } else {
                if (dayIndex === 0) weekColor = '#e53935'; // 日曜
                if (dayIndex === 6) weekColor = '#1976d2'; // 土曜
              }
              // 過去日は非表示（実際の今日の日付と比較）
              const isPast = (new Date(year, month, d) < new Date(getTodayYear(), getTodayMonth(), getTodayDate()));
              if (isPast) return null;
              // 担当者名取得
              const dutyUserName = getDutyUserName(d);
              const isMyDuty = myDutyDates.includes(d);
              const isOtherUserDuty = getOtherUserDutyDates().includes(d);
              const isRegister = registerDates.includes(d);
              const isUnregister = unregisterDates.includes(d);
              // 当日の判定（実際の今日の日付と比較）
              const isToday = (year === getTodayYear() && month === getTodayMonth() && d === getTodayDate());
              let bg = 'transparent';
              if (isToday) bg = '#1976d2';
              else if (isMyDuty && isUnregister) bg = '#ffcdd2';
              else if (isMyDuty) bg = '#ffe082';
              else if (isRegister) bg = '#fff9c4';
              return (
                <div key={d} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, background: bg, borderRadius: 6, padding: '6px 8px', border: '1px solid #eee', cursor: d ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
                  onClick={() => {
                    if (!d || isOtherUserDuty) return;
                    if (isMyDuty) {
                      setUnregisterDates((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
                    } else {
                      setRegisterDates((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
                    }
                  }}
                >
                  <span style={{ minWidth: 24, fontWeight: 600, color: weekColor, fontSize: 14 }}>{w}</span>
                  <span style={{ minWidth: 24, textAlign: 'center', fontWeight: isToday ? 700 : 500, color: isToday ? '#fff' : '#222', fontSize: 16, marginLeft: 8 }}>{d}</span>
                  {/* 担当者名表示（モバイルのみ） */}
                  {dutyUserName && (
                    <span style={{
                      marginLeft: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      color: isToday ? '#fff' : '#1976d2',
                      maxWidth: 120,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {dutyUserName}{isMyDuty ? '（あなた）' : ''}
                    </span>
                  )}
                  {isOtherUserDuty && (
                    <span style={{ color: getUserColor(getDutyUserId(d)!), fontSize:14, marginLeft: 6 }}>●</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // PC時は従来通りテーブル
          <table className="calendar-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#fafafa', minWidth: '280px' }}>
          <thead>
            <tr>
                {(tab === 'week' ? weekDaysMondayStart : weekDays).map((w, i) => {
                  let weekColor = '#fff';
                  if (tab === 'week') {
                    if (i === 6) weekColor = '#e53935'; // 日曜
                    if (i === 5) weekColor = '#1976d2'; // 土曜
                  } else {
                    if (i === 0) weekColor = '#e53935'; // 日曜
                    if (i === 6) weekColor = '#1976d2'; // 土曜
                  }
                  return (
                <th key={w} style={{ 
                  padding: '4px 2px', 
                      color: weekColor, 
                  fontWeight: 500, 
                  fontSize: '12px',
                  background: '#adb5bd'
                }}>{w}</th>
                  );
                })}
            </tr>
          </thead>
          <tbody>
            {(tab === 'month' ? monthMatrix : weekMatrix).map((week, i) => (
              <tr key={i}>
                {week.map((d, j) => {
                  let color = '#222';
                    if (tab === 'week') {
                      if (j === 6) color = '#e53935'; // 日曜
                      if (j === 5) color = '#1976d2'; // 土曜
                    } else {
                      if (j === 0) color = '#e53935'; // 日曜
                      if (j === 6) color = '#1976d2'; // 土曜
                    }
                  const isMyDuty = d ? myDutyDates.includes(d) : false;
                  const isOtherUserDuty = d ? getOtherUserDutyDates().includes(d) : false;
                  const isRegister = d ? registerDates.includes(d) : false;
                  const isUnregister = d ? unregisterDates.includes(d) : false;
                    const isPast = d ? (new Date(year, month, d) < new Date(getTodayYear(), getTodayMonth(), getTodayDate())) : false;
                    // 当日の判定（実際の今日の日付と比較）
                    const isToday = d ? (year === getTodayYear() && month === getTodayMonth() && d === getTodayDate()) : false;
                  let bg = 'transparent';
                    if (isToday) bg = '#1976d2';
                    else if (isMyDuty && isUnregister) bg = '#ffcdd2';
                    else if (isMyDuty) bg = '#ffe082';
                    else if (isRegister) bg = '#fff9c4';
                    // 担当者名取得
                    // const dutyUserName = d ? getDutyUserName(d) : null; // ← 担当者名はPC表示では出さない
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
                          borderRadius: isToday ? 8 : 0,
                          fontWeight: isToday ? 700 : 400,
                        border: '1px solid #eee',
                        position: 'relative',
                        cursor: d && !isPast && !isOtherUserDuty ? 'pointer' : 'not-allowed',
                        opacity: d ? (isPast ? 0.4 : 1) : 0.3,
                        transition: 'background 0.2s',
                      }}
                      onClick={() => {
                        if (!d || isPast || isOtherUserDuty) return;
                        if (isMyDuty) {
                          setUnregisterDates((prev) =>
                            prev.includes(d)
                              ? prev.filter((x) => x !== d)
                              : [...prev, d]
                          );
                        } else {
                          setRegisterDates((prev) =>
                            prev.includes(d)
                              ? prev.filter((x) => x !== d)
                              : [...prev, d]
                          );
                        }
                      }}
                    >
                      {d ? (
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '12px', background: isToday ? '#1976d2' : 'transparent', color: isToday ? '#fff' : color, fontWeight: isToday ? 700 : 500 }}>
                          <div style={{ fontSize: '12px', lineHeight: 1, marginBottom: isOtherUserDuty ? 2 : 0 }}>{d}</div>
                            {/* 担当者名表示はPC表示では出さない */}
                          {isOtherUserDuty && (
                            <span style={{ 
                              color: getUserColor(getDutyUserId(d)!),
                                fontSize: 8,
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
        )}
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
                // API後に再取得
                const yyyyMM = `${year}-${String(month + 1).padStart(2, '0')}`;
                const newSchedules = await fetchSchedules(fieldId, yyyyMM);
                setSchedules(newSchedules);
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
                // API後に再取得
                const yyyyMM = `${year}-${String(month + 1).padStart(2, '0')}`;
                const newSchedules = await fetchSchedules(fieldId, yyyyMM);
                setSchedules(newSchedules);
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
          <h4 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '14px' }}>担当者</h4>
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
      
      {/* ダッシュボードへのリンクをページ下部に配置 */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <a href="/" style={{ color: '#1976d2', textDecoration: 'none' }}>ダッシュボードへ戻る</a>
      </div>
    </main>
  );
};

export default CalendarPage; 