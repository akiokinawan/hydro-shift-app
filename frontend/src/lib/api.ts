/**
 * APIクライアント（fetchラッパー）
 * バックエンドAPIとの通信を管理するライブラリ
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
console.log('API_BASE:', API_BASE);

// ==================== 型定義 ====================

/**
 * ユーザー情報の型定義
 */
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at?: string;
}

/**
 * ユーザー作成時の型定義
 */
export interface UserCreate {
  name: string;
  email: string;
  role: string;
}

/**
 * ユーザー更新時の型定義
 */
export interface UserUpdate {
  name?: string;
  email?: string;
  role?: string;
  password?: string;
}

/**
 * 畑情報の型定義
 */
export interface Field {
  id: number;
  name: string;
  location_text: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

/**
 * 畑作成時の型定義
 */
export interface FieldCreate {
  name: string;
  location_text: string;
  latitude: number;
  longitude: number;
  image_url?: string;
}

/**
 * 畑更新時の型定義
 */
export interface FieldUpdate {
  name?: string;
  location_text?: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
}

/**
 * スケジュール情報の型定義
 */
export interface Schedule {
  id: number;
  field_id: number;
  date: string;
  user_id: number;
  status: string;
  comment?: string;
  user: { id: number; name: string };
  field: { id: number; name: string };
  created_at: string;
  updated_at?: string;
}

/**
 * スケジュール作成時の型定義
 */
export interface ScheduleCreate {
  field_id: number;
  date: string;
  user_id: number;
  status: string;
  comment?: string;
}

/**
 * スケジュール更新時の型定義
 */
export interface ScheduleUpdate {
  field_id?: number;
  date?: string;
  user_id?: number;
  status?: string;
  comment?: string;
}

/**
 * 履歴情報の型定義
 */
export interface History {
  id: number;
  schedule_id: number;
  user_id: number;
  executed_at: string;
  status: string;
  comment?: string;
  created_at: string;
  user_name: string;
  user?: { id: number; name: string };
}

/**
 * 履歴作成時の型定義
 */
export interface HistoryCreate {
  schedule_id: number;
  user_id: number;
  executed_at: string;
  status?: string;
  comment?: string;
}

/**
 * 履歴更新時の型定義
 */
export interface HistoryUpdate {
  executed_at?: string;
  status?: string;
  comment?: string;
}

/**
 * 天気情報の型定義
 */
export interface Weather {
  date: string;
  weather: string;
  rain_mm: number;
  pop?: number;  // 降水確率（パーセント）
  temperature?: number;
  humidity?: number;
}

// ==================== 共通関数 ====================

/**
 * レスポンスの共通エラーハンドリング
 * 
 * @param response - fetchレスポンス
 * @returns パースされたJSONデータ
 * @throws APIエラーが発生した場合
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  return response.json();
}

/**
 * JWT認証トークン付きのfetchラッパー
 * 
 * @param input - リクエスト情報
 * @param init - リクエスト初期化オプション
 * @returns fetchレスポンス
 */
async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      init.headers = {
        ...(init.headers || {}),
        'Authorization': `Bearer ${token}`,
      };
    }
  }
  return fetch(input, init);
}

// ==================== ユーザー関連API ====================

/**
 * ユーザー一覧を取得
 */
export async function fetchUsers(): Promise<User[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/users`);
  return handleResponse<User[]>(res);
}

/**
 * 指定IDのユーザーを取得
 */
export async function fetchUserById(userId: number): Promise<User> {
  const res = await fetchWithAuth(`${API_BASE}/api/users/${userId}`);
  return handleResponse<User>(res);
}

/**
 * ユーザーを作成
 */
export async function createUser(data: UserCreate): Promise<User> {
  const res = await fetchWithAuth(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<User>(res);
}

/**
 * ユーザーを更新
 */
export async function updateUser(userId: number, data: UserUpdate): Promise<User> {
  const res = await fetchWithAuth(`${API_BASE}/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<User>(res);
}

/**
 * ユーザーを削除
 */
export async function deleteUser(userId: number): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${API_BASE}/api/users/${userId}`, { method: 'DELETE' });
  return handleResponse<{ message: string }>(res);
}

// ==================== 畑関連API ====================

/**
 * 畑一覧を取得
 */
export async function fetchFields(): Promise<Field[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/fields`);
  return handleResponse<Field[]>(res);
}

/**
 * 指定IDの畑を取得
 */
export async function fetchFieldById(fieldId: number): Promise<Field> {
  const res = await fetchWithAuth(`${API_BASE}/api/fields/${fieldId}`);
  return handleResponse<Field>(res);
}

/**
 * 畑を作成
 */
