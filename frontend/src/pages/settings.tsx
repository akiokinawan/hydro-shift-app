import React, { useEffect, useState } from "react";
import { fetchFields, updateField, fetchFieldById, fetchFieldImage, uploadFieldImage } from "../lib/api";
import { useAuth } from '../hooks/useAuth';

const fieldId = 1; // 仮: 畑ID固定
import dynamic from 'next/dynamic';
import Link from 'next/link';

const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);
import 'leaflet/dist/leaflet.css';
// import L from 'leaflet'; ← 削除

// geocodeAddress, latlng, markerIcon, MapContainer, TileLayer, Marker, Popup, dynamic import, useEffectでのgeocodeAddressやmarkerIcon取得、地図表示部分を全て削除

const SettingsPage: React.FC = () => {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<any | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [field, setField] = useState<any>(null);
  const [fieldImageUrl, setFieldImageUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  // const [latlng, setLatlng] = useState<{ lat: number; lng: number } | null>(null); // 削除
  // const [markerIcon, setMarkerIcon] = useState<any>(null); // 削除
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    setLoading(true);
    fetchFields()
      .then(setFields)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // useEffect(() => { // 削除
  //   import('leaflet').then(L => { // 削除
  //     setMarkerIcon(L.icon({ // 削除
  //       iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', // 削除
  //       iconSize: [25, 41], // 削除
  //       iconAnchor: [12, 41] // 削除
  //     })); // 削除
  //   }); // 削除
  // }, []); // 削除

  const handleEdit = (f: any) => setEdit({ ...f });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!edit) return;
    setEdit({ ...edit, [e.target.name]: e.target.value });
  };
  const handleSave = async () => {
    if (!edit) return;
    setLoading(true);
    try {
      await updateField(edit.id, edit);
      setMsg("保存しました");
      setEdit(null);
      fetchFields().then(setFields);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFieldById(fieldId)
      .then(async f => {
        setField(f);
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // 畑画像の取得
  useEffect(() => {
    fetchFieldImage(fieldId)
      .then(blob => {
        setFieldImageUrl(URL.createObjectURL(blob));
      })
      .catch(() => setFieldImageUrl(null));
  }, [msg]);

  // 画像アップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      await uploadFieldImage(fieldId, file);
      setMsg("画像をアップロードしました");
      // 画像プレビューを更新
      fetchFieldImage(fieldId).then(blob => {
        setFieldImageUrl(URL.createObjectURL(blob));
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (authLoading) return <main style={{ padding: 32 }}>認証チェック中...</main>;
  if (loading) return <main style={{ padding: 32 }}>読み込み中...</main>;
  if (error) return <main style={{ padding: 32, color: 'red' }}>エラー: {error}</main>;

  return (
    <main style={{ padding: 32 }}>
      {msg && <div style={{ color: 'green', background: '#E8F5E8', padding: 12, borderRadius: 8, marginBottom: 16 }}>{msg}</div>}
      {!isAdmin && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffeaa7', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <strong>閲覧専用モード</strong><br />
          一般ユーザーは情報の閲覧のみ可能です。編集は管理者のみ行えます。
        </div>
      )}
      
      <h1 style={{ color: '#1976d2', marginBottom: 24 }}>畑の情報</h1>
      
      {/* 畑情報カード */}
      {fields.map(f => (
        <div key={f.id} style={{ 
          background: 'white', 
          borderRadius: 12, 
          padding: 24, 
          marginBottom: 24, 
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ 
              background: '#4CAF50', 
              color: 'white', 
              borderRadius: '50%', 
              width: 50, 
              height: 50, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: 24,
              marginRight: 16
            }}>
              🚜
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#333', fontSize: 24 }}>{f.name}</h2>
              <p style={{ margin: 0, color: '#666', fontSize: 16 }}>{f.location_text}</p>
            </div>
          </div>
          

          
          {/* 図面表示 */}
          {f.id === fieldId && fieldImageUrl && (
            <div style={{ marginTop: 20, padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
              <h3 style={{ color: '#1976d2', marginTop: 0, marginBottom: 16 }}>畑の図面</h3>
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={fieldImageUrl} 
                  alt={`${f.name}の図面`} 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: 300, 
                    objectFit: 'contain',
                    border: '2px solid #ddd',
                    borderRadius: 8,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => setShowImageModal(true)}
                />
              </div>
            </div>
          )}
          
          {/* 管理者用編集ボタン */}
          {isAdmin && (
            <div style={{ marginTop: 20, padding: 16, background: '#f0f8ff', borderRadius: 8, border: '1px solid #e3f2fd' }}>
              <h4 style={{ color: '#1976d2', marginTop: 0, marginBottom: 12 }}>管理者設定</h4>
              
              {/* 図面アップロード */}
              {f.id === fieldId && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, color: '#666', marginBottom: 8 }}>
                    図面のアップロード
                  </label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    style={{
                      padding: 8,
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 14
                    }}
                  />
                </div>
              )}
              
              {/* 基本情報編集 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, color: '#666', marginBottom: 4 }}>
                    畑の名前
                  </label>
                  <input 
                    name="name" 
                    value={edit && edit.id === f.id ? edit.name : f.name}
                    onChange={handleChange}
                    disabled={!edit || edit.id !== f.id}
                    style={{
                      width: '100%',
                      padding: 8,
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 14
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, color: '#666', marginBottom: 4 }}>
                    所在地
                  </label>
                  <input 
                    name="location_text" 
                    value={edit && edit.id === f.id ? edit.location_text : f.location_text}
                    onChange={handleChange}
                    disabled={!edit || edit.id !== f.id}
                    style={{
                      width: '100%',
                      padding: 8,
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 14
                    }}
                  />
                </div>
              </div>
              

              
              {/* 編集ボタン */}
              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                {edit && edit.id === f.id ? (
                  <>
                    <button 
                      onClick={handleSave}
                      style={{
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      保存
                    </button>
                    <button 
                      onClick={() => setEdit(null)}
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
                  </>
                ) : (
                  <button 
                    onClick={() => handleEdit(f)}
                    style={{
                      background: '#1976d2',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    編集
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 通知設定セクション */}
      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        padding: 24, 
        marginBottom: 24, 
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ 
            background: '#FF9800', 
            color: 'white', 
            borderRadius: '50%', 
            width: 50, 
            height: 50, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: 24,
            marginRight: 16
          }}>
            🔔
          </div>
          <h2 style={{ margin: 0, color: '#333', fontSize: 24 }}>通知設定</h2>
        </div>
        <p style={{ color: '#666', marginBottom: 16 }}>今後実装予定の機能です</p>
        <ul style={{ color: '#666', paddingLeft: 20 }}>
          <li>メール通知</li>
          <li>LINE通知</li>
          <li>プッシュ通知</li>
        </ul>
      </div>

      {/* 画像拡大モーダル */}
      {showImageModal && fieldImageUrl && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <button
              onClick={() => setShowImageModal(false)}
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                background: 'transparent',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                cursor: 'pointer',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#FFFFFF'
              }}
            >
              ✖️
            </button>
            <img 
              src={fieldImageUrl} 
              alt={`${field?.name}の図面`} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain',
                border: '2px solid white',
                borderRadius: 8
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <Link href="/" style={{ color: '#1976d2', textDecoration: 'none' }}>
          ダッシュボードへ戻る
        </Link>
      </div>
    </main>
  );
};

export default SettingsPage; 