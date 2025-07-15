import React, { useEffect, useState } from "react";
import { fetchHistories } from "../lib/api";
import { useAuth } from '../hooks/useAuth';

const HistoryPage: React.FC = () => {
  const [histories, setHistories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  
  // カレンダー表示用の状態
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getFullYear() * 100 + new Date().getMonth() + 1);

  // 履歴を取得
  useEffect(() => {
    setLoading(true);
    fetchHistories()
      .then((h) => {
        console.log('取得した履歴データ:', h);
        setHistories(h);
        setError(null);
      })
      .catch((e) => {
        console.error('履歴取得エラー:', e);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main style={{ padding: 32 }}>読み込み中...</main>;
  if (error) return <main style={{ padding: 32, color: 'red' }}>エラー: {error}</main>;

  // 月の行列を生成する関数
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

  // ユーザーごとの色を定義
  const getUserColor = (userId: number) => {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];
    return colors[userId % colors.length];
  };

  // 指定日の履歴を取得
  const getHistoriesForDate = (year: number, month: number, day: number) => {
    // month: 0始まり
    return histories.filter(h => {
      try {
        const historyDate = new Date(h.executed_at);
        if (isNaN(historyDate.getTime())) {
          console.warn('無効な日付:', h.executed_at);
          return false;
        }
        return (
          historyDate.getFullYear() === year &&
          historyDate.getMonth() === month &&
          historyDate.getDate() === day
        );
      } catch (error) {
        console.error('日付処理エラー:', error, h);
        return false;
      }
    });
  };

  // 月を変更する関数
  const changeMonth = (direction: 'prev' | 'next') => {
    const year = Math.floor(selectedMonth / 100);
    const month = selectedMonth % 100 - 1; // 0-indexed
    
    let newYear = year;
    let newMonth = month;
    
    if (direction === 'prev') {
      if (month === 0) {
        newYear = year - 1;
        newMonth = 11;
      } else {
        newMonth = month - 1;
      }
    } else {
      if (month === 11) {
        newYear = year + 1;
        newMonth = 0;
      } else {
        newMonth = month + 1;
      }
    }
    
    setSelectedMonth(newYear * 100 + newMonth + 1);
  };

  const year = Math.floor(selectedMonth / 100);
  const month = selectedMonth % 100 - 1; // 0-indexed
  
  // デバッグ用：月の計算を確認
  console.log('月の計算デバッグ:', {
    selectedMonth,
    year,
    month,
    currentDate: new Date().toISOString(),
    expectedMonth: new Date().getMonth()
  });
  const monthMatrix = getMonthMatrix(year, month);
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <main style={{ padding: '8px', maxWidth: '100%', overflowX: 'hidden' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '12px', textAlign: 'center' }}>履歴カレンダー</h1>
      
      {/* 月切り替えボタン */}
      <div style={{ maxWidth: '600px', margin: '0 auto 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => changeMonth('prev')}
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
        <div style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '90px', textAlign: 'center' }}>
          {year}年 {month + 1}月
        </div>
        <button
          onClick={() => changeMonth('next')}
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

      {/* カレンダー */}
      <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: '8px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fafafa', minWidth: '280px' }}>
          <thead>
            <tr>
              {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
                <th key={w} style={{ 
                  padding: '8px 2px', 
                  color: '#fff', 
                  fontWeight: 500, 
                  borderBottom: '1px solid #ddd', 
                  fontSize: '14px',
                  background: '#adb5bd'
                }}>{w}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthMatrix.map((week, i) => (
              <tr key={i}>
                {week.map((d, j) => {
                  const isToday = isCurrentMonth && d === today.getDate();
                  const isPast = d ? (new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate())) : false;
                  const isFuture = d ? (new Date(year, month, d) > new Date(today.getFullYear(), today.getMonth(), today.getDate())) : false;
                  
                  // その日の履歴を取得
                  const dayHistories = d ? getHistoriesForDate(year, month, d) : [];
                  const completedHistories = dayHistories.filter(h => h.status === '完了');
                  const incompleteHistories = dayHistories.filter(h => h.status === '未完了');
                  
                  let bg = 'transparent';
                  if (isToday) bg = '#1976d2';
                  else if (completedHistories.length > 0) bg = '#E8F5E8';
                  else if (incompleteHistories.length > 0) bg = '#FFF3E0';
                  
                  return (
                    <td
                      key={j}
                      style={{
                        padding: '6px 2px',
                        height: '70px',
                        minHeight: '70px',
                        width: '14.28%',
                        maxWidth: '14.28%',
                        textAlign: 'center',
                        background: bg,
                        border: '1px solid #eee',
                        verticalAlign: 'top',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {d && (
                        <>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: isToday ? 700 : 500,
                            color: isToday ? '#fff' : (j === 0 ? '#e53935' : j === 6 ? '#1976d2' : '#333'),
                            marginBottom: '3px'
                          }}>
                            {d}
                          </div>
                          
                          {/* 履歴表示 */}
                          {dayHistories.length > 0 && (
                            <div style={{ 
                              fontSize: '10px', 
                              lineHeight: 1.1,
                              maxWidth: '100%',
                              width: '100%',
                              overflow: 'hidden',
                              boxSizing: 'border-box'
                            }}>
                              {completedHistories.map((h, idx) => (
                                <div key={idx} style={{
                                  background: getUserColor(h.user_id),
                                  color: 'white',
                                  padding: '2px 3px',
                                  borderRadius: 3,
                                  marginBottom: 2,
                                  fontSize: '8px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}>
                                  {h.user_name || `ID:${h.user_id}`}
                                </div>
                              ))}
                              {incompleteHistories.map((h, idx) => (
                                <div key={idx} style={{
                                  background: getUserColor(h.user_id),
                                  color: 'white',
                                  padding: '2px 3px',
                                  borderRadius: 3,
                                  marginBottom: 2,
                                  fontSize: '8px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%',
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  opacity: 0.7
                                }}>
                                  {h.user_name || `ID:${h.user_id}`} (未完了)
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div style={{ maxWidth: '600px', margin: '16px auto', padding: '12px', background: '#f9f9f9', borderRadius: 8 }}>
        <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: '14px', textAlign: 'center' }}>凡例</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, background: '#1976d2', borderRadius: 3 }}></div>
            <span style={{ fontSize: '12px' }}>今日</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, background: '#E8F5E8', borderRadius: 3 }}></div>
            <span style={{ fontSize: '12px' }}>水かけ完了</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, background: '#FFF3E0', borderRadius: 3 }}></div>
            <span style={{ fontSize: '12px' }}>水かけ未完了</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <a href="/" style={{ color: '#1976d2', textDecoration: 'none' }}>ダッシュボードへ戻る</a>
      </div>
    </main>
  );
}

export default HistoryPage; 