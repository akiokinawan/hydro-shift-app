/**
 * ログインページ
 * ユーザーのログインと新規登録機能を提供
 */

import { useState } from 'react';
import { useRouter } from 'next/router';

const API_BASE = 'http://localhost:8000';

/**
 * ログインフォームの状態管理
 */
interface LoginFormState {
  email: string;
  password: string;
  error: string;
  loading: boolean;
}

/**
 * サインアップフォームの状態管理
 */
interface SignupFormState {
  name: string;
  email: string;
  password: string;
  error: string;
  loading: boolean;
}

/**
 * ログインページのメインコンポーネント
 */
export default function LoginPage() {
  // ログインフォームの状態
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: '',
    password: '',
    error: '',
    loading: false
  });

  // サインアップフォームの状態
  const [signupForm, setSignupForm] = useState<SignupFormState>({
    name: '',
    email: '',
    password: '',
    error: '',
    loading: false
  });

  const [showSignup, setShowSignup] = useState(false);
  const router = useRouter();

  /**
   * ログインフォームの送信処理
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginForm(prev => ({ ...prev, error: '', loading: true }));

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          username: loginForm.email, 
          password: loginForm.password 
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setLoginForm(prev => ({ 
          ...prev, 
          error: data.detail || 'ログイン失敗',
          loading: false 
        }));
        return;
      }

      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/');
    } catch (err) {
      setLoginForm(prev => ({ 
        ...prev, 
        error: '通信エラー',
        loading: false 
      }));
    }
  };

  /**
   * サインアップフォームの送信処理
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupForm(prev => ({ ...prev, error: '', loading: true }));

    try {
      // サインアップ処理
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: signupForm.name, 
          email: signupForm.email, 
          password: signupForm.password 
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSignupForm(prev => ({ 
          ...prev, 
          error: data.detail || '登録失敗',
          loading: false 
        }));
        return;
      }

      // サインアップ成功時は自動ログイン
      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          username: signupForm.email, 
          password: signupForm.password 
        }),
      });

      if (!loginRes.ok) {
        setSignupForm(prev => ({ 
          ...prev, 
          error: '自動ログイン失敗',
          loading: false 
        }));
        return;
      }

      const loginData = await loginRes.json();
      localStorage.setItem('access_token', loginData.access_token);
      localStorage.setItem('user', JSON.stringify(loginData.user));
      router.push('/');
    } catch (err) {
      setSignupForm(prev => ({ 
        ...prev, 
        error: '通信エラー',
        loading: false 
      }));
    }
  };

  /**
   * フォーム入力値の更新処理
   */
  const updateLoginForm = (field: keyof LoginFormState, value: string) => {
    setLoginForm(prev => ({ ...prev, [field]: value }));
  };

  const updateSignupForm = (field: keyof SignupFormState, value: string) => {
    setSignupForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ 
      maxWidth: 400, 
      margin: '40px auto', 
      padding: 24, 
      border: '1px solid #ccc', 
      borderRadius: 8 
    }}>
      {/* ログインフォーム */}
      <h2>ログイン</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 16 }}>
          <label>
            メールアドレス<br />
            <input 
              type="email" 
              value={loginForm.email} 
              onChange={e => updateLoginForm('email', e.target.value)} 
              required 
              style={{ width: '100%' }} 
            />
          </label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>
            パスワード<br />
            <input 
              type="password" 
              value={loginForm.password} 
              onChange={e => updateLoginForm('password', e.target.value)} 
              required 
              style={{ width: '100%' }} 
            />
          </label>
        </div>
        {loginForm.error && (
          <div style={{ color: 'red', marginBottom: 12 }}>
            {loginForm.error}
          </div>
        )}
        <button 
          type="submit" 
          disabled={loginForm.loading} 
          style={{ width: '100%', padding: 8 }}
        >
          {loginForm.loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      {/* 新規登録ボタン */}
      <button 
        onClick={() => setShowSignup(true)} 
        style={{ width: '100%', marginTop: 16, padding: 8 }}
      >
        新規登録
      </button>

      {/* サインアップモーダル */}
      {showSignup && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0,0,0,0.3)', 
            zIndex: 1000 
          }} 
          onClick={() => setShowSignup(false)}
        >
          <div 
            style={{ 
              background: '#fff', 
              maxWidth: 360, 
              margin: '80px auto', 
              padding: 24, 
              borderRadius: 8, 
              position: 'relative' 
            }} 
            onClick={e => e.stopPropagation()}
          >
            <h3>新規登録</h3>
            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: 16 }}>
                <label>
                  名前<br />
                  <input 
                    type="text" 
                    value={signupForm.name} 
                    onChange={e => updateSignupForm('name', e.target.value)} 
                    required 
                    style={{ width: '100%' }} 
                  />
                </label>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>
                  メールアドレス<br />
                  <input 
                    type="email" 
                    value={signupForm.email} 
                    onChange={e => updateSignupForm('email', e.target.value)} 
                    required 
                    style={{ width: '100%' }} 
                  />
                </label>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>
                  パスワード<br />
                  <input 
                    type="password" 
                    value={signupForm.password} 
                    onChange={e => updateSignupForm('password', e.target.value)} 
                    required 
                    style={{ width: '100%' }} 
                  />
                </label>
              </div>
              {signupForm.error && (
                <div style={{ color: 'red', marginBottom: 12 }}>
                  {signupForm.error}
                </div>
              )}
              <button 
                type="submit" 
                disabled={signupForm.loading} 
                style={{ width: '100%', padding: 8 }}
              >
                {signupForm.loading ? '登録中...' : '登録'}
              </button>
            </form>
            <button 
              onClick={() => setShowSignup(false)} 
              style={{ position: 'absolute', top: 8, right: 8 }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 