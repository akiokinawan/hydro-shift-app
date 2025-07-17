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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
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

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (!validateEmail(value)) {
      setEmailError('メールアドレスの形式が正しくありません');
    } else {
      setEmailError(null);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value.length > 40) {
      setNameError('名前は40文字以内で入力してください');
    } else {
      setNameError(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMsg(null);
    setEmailError(null);
    setNameError(null);
    if (name.length > 40) {
      setNameError('名前は40文字以内で入力してください');
      setSaving(false);
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('メールアドレスの形式が正しくありません');
      setSaving(false);
      return;
    }
    if (name.trim() === '') {
      setSaving(false);
      return;
    }
    try {
      await updateUser(user.id, { name, email });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
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
      {showToast && (
        <div style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#f5f5f5',
          color: '#43a047',
          padding: '12px 24px',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          zIndex: 2000,
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: 1,
          border: '1px solid #ddd',
          minWidth: 180,
          textAlign: 'center'
        }}>
          保存しました
        </div>
      )}
      {msg && <div style={{ color: 'green', marginBottom: 12 }}>{msg}</div>}
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <div style={{ marginBottom: 16 }}>
        <label>名前<br />
          <input type="text" value={name} onChange={handleNameChange} style={{ width: '100%' }} maxLength={40} />
          {nameError && <div style={{ color: 'red', fontSize: '13px', marginTop: 4 }}>{nameError}</div>}
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>メール<br />
          <input type="email" value={email} onChange={handleEmailChange} style={{ width: '100%' }} />
          {emailError && <div style={{ color: 'red', fontSize: '13px', marginTop: 4 }}>{emailError}</div>}
        </label>
      </div>
      <button onClick={handleSave} disabled={saving || !!emailError || !!nameError || name.trim() === ''} style={{ width: '100%', padding: 8 }}>
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
        <button onClick={handlePasswordChange} disabled={pwSaving || newPassword.trim() === '' || confirmPassword.trim() === ''} style={{ width: '100%', padding: 8 }}>
          {pwSaving ? '変更中...' : 'パスワードを変更'}
        </button>
      </div>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <a href="/">ダッシュボードへ戻る</a>
      </div>
    </main>
  );
};

export default ProfilePage; 