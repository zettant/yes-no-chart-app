import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentResult, getSelectedChart, clearAllStorage } from '../storage';
import { parseChartData, saveResult } from '../api';
import { indexedDBHelper } from '../indexeddb';
import type { IResult, IChart, IDiagnosis, IPoint } from '../types';

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
      
      // チャートタイプ別の診断結果処理
      if (chart.type === 'decision') {
        // decisionタイプ：診断結果IDで直接特定
        setDiagnosis(diagnosisResult);
        
      } else if (chart.type === 'single' && result.currentPoint !== undefined) {
        // singleタイプ：ポイント範囲で診断結果を決定
        const pointBasedDiagnosis = chart.diagnoses.find(d => 
          result.currentPoint! >= d.lower && result.currentPoint! < d.upper
        );
        if (pointBasedDiagnosis) {
          setDiagnosis(pointBasedDiagnosis);
        } else {
          setDiagnosis(diagnosisResult); // フォールバック
        }
        
      } else if (chart.type === 'multi') {
        // multiタイプ：最初の診断結果をデフォルトとして設定（表示は別ロジック）
        setDiagnosis(diagnosisResult);
        
      } else {
        // 旧来のpointタイプ（後方互換性のため保持）
        if (result.currentPoint !== undefined) {
          const pointBasedDiagnosis = chart.diagnoses.find(d => 
            result.currentPoint! >= d.lower && result.currentPoint! <= d.upper
          );
          if (pointBasedDiagnosis) {
            setDiagnosis(pointBasedDiagnosis);
          } else {
            setDiagnosis(diagnosisResult);
          }
        } else {
          setDiagnosis(diagnosisResult);
        }
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
      
      try {
        // サーバーに診断結果を送信
        await saveResult(currentResult);
        
        setSaveComplete(true);
        
        // ローカルストレージをクリア
        clearAllStorage();
        
      } catch (networkError) {
        console.warn('サーバへの送信に失敗、IndexedDBに保存:', networkError);
        
        // 通信不能の場合はIndexedDBに保存
        try {
          await indexedDBHelper.saveOfflineResult(currentResult);
          setSaveComplete(true);
          clearAllStorage();
          
          // ユーザーにオフライン保存したことを通知
          setError('ネットワークエラーのため、結果をオフライン保存しました。次回オンライン時に自動送信されます。');
          
        } catch (offlineError) {
          console.error('オフライン保存にも失敗:', offlineError);
          throw new Error('結果の保存に失敗しました。ブラウザのストレージ容量を確認してください。');
        }
      }
      
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
          {chartData.type === 'decision' && (
            // decisionタイプ：診断結果の文章を大きく表示
            <div className="result-diagnosis">
              <h2 className="diagnosis-text">
                {diagnosis.sentence}
              </h2>
            </div>
          )}
          
          {chartData.type === 'single' && (
            // singleタイプ：ポイント範囲に基づく診断結果を表示
            <div className="result-diagnosis">
              <h2 className="diagnosis-text">
                {diagnosis.sentence}
              </h2>
              {currentResult.currentPoint !== undefined && (
                <div className="result-points">
                  <p className="points-display">
                    あなたのスコア: {currentResult.currentPoint} ポイント
                  </p>
                  <p className="points-range">
                    ({diagnosis.lower}以上 {diagnosis.upper}未満の範囲)
                  </p>
                </div>
              )}
            </div>
          )}
          
          {chartData.type === 'multi' && currentResult.currentPoints && (
            // multiタイプ：カテゴリ別の結果を2カラム表で表示
            <div className="result-multi">
              <table className="multi-result-table">
                <thead>
                  <tr>
                    <th>カテゴリ</th>
                    <th>ポイント</th>
                    <th>診断結果</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 最高・最低ポイントを特定
                    const points = currentResult.currentPoints.map(p => p.point);
                    const maxPoint = Math.max(...points);
                    const minPoint = Math.min(...points);
                    
                    return currentResult.currentPoints.map((point: IPoint) => {
                      // 各カテゴリのポイントに対応する診断結果を特定
                      const categoryDiagnosis = chartData.diagnoses.find(d => 
                        d.category === point.category && 
                        point.point >= d.lower && 
                        point.point < d.upper
                      );
                      
                      // 最高・最低ポイントに応じてCSSクラスを決定
                      let rowClass = '';
                      if (point.point === maxPoint && point.point === minPoint) {
                        // 全て同じポイントの場合はデフォルト色
                        rowClass = '';
                      } else if (point.point === maxPoint) {
                        rowClass = 'highest-score';
                      } else if (point.point === minPoint) {
                        rowClass = 'lowest-score';
                      }
                      
                      return (
                        <tr key={point.category} className={rowClass}>
                          <td className="category-name">{point.category}</td>
                          <td className="category-score">{point.point}ポイント</td>
                          <td className="category-diagnosis">
                            {categoryDiagnosis ? categoryDiagnosis.sentence : '診断結果なし'}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
          
          {(chartData.type === 'point' || (!chartData.type || chartData.type === '')) && (
            // 旧来のpointタイプ（後方互換性のため保持）
            <div className="result-diagnosis">
              <h2 className="diagnosis-text">
                {diagnosis.sentence}
              </h2>
              {currentResult.currentPoint !== undefined && (
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
          )}
        </div>
        
        {/* 診断情報サマリー */}
        <div className="result-summary">
          <h3 className="summary-title">診断概要</h3>
          <div className="summary-details">
            <p><strong>実施日時:</strong> {new Date(currentResult.timestamp).toLocaleString('ja-JP')}</p>
            <p><strong>回答数:</strong> {currentResult.history.length} 問</p>
            {(chartData.type === 'single' || chartData.type === 'point') && currentResult.currentPoint !== undefined && (
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