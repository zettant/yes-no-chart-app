import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { readCSVFile, parseCSVToChart } from '../csvParser';
import { registerChart } from '../api';
import type { IChart } from '../types';

/**
 * 新規登録画面コンポーネント
 * CSVファイルをアップロードしてチャートを登録
 */
const ChartCreate: React.FC = () => {
  const navigate = useNavigate();
  
  const [csvFile, setCsvFile] = useState<File | null>(null);          // アップロードされたCSVファイル
  const [chartData, setChartData] = useState<IChart | null>(null);    // パースされたチャートデータ
  const [isProcessing, setIsProcessing] = useState<boolean>(false);   // 処理中状態
  const [isRegistering, setIsRegistering] = useState<boolean>(false); // 登録中状態
  const [error, setError] = useState<string | null>(null);           // エラーメッセージ
  const [success, setSuccess] = useState<boolean>(false);            // 成功状態
  const [questionsExpanded, setQuestionsExpanded] = useState<boolean>(false); // 設問一覧展開状態
  const [diagnosesExpanded, setDiagnosesExpanded] = useState<boolean>(false); // 診断結果展開状態

  /**
   * ファイルドロップハンドラー
   * CSVファイルを受け取ってフォーマットチェックを実行
   */
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      return;
    }

    const file = acceptedFiles[0];
    
    // ファイル拡張子チェック
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('CSVファイルを選択してください');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setChartData(null);
      setSuccess(false);

      // CSVファイルを読み込み
      const csvText = await readCSVFile(file);
      
      // CSVをチャートデータにパース
      const parsedChart = parseCSVToChart(csvText);
      
      // 成功時、状態を更新
      setCsvFile(file);
      setChartData(parsedChart);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'CSVファイルの処理に失敗しました';
      setError(errorMessage);
      console.error('CSV処理エラー:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * React Dropzoneの設定
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  });

  /**
   * ファイル選択リセット
   */
  const handleResetFile = () => {
    setCsvFile(null);
    setChartData(null);
    setError(null);
    setSuccess(false);
  };

  /**
   * チャート保存ハンドラー
   */
  const handleSaveChart = async () => {
    if (!chartData) {
      setError('チャートデータが準備されていません');
      return;
    }

    try {
      setIsRegistering(true);
      setError(null);

      // バックエンドにチャートを登録
      await registerChart(chartData);
      
      setSuccess(true);
      
      // 少し遅延してからチャート一覧画面に戻る
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'チャート登録に失敗しました';
      setError(errorMessage);
      console.error('チャート登録エラー:', err);
    } finally {
      setIsRegistering(false);
    }
  };

  /**
   * チャート一覧に戻る
   */
  const handleGoBack = () => {
    navigate('/');
  };

  /**
   * メイン表示
   */
  return (
    <div className="chart-create-container">
      <div className="chart-create-content">
        {/* ヘッダー */}
        <div className="chart-create-header">
          <h1 className="chart-create-title">チャート新規登録</h1>
          <button 
            className="back-button"
            onClick={handleGoBack}
            disabled={isRegistering}
          >
            ← 一覧に戻る
          </button>
        </div>

        {/* 成功メッセージ */}
        {success && (
          <div className="success-message-banner">
            <p className="success-text">
              チャートが正常に登録されました。チャート一覧画面に戻ります...
            </p>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="error-message-banner">
            <p className="error-text">{error}</p>
          </div>
        )}

        {!success && (
          <>
            {/* ファイルドロップゾーン */}
            <div className="dropzone-section">
              <h2 className="section-title">CSVファイルをアップロード</h2>
              
              <div 
                {...getRootProps({ 
                  className: `dropzone ${isDragActive ? 'active' : ''} ${chartData ? 'has-file' : ''}` 
                })}
              >
                <input {...getInputProps()} />
                
                {isProcessing ? (
                  <div className="dropzone-processing">
                    <div className="loading-spinner"></div>
                    <p>CSVファイルを処理中...</p>
                  </div>
                ) : chartData ? (
                  <div className="dropzone-success">
                    <div className="success-icon">✅</div>
                    <p className="file-name">{csvFile?.name}</p>
                    <p className="file-status">フォーマットチェック完了</p>
                    <button 
                      className="reset-file-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetFile();
                      }}
                    >
                      ファイルを選び直す
                    </button>
                  </div>
                ) : (
                  <div className="dropzone-placeholder">
                    <div className="upload-icon">📁</div>
                    <p className="dropzone-text">
                      {isDragActive 
                        ? 'CSVファイルをここにドロップしてください'
                        : 'CSVファイルをドラッグ&ドロップまたはクリックして選択'
                      }
                    </p>
                    <p className="dropzone-subtext">
                      UTF-8 BOM付きのCSVファイルをアップロードしてください
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* チャート詳細プレビュー */}
            {chartData && (
              <div className="chart-preview-section">
                <h2 className="section-title">チャート詳細</h2>
                
                <div className="chart-info-grid">
                  <div className="chart-info-item">
                    <strong>チャート名:</strong>
                    <span>{chartData.name}</span>
                  </div>
                  <div className="chart-info-item">
                    <strong>タイプ:</strong>
                    <span className={`chart-type-badge ${chartData.type}`}>
                      {chartData.type === 'decision' ? '分岐型' : 
                       chartData.type === 'single' ? '単一ポイント型' : 
                       chartData.type === 'multi' ? '複数カテゴリ型' : 
                       chartData.type}
                    </span>
                  </div>
                  <div className="chart-info-item">
                    <strong>設問数:</strong>
                    <span>{chartData.questions.length} 問</span>
                  </div>
                  <div className="chart-info-item">
                    <strong>診断結果数:</strong>
                    <span>{chartData.diagnoses.length} 件</span>
                  </div>
                </div>

                {/* 設問プレビュー */}
                <div className="questions-preview">
                  <h3>設問一覧</h3>
                  <div className="questions-list">
                    {(questionsExpanded ? chartData.questions : chartData.questions.slice(0, 3)).map((question) => (
                      <div key={question.id} className="question-item">
                        <div className="question-header">
                          <span className="question-id">設問 {question.id}</span>
                          {question.category && question.category !== 'default' && (
                            <span className="category-badge">[カテゴリ: {question.category}]</span>
                          )}
                          {question.isLast && (
                            <span className="final-question-badge">最終設問</span>
                          )}
                        </div>
                        <p className="question-sentence">{question.sentence}</p>
                        <div className="question-choices">
                          {question.choises.map((choice, index) => (
                            <span key={index} className="choice-tag">
                              {choice}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {chartData.questions.length > 3 && (
                      <button 
                        className="expand-button"
                        onClick={() => setQuestionsExpanded(!questionsExpanded)}
                      >
                        {questionsExpanded 
                          ? '閉じる' 
                          : `他 ${chartData.questions.length - 3} 問を表示...`
                        }
                      </button>
                    )}
                  </div>
                </div>

                {/* 診断結果プレビュー */}
                <div className="diagnoses-preview">
                  <h3>診断結果一覧</h3>
                  <div className="diagnoses-list">
                    {(diagnosesExpanded ? chartData.diagnoses : chartData.diagnoses.slice(0, 5)).map((diagnosis) => (
                      <div key={diagnosis.id} className="diagnosis-item">
                        <div className="diagnosis-header">
                          <span className="diagnosis-id">結果 {diagnosis.id}</span>
                          {diagnosis.category && diagnosis.category !== 'default' && (
                            <span className="category-badge">[カテゴリ: {diagnosis.category}]</span>
                          )}
                          {(chartData.type === 'single' || chartData.type === 'multi') && (
                            <span className="point-range">
                              {diagnosis.lower} - {diagnosis.upper} ポイント
                            </span>
                          )}
                        </div>
                        <p className="diagnosis-sentence">{diagnosis.sentence}</p>
                      </div>
                    ))}
                    {chartData.diagnoses.length > 5 && (
                      <button 
                        className="expand-button"
                        onClick={() => setDiagnosesExpanded(!diagnosesExpanded)}
                      >
                        {diagnosesExpanded 
                          ? '閉じる' 
                          : `他 ${chartData.diagnoses.length - 5} 件を表示...`
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 保存ボタン */}
            {chartData && !error && (
              <div className="save-section">
                <button
                  className="save-button"
                  onClick={handleSaveChart}
                  disabled={isRegistering}
                >
                  {isRegistering ? '登録中...' : 'チャートを登録'}
                </button>
              </div>
            )}
          </>
        )}

        {/* 登録処理中の表示 */}
        {isRegistering && (
          <div className="registering-overlay">
            <div className="registering-modal">
              <div className="loading-spinner"></div>
              <p className="registering-text">チャートを登録しています...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartCreate;