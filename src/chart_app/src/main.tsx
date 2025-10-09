/**
 * アプリケーションのエントリーポイント
 * 
 * 機能概要:
 * - Reactアプリケーションの初期化とマウント
 * - PWA対応のService Worker登録
 * - オフライン機能とキャッシュ機能の有効化
 * - エラーハンドリングとフォールバック処理
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// =============================================================================
// PWA Service Worker 登録処理
// =============================================================================
// オフライン対応とキャッシュ機能を提供するためのService Workerを登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Service Workerの登録処理
    // パスは/chart/sw.jsで固定（PWAのベースURLに合わせる）
    navigator.serviceWorker.register('/chart/sw.js')
      .then((registration) => {
        console.log('Service Workerの登録に成功しました:', registration.scope);
        
        // Service Workerの更新チェックを定期的に実行
        setInterval(() => {
          registration.update();
        }, 60000); // 1分おきに更新チェック
      })
      .catch((error) => {
        console.warn('Service Workerの登録に失敗しました（オンライン機能のみ使用可能）:', error);
      });
  });
} else {
  console.warn('このブラウザはService Workerに対応していません。オフライン機能は使用できません。');
}

// =============================================================================
// Reactアプリケーションのレンダリング
// =============================================================================
// StrictModeを使用して開発時のデバッグ支援を有効化
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. アプリケーションの初期化に失敗しました。');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)