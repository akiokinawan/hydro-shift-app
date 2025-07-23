import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchWeather, fetchFieldById, createHistory, updateSchedule, fetchHistories, updateHistory } from "../lib/api";
import { useAuth } from '../hooks/useAuth';
import { useSchedules } from '../hooks/useSchedules'; // useSchedulesをインポート
import { useRouter } from 'next/router';

const fieldId = 1; // 仮: 畑ID固定
const today = new Date();
const yyyyMM = today.toISOString().slice(0, 7);
const yyyyMMdd = today.toISOString().slice(0, 10);

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // SWRを使ってスケジュールデータを取得
  const { schedules, isLoading: schedulesLoading, isError: schedulesError, mutateSchedules } = useSchedules(user ? fieldId : null, yyyyMM);

  const [weather, setWeather] = useState<any>(null);
  const [field, setField] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('完了'); // ステータス管理用のstateを追加
  const isAdmin = user?.role === 'admin';

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // 天気と畑の情報を取得 (スケジュールとは分離)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchWeather(fieldId, yyyyMMdd),
      fetchFieldById(fieldId)
    ])
      .then(([w, f]) => {
        setWeather(w);
        setField(f);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <main style={{ padding: 32 }}>認証チェック中...</main>;
  if (!user) return null;
  if (schedulesLoading || loading) return <main style={{ padding: 32 }}>読み込み中...</main>;
  if (schedulesError || error) return <main style={{ padding: 32, color: 'red' }}>エラー: {schedulesError?.message || error}</main>;

  const todaySchedule = schedules?.find((sch) => sch.date === yyyyMMdd);
  const isMyDuty = todaySchedule && user && todaySchedule.user_id === user.id;
  const isCompleted = todaySchedule && todaySchedule.status === '完了';
  const isSkipped = todaySchedule && todaySchedule.status === 'スキップ'; // スキップ状態を追加
  
  // デバッグ用: 現在の状態をログ出力
  console.log('現在の状態:', {
    todaySchedule,
    isMyDuty,
    user: user?.id,
    scheduleStatus: todaySchedule?.status,
    isCompleted,
    isSkipped
  });

  // 水かけ完了/スキップ処理
  const handleCompleteDuty = async (status: string, commentText: string) => {
    if (!todaySchedule || !user) {
      console.log('処理中止: todayScheduleまたはuserが存在しません', { todaySchedule, user });
      return;
    }
    
    setCompletionLoading(true);
    
    try {
      // 既存の履歴を検索
      const existingHistories = await fetchHistories(todaySchedule.id, user.id);
      const existingHistory = existingHistories.length > 0 ? existingHistories[0] : null;

      if (existingHistory) {
        // 履歴が既に存在する場合は更新
        await updateHistory(existingHistory.id, {
          executed_at: new Date().toISOString(),
          status: status,
          comment: commentText
        });
      } else {
        // 履歴が存在しない場合は新規作成
        await createHistory({
          schedule_id: todaySchedule.id,
          user_id: user.id,
          executed_at: new Date().toISOString(),
          status: status,
          comment: commentText
        });
      }
      
      // スケジュールを更新
      await updateSchedule(todaySchedule.id, {
        status: status, // 引数のstatusを使用
      });
      
      // SWRのキャッシュを更新してUIに即時反映
      mutateSchedules();

      closeCommentModal(); // モーダルを閉じる
    } catch (err) {
      console.error('水かけ処理エラー:', err);
    } finally {
      setCompletionLoading(false);
    }
  };

  // コメント入力モーダルを開く
  const openCommentModal = () => {
    setShowCommentModal(true);
  };

  // コメント入力モーダルを閉じる
  const closeCommentModal = () => {
    setShowCommentModal(false);
    setComment('');
    setSelectedStatus('完了'); // モーダルを閉じるときにステータスをリセット
  };

  // コメント付きで完了処理を実行
  const handleCompleteWithComment = () => {
    handleCompleteDuty(selectedStatus, comment || (selectedStatus === '完了' ? '水かけ完了' : 'スキップしました'));
  };


  // 完了状態を判定
  const getCompletionStatus = () => {
    if (!todaySchedule) return null;
    return todaySchedule.status;
  };

  // 水かけ判定ロジック
  const getWateringJudgment = () => {
    if (!weather) return { status: '判定不可', color: '#666666' };
    
    const { rain_mm, pop } = weather;
    
    // 降水確率が70%以上 → 水やり不要
    if (pop >= 70) {
      return { status: '不要', color: '#4CAF50' };
    }
    
    // 降雨量が10mm以上 → 水やり不要
    if (rain_mm >= 10) {
      return { status: '不要', color: '#4CAF50' };
    }
    
    // 降雨量が0mm未満（エラー） → 判定不可
    if (rain_mm < 0) {
      return { status: '判定不可', color: '#666666' };
    }
    
    // 降雨量が0mm かつ 降水確率が50%以上 → 水やり検討
    if (rain_mm === 0 && pop >= 50) {
      return { status: '検討', color: '#FF9800' };
    }
    
    // 降雨量が0mm かつ 降水確率が30%以上 → 水やり検討
    if (rain_mm === 0 && pop >= 30) {
      return { status: '検討', color: '#FF9800' };
    }
    
    // 降雨量が0mm → 水やり推奨
    if (rain_mm === 0) {
      return { status: '推奨', color: '#F44336' };
    }
    
    // 降雨量が3mm未満 → 水やり推奨
    if (rain_mm < 3) {
      return { status: '推奨', color: '#F44336' };
    }
    
    // 降雨量が10mm未満 → 水やり検討
    if (rain_mm < 10) {
      return { status: '検討', color: '#FF9800' };
    }
    
    // その他の場合（降雨量10mm以上） → 必要
    return { status: '必要', color: '#F44336' };
  };

  return (
    <main style={{ padding: 32 }}>
      <h1>ダッシュボード</h1>
      
      {/* 今日の情報 */}
      <div style={{ background: '#f5f5f5', color: '#333', padding: 24, borderRadius: 12, marginBottom: 30, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1976d2', marginTop: 0, marginBottom: 16 }}>今日の情報</h2>
        <div style={{ fontWeight: 500, fontSize: 18, marginBottom: 16 }}>
          {field && (
            <>
              <div>{field.name}</div>
              <div style={{ color: '#666', fontSize: 15 }}>{field.location_text}</div>
            </>
          )}
        </div>
        
        <div className="today-info-grid">
          <div style={{ background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>本日の当番</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>
                {todaySchedule ? (todaySchedule.user.name.length > 5 ? todaySchedule.user.name.slice(0, 5) + '...' : todaySchedule.user.name) : '未定'}
              </div>
              {todaySchedule && (
                <>
                  {isMyDuty ? (
                    !isCompleted && !isSkipped ? (
                      <button
                        onClick={openCommentModal}
                        disabled={completionLoading}
                        style={{
                          background: completionLoading ? '#ccc' : '#1976d2',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 6,
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: completionLoading ? 'default' : 'pointer',
                          opacity: completionLoading ? 0.6 : 1
                        }}
                      >
                        {completionLoading ? '処理中...' : '実施報告'}
                      </button>
                    ) : (
                      <div style={{
                        background: isCompleted ? '#E8F5E8' : '#f5f5f5',
                        color: isCompleted ? '#2E7D32' : '#757575',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 500
                      }}>
                        {todaySchedule.status}
                      </div>
                    )
                  ) : (
                    <div style={{
                      background: isCompleted ? '#E8F5E8' : (isSkipped ? '#f5f5f5' : '#FFF3E0'),
                      color: isCompleted ? '#2E7D32' : (isSkipped ? '#757575' : '#F57C00'),
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 500
                    }}>
                      {getCompletionStatus()}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div style={{ background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>水かけ判定</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: getWateringJudgment().color }}>
              {getWateringJudgment().status}
            </div>
          </div>
        </div>

        {/* 天気情報 */}
        {weather && (
          <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ color: '#1976d2', margin: 0, fontSize: 18 }}>現在の天気</h3>
              <a 
                href="https://weather.yahoo.co.jp/weather/"
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  background: '#1976d2',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: 20,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#1565c0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#1976d2'}
              >
                📊 詳細を見る
              </a>
            </div>
            
            <div className="weather-info-row">
              <div style={{ flex: 1, marginRight: 20 }}>
                {weather.icon && (
                  <div style={{ background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: 84, height: 84, minWidth: 84, minHeight: 84, maxWidth: 84, maxHeight: 84, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} 
                      alt="天気アイコン" 
                      style={{ width: 60, height: 60, display: 'block' }} 
                    />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 4, color: '#333' }}>
                  {weather.temperature !== undefined ? `${Math.floor(weather.temperature * 10) / 10}°C` : '-'}
                </div>
                <div style={{ fontSize: 14, color: '#666' }}>
                  湿度: {weather.humidity !== undefined ? `${weather.humidity}%` : '-'}
                </div>
              </div>
            </div>
            
            <div className="weather-stats-grid">
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>今日の降雨量</div>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{weather.rain_mm !== undefined ? `${(Math.floor(weather.rain_mm * 100) / 100).toFixed(2)}` : '-'} mm</div>
              </div>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>降水確率</div>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{weather.pop !== undefined ? `${Math.floor(weather.pop)}%` : '-'}</div>
              </div>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>天気</div>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{weather.weather || '-'}</div>
              </div>
            </div>
            
            {/* 判定理由の表示 */}
            <div style={{ background: '#f0f8ff', padding: 12, borderRadius: 6, borderLeft: `4px solid ${getWateringJudgment().color}` }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>判定理由</div>
              <div style={{ fontSize: 14, color: '#333' }}>
                {(() => {
                  const { rain_mm, pop } = weather;
                  const popInt = Math.floor(pop || 0);
                  const rainFormatted = rain_mm !== undefined ? (Math.floor(rain_mm * 100) / 100).toFixed(2) : '0.00';
                  if (popInt >= 70) {
                    return `降水確率${popInt}%で水やり不要`;
                  } else if (rain_mm >= 10) {
                    return `今日の降雨量${rainFormatted}mmで十分な水分補給`;
                  } else if (rain_mm === 0 && popInt >= 50) {
                    return `今日の降雨量${rainFormatted}mm、降水確率${popInt}%で水やり検討`;
                  } else if (rain_mm === 0 && popInt >= 30) {
                    return `今日の降雨量${rainFormatted}mm、降水確率${popInt}%で水やり検討`;
                  } else if (rain_mm === 0) {
                    return `今日の降雨量${rainFormatted}mmで水やり推奨`;
                  } else if (rain_mm < 3) {
                    return `今日の降雨量${rainFormatted}mmで水やり推奨`;
                  } else if (rain_mm < 10) {
                    return `今日の降雨量${rainFormatted}mmで水やり検討`;
                  } else {
                    return `今日の降雨量${rainFormatted}mmで水やり必要`;
                  }
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ナビゲーションボタン */}
      <h2>メニュー</h2>
      <div className="button-grid">
        <Link href="/calendar" className="button-card">
          <div className="button-card-icon">📅</div>
          <h3>カレンダー</h3>
          <p>当番スケジュールの確認・管理</p>
        </Link>
        
        <Link href="/history" className="button-card">
          <div className="button-card-icon">📋</div>
          <h3>履歴</h3>
          <p>水かけ実施履歴の確認</p>
        </Link>
        
        <Link href="/settings" className="button-card">
          <div className="button-card-icon">🚜</div>
          <h3>畑の情報</h3>
          <p>畑情報・図面の管理</p>
        </Link>
        
        {isAdmin ? (
          <Link href="/users" className="button-card">
            <div className="button-card-icon">👥</div>
            <h3>ユーザー管理</h3>
            <p>ユーザーの追加・権限管理</p>
          </Link>
        ) : (
          <Link href="/profile" className="button-card">
            <div className="button-card-icon">👤</div>
            <h3>マイページ</h3>
            <p>個人情報・設定の管理</p>
          </Link>
        )}
      </div>
      
      {/* コメント入力モーダル */}
      {showCommentModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1976d2' }}>実施報告</h3>
            
            {/* ステータス選択プルダウン */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, color: '#666', marginBottom: 8 }}>
                ステータス
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  background: 'white'
                }}
              >
                <option value="完了">完了</option>
                <option value="スキップ">スキップ</option>
              </select>
            </div>

            {/* コメント入力 */}
            <div>
              <label style={{ display: 'block', fontSize: 14, color: '#666', marginBottom: 8 }}>
                コメント（任意）
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={selectedStatus === '完了' ? "例: 全体にたっぷり水をかけた" : "例: 雨が降っていたため不要と判断"}
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  resize: 'vertical',
                  marginBottom: 16
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={closeCommentModal}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '10px 20px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleCompleteWithComment}
                disabled={completionLoading}
                style={{
                  background: completionLoading ? '#ccc' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: completionLoading ? 'default' : 'pointer',
                  opacity: completionLoading ? 0.6 : 1
                }}
              >
                {completionLoading ? '処理中...' : '報告する'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .today-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .weather-info-row {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }
        .weather-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        @media (max-width: 450px) {
          .today-info-grid {
            grid-template-columns: 1fr;
          }
          .weather-info-row {
            flex-direction: row !important;
            align-items: center;
          }
          .weather-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
};

export default Dashboard; 