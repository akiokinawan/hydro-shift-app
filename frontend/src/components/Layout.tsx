/**
 * アプリケーション全体のレイアウトコンポーネント
 * ヘッダーとナビゲーションを含む共通レイアウト
 */

import React, { ReactNode } from "react";
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

/**
 * ログアウト処理を実行する関数
 */
const handleLogout = (): void => {
  localStorage.removeItem('access_token');
  window.location.href = '/login';
};

/**
 * アプリケーションのレイアウトコンポーネント
 * ヘッダー、ナビゲーション、メインコンテンツエリアを提供
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';

  return (
    <div>
      {/* ヘッダー */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '8px 24px', 
        borderBottom: '1px solid #eee' 
      }}>
        {/* アプリケーションタイトル */}
        {isLoginPage ? (
          <div style={{ textDecoration: 'none', color: '#1976d2', fontWeight: 700, cursor: 'default' }}>
            <h2 style={{ margin: 0, display: 'inline' }}>Hydro-Shift</h2>
          </div>
        ) : (
          <Link href="/" legacyBehavior>
            <a style={{ textDecoration: 'none', color: '#1976d2', fontWeight: 700 }}>
              <h2 style={{ margin: 0, display: 'inline' }}>Hydro-Shift</h2>
            </a>
          </Link>
        )}
        
        {/* ナビゲーション */}
        <nav>
          {!authLoading && user && !isLoginPage && (
            <button 
              onClick={handleLogout}
              className="logout-button"
            >
              Logout
            </button>
          )}
        </nav>
      </header>
      
      {/* メインコンテンツエリア */}
      <div>{children}</div>
      
      {/* スタイル定義 */}
      <style jsx>{`
        .logout-button {
          display: flex;
          align-items: center;
          text-decoration: none;
          color: #333;
          font-weight: 700;
          background: #f5f5f5;
          border-radius: 20px;
          padding: 6px 16px;
          border: none;
          cursor: pointer;
          font-size: 14px;
        }
        
        .logout-button:hover {
          background: #e0e0e0;
        }
      `}</style>
    </div>
  );
};

export default Layout; 