import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentResult, saveCurrentResult, getSelectedChart } from '../storage';
import { parseChartData } from '../api';
import type { IResult, IChart, IQuestion, IHistory } from '../types';

/**
 * チャート画面コンポーネント
 * Yes/Noチャートを表示し、設問の遷移を管理
 */
const ChartDisplay: React.FC = () => {
  const navigate = useNavigate();
  
  const [chartData, setChartData] = useState<IChart | null>(null);        // チャートデータ
  const [currentResult, setCurrentResult] = useState<IResult | null>(null); // 現在の診断結果
  const [currentQuestion, setCurrentQuestion] = useState<IQuestion | null>(null); // 現在の設問
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);  // 画面遷移エフェクト状態
  const [isFinalTransition, setIsFinalTransition] = useState<boolean>(false); // 結果画面遷移エフェクト状態
  const [error, setError] = useState<string | null>(null);                // エラーメッセージ

  /**
   * コンポーネントマウント時に状態を復元または初期化
   */
  useEffect(() => {
    initializeChartState();
  }, []);

  /**
   * チャート状態を初期化
   * ローカルストレージから状態復元またはチャート選択画面からの初期化
   */
  const initializeChartState = () => {
    try {
      // ローカルストレージから現在の診断結果を取得（リロード復帰用）
      const savedResult = getCurrentResult();
      const selectedChartJson = getSelectedChart();
      
      if (!selectedChartJson) {
        // チャート情報がない場合はチャート選択画面に戻る
        window.location.href = '/chart/';
        return;
      }
      
      // チャートデータをパース
      const chart = parseChartData(selectedChartJson);
      setChartData(chart);
      
      if (savedResult) {
        // 保存された状態から復元（リロード復帰）
        setCurrentResult(savedResult);
        
        // 現在の設問を特定
        const currentQ = chart.questions.find(q => q.id === savedResult.currentQId);
        if (currentQ) {
          setCurrentQuestion(currentQ);
        } else {
          throw new Error('現在の設問が見つかりません');
        }
      } else {
        // 新規開始の場合、写真登録画面に戻る
        navigate('/photo', { replace: true });
        return;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'チャート初期化に失敗しました';
      setError(errorMessage);
      console.error('チャート初期化エラー:', err);
    }
  };

  /**
   * 選択肢選択ハンドラー
   * @param choiceIndex - 選択された選択肢のインデックス
   */
  const handleChoiceSelect = async (choiceIndex: number) => {
    if (!currentQuestion || !currentResult || !chartData) {
      return;
    }

    try {
      setIsTransitioning(true);
      
      // 選択履歴を更新
      const newHistory: IHistory = {
        questionId: currentQuestion.id,
        choise: choiceIndex
      };
      
      const updatedHistory = [...currentResult.history, newHistory];
      
      // 遷移先の特定
      const nextId = currentQuestion.nexts[choiceIndex];
      
      let updatedResult: IResult;
      
      if (currentQuestion.isLast) {
        // 最終設問の場合、診断結果IDとして処理
        let diagnosisId: number;
        let finalPoint = currentResult.currentPoint || 0;
        
        if (chartData.type === 'point') {
          // ポイント型チャートの場合、選択肢のポイント値を加算
          const selectedPoint = currentQuestion.points ? currentQuestion.points[choiceIndex] : choiceIndex + 1;
          finalPoint += selectedPoint;
          
          // ポイント範囲で診断結果を特定
          const diagnosis = chartData.diagnoses.find(d => 
            finalPoint >= d.lower && finalPoint <= d.upper
          );
          
          if (!diagnosis) {
            throw new Error('ポイントに対応する診断結果が見つかりません');
          }
          
          diagnosisId = diagnosis.id;
        } else {
          // 判定型チャートの場合、遷移先がそのまま診断結果ID
          diagnosisId = nextId;
        }
        
        updatedResult = {
          ...currentResult,
          diagnosisId,
          currentPoint: finalPoint,
          history: updatedHistory
        };
        
        // 結果画面に遷移
        setCurrentResult(updatedResult);
        saveCurrentResult(updatedResult);
        
        // ブラーエフェクトを開始
        setIsFinalTransition(true);
        
        // ブラーエフェクトの後に結果画面に遷移
        setTimeout(() => {
          navigate('/result');
        }, 800);
        
      } else {
        // 途中設問の場合、次の設問に遷移
        let nextQuestionId: number;
        let updatedPoint = currentResult.currentPoint || 0;
        
        if (chartData.type === 'point') {
          // ポイント型チャートの場合、選択肢のポイント値を加算
          const selectedPoint = currentQuestion.points ? currentQuestion.points[choiceIndex] : choiceIndex + 1;
          updatedPoint += selectedPoint;
          
          // 次の設問IDは現在のID + 1（順次進行）
          nextQuestionId = currentQuestion.id + 1;
        } else {
          // 判定型チャートの場合、遷移先がそのまま次の設問ID
          nextQuestionId = nextId;
        }
        
        const nextQuestion = chartData.questions.find(q => q.id === nextQuestionId);
        
        if (!nextQuestion) {
          throw new Error('次の設問が見つかりません');
        }
        
        updatedResult = {
          ...currentResult,
          currentQId: nextQuestion.id,
          currentPoint: updatedPoint,
          history: updatedHistory
        };
        
        // 状態を更新してローカルストレージに保存
        setCurrentResult(updatedResult);
        saveCurrentResult(updatedResult);
        
        // スクロールアップエフェクトの後に次の設問を表示
        setTimeout(() => {
          setCurrentQuestion(nextQuestion);
          setIsTransitioning(false);
        }, 600);
        
        return; // 早期リターンで下のsetIsTransitioning(false)をスキップ
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '選択処理中にエラーが発生しました';
      setError(errorMessage);
      console.error('選択処理エラー:', err);
    }
    
    setIsTransitioning(false);
  };

  /**
   * 終了ボタンハンドラー
   * チャート選択画面に強制的に戻る
   */
  const handleExit = () => {
    window.location.href = '/chart/';
  };

  /**
   * エラー発生時の表示
   */
  if (error) {
    return (
      <div className="chart-display-container">
        <div className="error-container">
          <h2 className="error-title">エラーが発生しました</h2>
          <p className="error-message">{error}</p>
          <button 
            className="back-button"
            onClick={() => navigate('/')}
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
  if (!currentQuestion || !chartData) {
    return (
      <div className="chart-display-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">チャートを読み込み中...</p>
        </div>
      </div>
    );
  }

  /**
   * メイン表示（チャート画面）
   */
  return (
    <div className={`chart-display-container ${
      isFinalTransition ? 'final-transition' : 
      isTransitioning ? 'transitioning' : ''
    }`}>
      {/* ヘッダー */}
      <div className="chart-header">
        <h2 className="chart-name">{chartData.name}</h2>
        <button 
          className="exit-button"
          onClick={handleExit}
        >
          終了
        </button>
      </div>
      
      {/* 進捗表示 */}
      <div className="progress-indicator">
        <p className="progress-text">
          設問 {currentResult?.history.length || 0 + 1} / {chartData.questions.length}
        </p>
        {chartData.type === 'point' && currentResult?.currentPoint !== undefined && (
          <p className="point-display">
            現在のポイント: {currentResult.currentPoint}
          </p>
        )}
      </div>
      
      {/* 設問文 */}
      <div className="question-container">
        <h1 className="question-text">
          {currentQuestion.sentence}
        </h1>
      </div>
      
      {/* 選択肢ボタン */}
      <div className="choices-container">
        {currentQuestion.choises.map((choice, index) => (
          <button
            key={index}
            className="choice-button"
            onClick={() => handleChoiceSelect(index)}
            disabled={isTransitioning}
          >
            {choice}
          </button>
        ))}
      </div>
      
      {/* 選択履歴表示（デバッグ用、本番では非表示） */}
      {import.meta.env.DEV && (
        <div className="debug-info">
          <details>
            <summary>デバッグ情報</summary>
            <pre>{JSON.stringify(currentResult?.history, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ChartDisplay;