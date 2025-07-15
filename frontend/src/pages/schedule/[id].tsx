import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { fetchScheduleById, fetchWeather, createHistory } from "../../lib/api";

const userId = 2; // 仮: ログインユーザーID固定

const ScheduleDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [schedule, setSchedule] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchScheduleById(Number(id))
      .then((s) => {
        setSchedule(s);
        if (s) {
          return fetchWeather(s.field_id, s.date).then(setWeather);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!schedule) return;
    setLoading(true);
    try {
      await createHistory({
        schedule_id: schedule.id,
        user_id: userId,
        executed_at: new Date().toISOString(),
        comment,
      });
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <main style={{ padding: 32 }}>読み込み中...</main>;
  if (error) return <main style={{ padding: 32, color: 'red' }}>エラー: {error}</main>;
  if (!schedule) return <main style={{ padding: 32 }}>スケジュールが見つかりません</main>;
  if (done) return <main style={{ padding: 32 }}>水かけ完了を登録しました</main>;

  return (
    <main style={{ padding: 32 }}>
      <h1>当番詳細</h1>
      <ul>
        <li>日付: {schedule.date}</li>
        <li>当番ユーザー: {schedule.user.name}</li>
        <li>天気: {weather ? weather.weather : '-'}</li>
        <li>降雨量: {weather ? weather.rain_mm + ' mm' : '-'}</li>
        <li>ステータス: {schedule.status}</li>
      </ul>
      <div>
        <textarea
          placeholder="コメントを入力"
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ width: 300, height: 60 }}
        />
      </div>
      <button onClick={handleSubmit} style={{ marginTop: 16 }}>水かけ完了</button>
      <div style={{ marginTop: 16 }}>
        <a href="/history">履歴一覧へ</a>
      </div>
    </main>
  );
};

export default ScheduleDetail; 