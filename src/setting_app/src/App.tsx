import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChartList from './components/ChartList';
import ChartCreate from './components/ChartCreate';
import './App.css'

/**
 * メインアプリケーションコンポーネント
 * React Routerを使用して画面遷移を管理
 */
function App() {
  return (
    <Router basename="/setting">
      <div className="app-container">
        <Routes>
          {/* チャート一覧画面（ルート） */}
          <Route path="/" element={<ChartList />} />
          
          {/* 新規登録画面 */}
          <Route path="/create" element={<ChartCreate />} />
          
          {/* 未知のルートはチャート一覧画面にリダイレクト */}
          <Route path="*" element={<ChartList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App
