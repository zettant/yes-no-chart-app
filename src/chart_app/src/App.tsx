import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChartSelection from './components/ChartSelection';
import PhotoCapture from './components/PhotoCapture';
import ChartDisplay from './components/ChartDisplay';
import ResultDisplay from './components/ResultDisplay';
import './App.css'

/**
 * メインアプリケーションコンポーネント
 * React Routerを使用して画面遷移を管理
 */
function App() {
  React.useEffect(() => {
    // 不正なパスの場合は /chart/ にリダイレクト
    const path = window.location.pathname;
    if (path === '/' || path === '/chart' || (!path.startsWith('/chart/') && path !== '/chart/')) {
      window.location.href = '/chart/';
    }
  }, []);

  return (
    <Router basename="/chart">
      <div className="app-container">
        <Routes>
          {/* チャート選択画面（ルート） */}
          <Route path="/" element={<ChartSelection />} />
          
          {/* 写真登録画面 */}
          <Route path="/photo" element={<PhotoCapture />} />
          
          {/* チャート画面 */}
          <Route path="/chart" element={<ChartDisplay />} />
          
          {/* 結果表示画面 */}
          <Route path="/result" element={<ResultDisplay />} />
          
          {/* 未知のルートはチャート選択画面にリダイレクト */}
          <Route path="*" element={<ChartSelection />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App
