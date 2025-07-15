import React, { useState, useEffect } from "react";
import { useAuth } from '../hooks/useAuth';
import { updateUser } from '../lib/api';
import { useRouter } from 'next/router';

const ProfilePage: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  if (authLoading) return <main style={{ padding: 32 }}>認証チェック中...</main>;
  if (!user) {
    router.replace('/login');
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await updateUser(user.id, { name, email });
      setMsg("保存しました");
      // localStorageのuser情報も更新
      const updated = { ...user, name, email };
      localStorage.setItem('user', JSON.stringify(updated));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwMsg(null);
    setPwError(null);
    if (!newPassword || newPassword.length < 6) {
      setPwError("新しいパスワードは6文字以上で入力してください。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("新しいパスワードが一致しません。");
      return;
    }
    setPwSaving(true);
    try {
      await updateUser(user.id, { password: newPassword });
      setPwMsg("パスワードを変更しました");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setPwError(e.message);
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <main style={{ padding: 32, maxWidth: 400, margin: '0 auto' }}>
      <h1>マイページ</h1>
      <div style={{ color: '#666', fontSize: '0.95em', marginBottom: 12 }}>
        ※この画面ではご自身のユーザー情報のみ編集できます。
      </div>
      {msg && <div style={{ color: 'green', marginBottom: 12 }}>{msg}</div>}
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <div style={{ marginBottom: 16 }}>
        <label>名前<br />
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>メール<br />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%' }} />
        </label>
      </div>
      <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 8 }}>
        {saving ? '保存中...' : '保存'}
      </button>
      <div style={{ marginTop: 32, padding: 20, border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }}>
        <h2 style={{ fontSize: '1.1em', marginBottom: 12 }}>パスワード変更</h2>
        {pwMsg && <div style={{ color: 'green', marginBottom: 12 }}>{pwMsg}</div>}
        {pwError && <div style={{ color: 'red', marginBottom: 12 }}>{pwError}</div>}
        <div style={{ marginBottom: 12 }}>
          <label>新しいパスワード<br />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%' }} />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>新しいパスワード（確認）<br />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: '100%' }} />
          </label>
        </div>
        <button onClick={handlePasswordChange} disabled={pwSaving} style={{ width: '100%', padding: 8 }}>
          {pwSaving ? '変更中...' : 'パスワードを変更'}
        </button>
      </div>
      <div style={{ marginTop: 24 }}>
        <button onClick={logout} style={{ width: '100%', padding: 8, background: '#f5f5f5', color: '#888', fontWeight: 600, border: '1px solid #ccc', borderRadius: 4 }}>ログアウト</button>
      </div>
      <div style={{ marginTop: 16 }}>
        <a href="/">ダッシュボードへ戻る</a>
      </div>
    </main>
  );
};

export default ProfilePage; 