export async function createField(data: FieldCreate, createdBy: number): Promise<Field> {
  const res = await fetchWithAuth(`${API_BASE}/api/fields?created_by=${createdBy}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Field>(res);
}

/**
 * 畑を更新
 */
export async function updateField(fieldId: number, data: FieldUpdate): Promise<Field> {
  const res = await fetchWithAuth(`${API_BASE}/api/fields/${fieldId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Field>(res);
}

/**
 * 畑を削除
 */
export async function deleteField(fieldId: number): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${API_BASE}/api/fields/${fieldId}`, { method: 'DELETE' });
  return handleResponse<{ message: string }>(res);
}

// ==================== スケジュール関連API ====================

/**
 * スケジュール一覧を取得
 * 
 * @param fieldId - 畑ID（フィルタ用）
 * @param month - 月指定（YYYY-MM形式）
 */
export async function fetchSchedules(fieldId?: number, month?: string): Promise<Schedule[]> {
  const params = new URLSearchParams();
  if (fieldId) params.append('field_id', fieldId.toString());
  if (month) params.append('month', month);
  
  const res = await fetchWithAuth(`${API_BASE}/api/schedules?${params.toString()}`);
  return handleResponse<Schedule[]>(res);
}

/**
 * 指定IDのスケジュールを取得
 */
export async function fetchScheduleById(scheduleId: number): Promise<Schedule> {
  const res = await fetchWithAuth(`${API_BASE}/api/schedules/${scheduleId}`);
  return handleResponse<Schedule>(res);
}

/**
 * スケジュールを作成
 */
export async function createSchedule(data: ScheduleCreate): Promise<Schedule> {
  const res = await fetchWithAuth(`${API_BASE}/api/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Schedule>(res);
}

/**
 * スケジュールを更新
 */
export async function updateSchedule(scheduleId: number, data: ScheduleUpdate): Promise<Schedule> {
  const res = await fetchWithAuth(`${API_BASE}/api/schedules/${scheduleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Schedule>(res);
}

/**
 * スケジュールを削除
 */
export async function deleteSchedule(scheduleId: number): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${API_BASE}/api/schedules/${scheduleId}`, { method: 'DELETE' });
  return handleResponse<{ message: string }>(res);
}

/**
 * 水かけ当番の登録・解除
 * 
 * @param params - 登録・解除パラメータ
 */
export async function registerOrUnregisterDuty(params: {
  user_id: number;
  field_id: number;
  date: string;
  action: 'register' | 'unregister';
}): Promise<{ result: string; schedule_id?: number }> {
  const body = params.action === 'register'
    ? { ...params, status: '未実施' }
    : params;
  const res = await fetchWithAuth(`${API_BASE}/api/schedules/duty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

// ==================== 履歴関連API ====================

/**
 * 履歴一覧を取得
 * 
 * @param scheduleId - スケジュールID（フィルタ用）
 * @param userId - ユーザーID（フィルタ用）
 */
export async function fetchHistories(scheduleId?: number, userId?: number): Promise<History[]> {
  const params = new URLSearchParams();
  if (scheduleId) params.append('schedule_id', scheduleId.toString());
  if (userId) params.append('user_id', userId.toString());
  
  const res = await fetchWithAuth(`${API_BASE}/api/histories?${params.toString()}`);
  return handleResponse<History[]>(res);
}

/**
 * 指定IDの履歴を取得
 */
export async function fetchHistoryById(historyId: number): Promise<History> {
  const res = await fetchWithAuth(`${API_BASE}/api/histories/${historyId}`);
  return handleResponse<History>(res);
}

/**
 * 履歴を作成
 */
export async function createHistory(data: HistoryCreate): Promise<History> {
  const res = await fetchWithAuth(`${API_BASE}/api/histories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<History>(res);
}

/**
 * 履歴を更新
 */
export async function updateHistory(historyId: number, data: HistoryUpdate): Promise<History> {
  const res = await fetchWithAuth(`${API_BASE}/api/histories/${historyId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<History>(res);
}

/**
 * 履歴を削除
 */
export async function deleteHistory(historyId: number): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${API_BASE}/api/histories/${historyId}`, { method: 'DELETE' });
  return handleResponse<{ message: string }>(res);
}

// ==================== 天気関連API ====================

/**
 * 指定畑・日付の天気情報を取得
 */
export async function fetchWeather(fieldId: number, date: string): Promise<Weather> {
  const res = await fetchWithAuth(`${API_BASE}/api/weather?field_id=${fieldId}&date=${date}`);
  return handleResponse<Weather>(res);
}

/**
 * 指定畑の天気予報を取得
 * 
 * @param fieldId - 畑ID
 * @param days - 予報日数（デフォルト: 7日）
 */
export async function fetchWeatherForecast(fieldId: number, days: number = 7): Promise<Weather[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/weather/forecast?field_id=${fieldId}&days=${days}`);
  return handleResponse<Weather[]>(res);
}

// ==================== 画像関連API ====================

/**
 * 畑の画像をアップロード
 */
export async function uploadFieldImage(fieldId: number, file: File): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetchWithAuth(`${API_BASE}/api/fields/${fieldId}/image`, {
    method: 'PUT',
    body: formData,
  });
  return handleResponse<{ message: string }>(res);
}

/**
 * 畑の画像を取得
 */
export async function fetchFieldImage(fieldId: number): Promise<Blob> {
  const res = await fetchWithAuth(`${API_BASE}/api/fields/${fieldId}/image`);
  if (!res.ok) throw new Error('画像取得に失敗しました');
  return res.blob();
} 