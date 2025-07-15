/**
 * 認証状態を管理するカスタムフック
 * ユーザー情報の取得、ログアウト処理を提供
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { User } from '../lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

/**
 * 認証状態を管理するカスタムフック
 * 
 * @returns {AuthState} 認証状態とログアウト関数
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 初期化時にローカルストレージからユーザー情報を取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (error) {
          console.error('ユーザー情報の解析に失敗しました:', error);
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    }
  }, []);

  /**
   * ログアウト処理を実行
   * ローカルストレージをクリアしてログインページにリダイレクト
   */
  const logout = (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    // setUser(null); ← これをコメントアウト
    router.push('/login');
  };

  return { user, loading, logout };
} 