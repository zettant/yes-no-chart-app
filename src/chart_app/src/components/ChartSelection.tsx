import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCharts, parseChartData } from '../api';
import { saveSelectedChart, clearAllStorage, saveCurrentResult } from '../storage';
import type { IChart, IResult } from '../types';

/**
 * 現在時刻をJST（日本標準時）のISO8601形式文字列として取得する
 * @returns JST時刻のISO8601形式文字列（例: "2024-12-25T15:30:45+09:00"）
 */
const getCurrentJSTTimestamp = (): string => {
  const now = new Date();
  
  // 日本時間に変換（UTC + 9時間）
  const jstOffset = 9 * 60; // 9時間を分で表現
  const jstTime = new Date(now.getTime() + (jstOffset * 60 * 1000));
  
  // ISO8601形式にしてタイムゾーン情報を日本時間として設定
  return jstTime.toISOString().replace('Z', '+09:00');
};

/**
 * チャート選択画面コンポーネント
 * 保存済みのチャートから選択して写真登録画面に遷移
 */
const ChartSelection: React.FC = () => {
  const navigate = useNavigate();
  const [charts, setCharts] = useState<IChart[]>([]);       // 取得したチャート一覧
  const [loading, setLoading] = useState<boolean>(true);    // ローディング状態
  const [error, setError] = useState<string | null>(null);  // エラーメッセージ

  /**
   * コンポーネントマウント時にチャート一覧を取得
   */
  useEffect(() => {
    const loadCharts = async () => {
      try {
        setLoading(true);
        setError(null);

        // ローカルストレージをクリア（新しいセッション開始）
        // 注意: 他の画面から遷移してきた場合はクリアしない
        const currentPath = window.location.pathname;
        if (currentPath === '/' || currentPath === '/chart/' || currentPath === '/chart') {
          clearAllStorage();
        }

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

    loadCharts();
  }, []);

  /**
   * チャート選択ハンドラー
   * 選択されたチャートをローカルストレージに保存し、IResultオブジェクトを作成して写真登録画面に遷移
   * @param chart - 選択されたチャート
   */
  const handleChartSelect = (chart: IChart) => {
    try {
      console.log('チャート選択開始:', chart.name);
      
      // 選択されたチャートをJSON文字列でローカルストレージに保存
      const chartJson = JSON.stringify(chart);
      saveSelectedChart(chartJson);
      console.log('チャートデータ保存完了');
      
      // IResultオブジェクトを作成
      const resultData: IResult = {
        chartName: chart.name,
        chartType: chart.type,
        timestamp: getCurrentJSTTimestamp(),  // 現在時刻をJST（日本標準時）で設定
        photo: '',  // 写真は写真登録画面で設定
        currentQId: chart.questions[0]?.id,  // 最初の設問IDを設定
        currentPoint: chart.type === 'point' ? 0 : undefined,  // ポイント型の場合は0で初期化
        history: []  // 履歴は空で開始
      };

      // IResultオブジェクトをローカルストレージに保存
      saveCurrentResult(resultData);
      console.log('IResultデータ保存完了:', resultData);
      
      // 写真登録画面に遷移
      console.log('写真画面に遷移中...');
      navigate('/photo');
    } catch (err) {
      console.error('チャート選択エラー:', err);
      setError('チャート選択時にエラーが発生しました');
    }
  };

  /**
   * ローディング中の表示
   */
  if (loading) {
    return (
      <div className="chart-selection-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">チャート一覧を読み込み中...</p>
        </div>
      </div>
    );
  }

  /**
   * エラー発生時の表示
   */
  if (error) {
    return (
      <div className="chart-selection-container">
        <div className="error-container">
          <h2 className="error-title">エラーが発生しました</h2>
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  /**
   * チャートが未登録の場合の表示
   */
  if (charts.length === 0) {
    return (
      <div className="chart-selection-container">
        <div className="no-charts-container">
          <h2 className="no-charts-title">チャートが未登録です</h2>
          <p className="no-charts-message">
            診断チャートが登録されていません。<br/>
            設定アプリからチャートを登録してください。
          </p>
          <button 
            className="settings-link-button"
            onClick={() => window.open('/setting', '_blank')}
          >
            設定アプリを開く
          </button>
        </div>
      </div>
    );
  }

  /**
   * メイン表示（チャート選択画面）
   */
  return (
    <div className="chart-selection-container">
      <div className="chart-selection-content">
        <h1 className="chart-selection-title">診断チャートを選択してください</h1>
        <p className="chart-selection-subtitle">
          利用したいチャートを選んで診断を開始します
        </p>
        
        <div className="chart-buttons-container">
          {charts.map((chart) => (
            <button
              key={chart.name}
              className="chart-selection-button"
              onClick={() => handleChartSelect(chart)}
            >
              <div className="chart-button-content">
                <h3 className="chart-name">{chart.name}</h3>
                <p className="chart-type">
                  タイプ: {chart.type === 'decision' ? '判定型' : 'ポイント型'}
                </p>
                <p className="chart-questions-count">
                  設問数: {chart.questions.length}問
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChartSelection;