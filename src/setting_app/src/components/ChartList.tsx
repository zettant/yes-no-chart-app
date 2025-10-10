import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCharts, parseChartData, deleteChart } from '../api';
import type { IChart } from '../types';

/**
 * チャート一覧画面コンポーネント
 * 保存済みのチャート一覧を表示し、削除・新規登録を管理
 */
const ChartList: React.FC = () => {
  const navigate = useNavigate();
  const [charts, setCharts] = useState<IChart[]>([]);           // チャート一覧
  const [loading, setLoading] = useState<boolean>(true);       // ローディング状態
  const [error, setError] = useState<string | null>(null);     // エラーメッセージ
  const [deletingChart, setDeletingChart] = useState<string | null>(null); // 削除中のチャート名

  /**
   * コンポーネントマウント時にチャート一覧を取得
   */
  useEffect(() => {
    loadCharts();
  }, []);

  /**
   * チャート一覧を読み込み
   */
  const loadCharts = async () => {
    try {
      setLoading(true);
      setError(null);

      // バックエンドからチャート一覧を取得
      const chartJsonArray = await fetchCharts();
      
      // JSON文字列配列をIChart型配列に変換
      const parsedCharts = chartJsonArray.map(chartJson => 
        parseChartData(chartJson)
      );

      setCharts(parsedCharts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'チャート一覧の取得に失敗しました';
      setError(errorMessage);
      console.error('チャート一覧取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * チャート削除ハンドラー
   * @param chartName - 削除するチャート名
   */
  const handleDeleteChart = async (chartName: string) => {
    if (!confirm(`チャート「${chartName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      setDeletingChart(chartName);
      setError(null);

      // バックエンドでチャートを削除
      await deleteChart(chartName);

      // 成功時、ローカル状態からも削除
      setCharts(prevCharts => prevCharts.filter(chart => chart.name !== chartName));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'チャート削除に失敗しました';
      setError(errorMessage);
      console.error('チャート削除エラー:', err);
    } finally {
      setDeletingChart(null);
    }
  };

  /**
   * 新規登録画面に遷移
   */
  const handleCreateNew = () => {
    navigate('/create');
  };

  /**
   * チャートアプリを開く
   */
  const handleOpenChartApp = () => {
    window.open('/chart', '_blank');
  };

  /**
   * ローディング中の表示
   */
  if (loading) {
    return (
      <div className="chart-list-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">チャート一覧を読み込み中...</p>
        </div>
      </div>
    );
  }

  /**
   * メイン表示
   */
  return (
    <div className="chart-list-container">
      <div className="chart-list-content">
        {/* ヘッダー */}
        <div className="chart-list-header">
          <h1 className="chart-list-title">チャート管理</h1>
          <div className="header-actions">
            <button 
              className="chart-app-button"
              onClick={handleOpenChartApp}
            >
              チャートアプリを開く
            </button>
            <button 
              className="create-new-button"
              onClick={handleCreateNew}
              disabled={charts.length >= 3}
            >
              新規登録
            </button>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="error-message-banner">
            <p className="error-text">{error}</p>
            <button 
              className="retry-button"
              onClick={loadCharts}
            >
              再試行
            </button>
          </div>
        )}

        {/* チャート数制限の表示 */}
        <div className="chart-count-info">
          <p className="chart-count-text">
            登録チャート数: {charts.length} / 3
          </p>
          {charts.length >= 3 && (
            <p className="chart-limit-message">
              ※ 最大3つまでのチャートを保存できます
            </p>
          )}
        </div>

        {/* チャート一覧表示 */}
        {charts.length === 0 ? (
          <div className="no-charts-container">
            <div className="no-charts-icon">📊</div>
            <h2 className="no-charts-title">チャートが登録されていません</h2>
            <p className="no-charts-message">
              新規登録ボタンからCSVファイルをアップロードして<br/>
              診断チャートを作成してください。
            </p>
          </div>
        ) : (
          <div className="charts-table-container">
            <table className="charts-table">
              <thead>
                <tr>
                  <th>チャート名</th>
                  <th>タイプ</th>
                  <th>設問数</th>
                  <th>診断結果数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {charts.map((chart) => (
                  <tr key={chart.name} className="chart-row">
                    <td className="chart-name-cell">
                      <strong>{chart.name}</strong>
                    </td>
                    <td className="chart-type-cell">
                      <span className={`chart-type-badge ${chart.type}`}>
                        {chart.type === 'decision' ? '分岐型' : 
                         chart.type === 'single' ? '単一ポイント型' : 
                         chart.type === 'multi' ? '複数カテゴリ型' : 
                         chart.type}
                      </span>
                    </td>
                    <td className="chart-questions-cell">
                      {chart.questions.length} 問
                    </td>
                    <td className="chart-diagnoses-cell">
                      {chart.diagnoses.length} 件
                    </td>
                    <td className="chart-actions-cell">
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteChart(chart.name)}
                        disabled={deletingChart === chart.name}
                      >
                        {deletingChart === chart.name ? '削除中...' : '削除'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 使用方法の説明 */}
        <div className="help-section">
          <details>
            <summary className="help-summary">使用方法</summary>
            <div className="help-content">
              <h3>CSVファイルの作成方法</h3>
              <ol>
                <li>UTF-8 BOM付きのCSVファイルを作成してください</li>
                <li>基本情報パート：チャート名、タイプ（decision/single/multi）</li>
                <li>空行を1行挿入</li>
                <li>設問パート：ヘッダー行 + 設問データ（カテゴリフィールドを含む）</li>
                <li>空行を1行挿入</li>
                <li>診断結果パート：ヘッダー行 + 診断結果データ（カテゴリフィールドを含む）</li>
              </ol>
              <h4>チャートタイプの違い:</h4>
              <ul>
                <li><strong>decision</strong>: 選択により分岐し、最終的に1つの診断結果を表示</li>
                <li><strong>single</strong>: ポイントを累積し、合計ポイントの範囲で診断結果を特定</li>
                <li><strong>multi</strong>: カテゴリ別にポイントを管理し、表形式で結果を表示</li>
              </ul>
              <p>
                詳細な仕様については、設計ドキュメントの「chart.md」を参照してください。<br/>
                samples/フォルダに各タイプのサンプルCSVもあります。
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default ChartList;