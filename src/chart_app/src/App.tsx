import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChartSelection from './components/ChartSelection';
import PhotoCapture from './components/PhotoCapture';
import ChartDisplay from './components/ChartDisplay';
import ResultDisplay from './components/ResultDisplay';
import './App.css'

/**
 * メインアプリケーションコンポーネント
 * 
 * 機能概要:
 * - React Routerを使用してSPAの画面遷移を管理
 * - 4つのメイン画面を管理: チャート選択、写真登録、チャート実行、結果表示
 * - PWA対応のため、ベースURLは/chart/で固定
 * - 不正なパスへのアクセスをチャート選択画面にリダイレクト
 */
function App() {
  React.useEffect(() => {
    // アプリ初期化時のパス正規化処理
    // PWAでの動作や直接URLアクセスを考慮したリダイレクト処理
    const path = window.location.pathname;
    
    // 以下の場合はチャート選択画面にリダイレクト:
    // 1. ルートパス(/)へのアクセス
    // 2. /chart へのアクセス（末尾スラッシュなし）
    // 3. /chart/で始まらないパスへのアクセス
    if (path === '/' || path === '/chart' || (!path.startsWith('/chart/') && path !== '/chart/')) {
      window.location.href = '/chart/';
    }
  }, []);

  return (
    <Router basename="/chart">
      <div className="app-container">
        <Routes>
          {/* チャート選択画面（ルート） - アプリのスタートポイント */}
          <Route path="/" element={<ChartSelection />} />
          
          {/* 写真登録画面 - 名刺の撮影を行う */}
          <Route path="/photo" element={<PhotoCapture />} />
          
          {/* チャート画面 - Yes/Noチャートの実行を行う */}
          <Route path="/chart" element={<ChartDisplay />} />
          
          {/* 結果表示画面 - 診断結果の表示とサーバ送信を行う */}
          <Route path="/result" element={<ResultDisplay />} />
          
          {/* 未知のルートはチャート選択画面にリダイレクト（エラーハンドリング） */}
          <Route path="*" element={<ChartSelection />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App
