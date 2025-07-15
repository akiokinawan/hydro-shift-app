import React, { useEffect, useState } from "react";
import { fetchUsers, createUser, deleteUser, updateUser } from "../lib/api";
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const UserAdminPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const handleEdit = (u: any) => {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      await updateUser(editUser.id, { name: editName, email: editEmail, role: editRole });
      setEditUser(null);
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditCancel = () => {
    setEditUser(null);
  };

  const handleDelete = async (userId: number) => {
    setDeleteLoading(userId);
    try {
      await deleteUser(userId);
      setShowDeleteConfirm(null);
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' ? '#d32f2f' : '#1976d2';
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? '管理者' : '一般ユーザー';
  };

  const getRoleBgColor = (role: string) => {
    return role === 'admin' ? '#ffebee' : '#e3f2fd';
  };

  // ユーザーを役割で分類
  const adminUsers = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role === 'user');

  if (authLoading || !user) {
    return <div>認証チェック中...</div>;
  }
  if (loading) return <main style={{ padding: 32 }}>読み込み中...</main>;
  if (error) return <main style={{ padding: 32, color: 'red' }}>エラー: {error}</main>;

  return (
    <main style={{ padding: '16px', maxWidth: '100%', overflowX: 'hidden' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '24px', color: '#1976d2' }}>ユーザー管理</h1>
      
      {/* 管理者ユーザーセクション */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          fontSize: '20px', 
          marginBottom: '20px', 
          color: '#d32f2f',
          borderBottom: '2px solid #d32f2f',
          paddingBottom: '8px'
        }}>
          管理者 ({adminUsers.length}名)
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '20px'
        }}>
          {adminUsers.map(u => (
            <div key={u.id} style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '20px', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              border: '2px solid #d32f2f',
              position: 'relative'
            }}>
              {/* ユーザー情報 */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ 
                  background: getRoleBgColor(u.role), 
                  color: '#222', 
                  borderRadius: '50%', 
                  width: '50px', 
                  height: '50px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginRight: '16px',
                  border: '2px solid #d32f2f'
                }}>
                  <span style={{ color: '#222' }}>👑</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{u.name}</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{u.email}</p>
                </div>
              </div>
              
              {/* 権限バッジ */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ 
                  background: getRoleColor(u.role), 
                  color: 'white', 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '12px', 
                  fontWeight: 'bold' 
                }}>
                  {getRoleLabel(u.role)}
                </span>
              </div>
              
              {/* 詳細情報 */}
              <div style={{ 
                background: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px' 
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>ユーザーID</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{u.id}</div>
              </div>
              
              <div style={{ 
                background: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px' 
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>作成日</div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                  {new Date(u.created_at).toLocaleDateString('ja-JP')}
                </div>
              </div>
              
              {/* 操作ボタン */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleEdit(u)}
                  style={{
                    flex: 1,
                    background: '#1976d2',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#1565c0'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#1976d2'}
                >
                  編集
                </button>
                
                {u.id !== user.id && (
                  <button 
                    onClick={() => setShowDeleteConfirm(u.id)}
                    style={{
                      flex: 1,
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#d32f2f'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#f44336'}
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 一般ユーザーセクション */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          fontSize: '20px', 
          marginBottom: '20px', 
          color: '#1976d2',
          borderBottom: '2px solid #1976d2',
          paddingBottom: '8px'
        }}>
          一般ユーザー ({regularUsers.length}名)
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '20px'
        }}>
          {regularUsers.map(u => (
            <div key={u.id} style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '20px', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0',
              position: 'relative'
            }}>
              {/* ユーザー情報 */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ 
                  background: getRoleBgColor(u.role), 
                  color: '#222', 
                  borderRadius: '50%', 
                  width: '50px', 
                  height: '50px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginRight: '16px'
                }}>
                  <span style={{ color: '#222' }}>👤</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{u.name}</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{u.email}</p>
                </div>
              </div>
              
              {/* 権限バッジ */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ 
                  background: getRoleColor(u.role), 
                  color: 'white', 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '12px', 
                  fontWeight: 'bold' 
                }}>
                  {getRoleLabel(u.role)}
                </span>
              </div>
              
              {/* 詳細情報 */}
              <div style={{ 
                background: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px' 
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>ユーザーID</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{u.id}</div>
              </div>
              
              <div style={{ 
                background: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px' 
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>作成日</div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                  {new Date(u.created_at).toLocaleDateString('ja-JP')}
                </div>
              </div>
              
              {/* 操作ボタン */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleEdit(u)}
                  style={{
                    flex: 1,
                    background: '#1976d2',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#1565c0'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#1976d2'}
                >
                  編集
                </button>
                
                {u.id !== user.id && (
                  <button 
                    onClick={() => setShowDeleteConfirm(u.id)}
                    style={{
                      flex: 1,
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#d32f2f'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#f44336'}
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.5)', 
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setShowDeleteConfirm(null)}>
          <div style={{ 
            background: '#fff', 
            maxWidth: '400px', 
            margin: '20px', 
            padding: '24px', 
            borderRadius: '12px', 
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: '#d32f2f' }}>ユーザー削除の確認</h3>
            <p style={{ margin: '0 0 24px 0', color: '#666' }}>
              このユーザーを削除しますか？この操作は取り消せません。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                キャンセル
              </button>
              <button 
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleteLoading === showDeleteConfirm}
                style={{
                  background: deleteLoading === showDeleteConfirm ? '#ccc' : '#d32f2f',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: deleteLoading === showDeleteConfirm ? 'default' : 'pointer'
                }}
              >
                {deleteLoading === showDeleteConfirm ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editUser && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.5)', 
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setEditUser(null)}>
          <div style={{ 
            background: '#fff', 
            maxWidth: '400px', 
            margin: '20px', 
            padding: '24px', 
            borderRadius: '12px', 
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1976d2' }}>ユーザー編集</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>名前</label>
              <input 
                type="text" 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }} 
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>メールアドレス</label>
              <input 
                type="email" 
                value={editEmail} 
                onChange={e => setEditEmail(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }} 
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>権限</label>
              <select 
                value={editRole} 
                onChange={e => setEditRole(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="user">一般ユーザー</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleEditCancel}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                キャンセル
              </button>
              <button 
                onClick={handleEditSave}
                disabled={editLoading}
                style={{
                  background: editLoading ? '#ccc' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: editLoading ? 'default' : 'pointer'
                }}
              >
                {editLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <Link href="/" style={{ color: '#1976d2', textDecoration: 'none' }}>
          ダッシュボードへ戻る
        </Link>
      </div>
    </main>
  );
};

export default UserAdminPage; 