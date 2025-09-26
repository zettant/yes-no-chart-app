import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentResult, getSelectedChart, clearAllStorage } from '../storage';
import { parseChartData, saveResult } from '../api';
import type { IResult, IChart, IDiagnosis } from '../types';

/**
 * 結果表示画面コンポーネント
 * 診断結果を表示し、サーバーに結果を送信
 */
const ResultDisplay: React.FC = () => {
  const navigate = useNavigate();
  
  const [currentResult, setCurrentResult] = useState<IResult | null>(null); // 診断結果
  const [chartData, setChartData] = useState<IChart | null>(null);         // チャートデータ
  const [diagnosis, setDiagnosis] = useState<IDiagnosis | null>(null);      // 診断内容
  const [isSaving, setIsSaving] = useState<boolean>(false);                // 保存中状態
  const [saveComplete, setSaveComplete] = useState<boolean>(false);        // 保存完了状態
  const [error, setError] = useState<string | null>(null);                // エラーメッセージ

  /**
   * コンポーネントマウント時に結果表示初期化
   */
  useEffect(() => {
    // 結果表示を初期化（リロード時も同じ画面表示に戻す）
    initializeResult();
  }, [navigate]);

  /**
   * 診断結果を初期化
   */
  const initializeResult = () => {
    try {
      const result = getCurrentResult();
      const selectedChartJson = getSelectedChart();
      
      if (!result || !selectedChartJson) {
        // 診断結果またはチャートデータがない場合はチャート選択画面に戻る
        window.location.href = '/chart/';
        return;
      }
      
      // 診断結果が完了していない場合（diagnosisIdがない場合）はチャート選択画面に戻る
      if (!result.diagnosisId) {
        window.location.href = '/chart/';
        return;
      }
      
      const chart = parseChartData(selectedChartJson);
      setChartData(chart);
      setCurrentResult(result);
      
      // 診断結果を特定
      const diagnosisResult = chart.diagnoses.find(d => d.id === result.diagnosisId);
      if (!diagnosisResult) {
        throw new Error('診断結果が見つかりません');
      }
      
      // ポイント型チャートの場合、ポイント範囲で診断結果を決定
      if (chart.type === 'point' && result.currentPoint !== undefined) {
        const pointBasedDiagnosis = chart.diagnoses.find(d => 
          result.currentPoint! >= d.lower && result.currentPoint! <= d.upper
        );
        if (pointBasedDiagnosis) {
          setDiagnosis(pointBasedDiagnosis);
        } else {
          setDiagnosis(diagnosisResult); // フォールバック
        }
      } else {
        setDiagnosis(diagnosisResult);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '結果表示の初期化に失敗しました';
      setError(errorMessage);
      console.error('結果表示初期化エラー:', err);
    }
  };

  /**
   * 終了ボタンハンドラー
   * 診断結果をサーバーに送信してからチャート選択画面に戻る
   */
  const handleFinish = async () => {
    if (!currentResult || saveComplete) {
      // 既に保存済みの場合はチャート選択画面に戻る
      handleBackToSelection();
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      // サーバーに診断結果を送信
      await saveResult(currentResult);
      
      setSaveComplete(true);
      
      // ローカルストレージをクリア
      clearAllStorage();
      
      // 少し遅延してからチャート選択画面に戻る
      setTimeout(() => {
        handleBackToSelection();
      }, 1500);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '診断結果の保存に失敗しました';
      setError(errorMessage);
      console.error('診断結果保存エラー:', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * チャート選択画面に戻る
   */
  const handleBackToSelection = () => {
    clearAllStorage();
    window.location.href = '/chart/';
  };

  /**
   * エラー発生時の表示
   */
  if (error && !diagnosis) {
    return (
      <div className="result-display-container">
        <div className="error-container">
          <h2 className="error-title">エラーが発生しました</h2>
          <p className="error-message">{error}</p>
          <button 
            className="back-button"
            onClick={handleBackToSelection}
          >
            チャート選択に戻る
          </button>
        </div>
      </div>
    );
  }

  /**
   * ローディング中の表示
   */
  if (!diagnosis || !currentResult || !chartData) {
    return (
      <div className="result-display-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">診断結果を準備中...</p>
        </div>
      </div>
    );
  }

  /**
   * メイン表示（結果表示画面）
   */
  return (
    <div className="result-display-container">
      <div className="result-display-content">
        {/* ヘッダー */}
        <div className="result-header">
          <h1 className="result-title">診断結果</h1>
          <p className="result-chart-name">{chartData.name}</p>
        </div>
        
        {/* 診断結果 */}
        <div className="result-content">
          <div className="result-diagnosis">
            <h2 className="diagnosis-text">
              {diagnosis.sentence}
            </h2>
          </div>
          
          {/* ポイント表示（ポイント型の場合） */}
          {chartData.type === 'point' && currentResult.currentPoint !== undefined && (
            <div className="result-points">
              <p className="points-display">
                あなたのスコア: {currentResult.currentPoint} ポイント
              </p>
              <p className="points-range">
                ({diagnosis.lower} - {diagnosis.upper} ポイントの範囲)
              </p>
            </div>
          )}
        </div>
        
        {/* 診断情報サマリー */}
        <div className="result-summary">
          <h3 className="summary-title">診断概要</h3>
          <div className="summary-details">
            <p><strong>実施日時:</strong> {new Date(currentResult.timestamp).toLocaleString('ja-JP')}</p>
            <p><strong>回答数:</strong> {currentResult.history.length} 問</p>
            {chartData.type === 'point' && (
              <p><strong>最終スコア:</strong> {currentResult.currentPoint} ポイント</p>
            )}
          </div>
        </div>
        
        {/* エラーメッセージ */}
        {error && (
          <div className="error-message-banner">
            <p className="error-text">{error}</p>
          </div>
        )}
        
        {/* 保存完了メッセージ */}
        {saveComplete && (
          <div className="success-message-banner">
            <p className="success-text">
              診断結果を正常に保存しました。ありがとうございました。
            </p>
          </div>
        )}
        
        {/* 終了ボタン */}
        <div className="result-actions">
          <button
            className="finish-button"
            onClick={handleFinish}
            disabled={isSaving}
          >
            {isSaving 
              ? '保存中...' 
              : saveComplete 
                ? 'チャート選択に戻る' 
                : '終了'}
          </button>
        </div>
        
        {/* 処理状況表示 */}
        {isSaving && (
          <div className="saving-indicator">
            <div className="saving-spinner"></div>
            <p className="saving-text">診断結果を保存しています...</p>
          </div>
        )}
        
        {/* デバッグ情報（開発時のみ） */}
        {import.meta.env.DEV && (
          <div className="debug-info">
            <details>
              <summary>デバッグ情報</summary>
              <pre>{JSON.stringify({
                diagnosis,
                currentResult,
                chartType: chartData.type
              }, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultDisplay;