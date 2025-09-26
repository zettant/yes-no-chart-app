import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCameraStream, stopCameraStream, capturePhotoFromVideo } from '../camera';
import { getSelectedChart, saveCurrentResult, getCurrentResult } from '../storage';
import type { IResult } from '../types';

/**
 * 写真登録画面コンポーネント
 * カメラで名刺撮影を行い、チャート画面に遷移
 */
const PhotoCapture: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState<boolean>(false);        // カメラストリーミング状態
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null); // 撮影された写真のBase64データ
  const [error, setError] = useState<string | null>(null);              // エラーメッセージ
  const [isProcessing, setIsProcessing] = useState<boolean>(false);     // 処理中状態

  /**
   * コンポーネントマウント時にリロード処理とカメラ初期化
   */
  useEffect(() => {
    // リロード時の処理：写真登録画面でリロードされた場合はチャート選択画面に戻る
    // ページがリロードされた場合を判定
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isReload = navigationEntry?.type === 'reload' ||
                     (window.performance as any).navigation?.type === 1;
    
    if (isReload) {
      window.location.href = '/chart/';
      return;
    }

    // 通常の画面遷移時：選択されたチャートがない場合はチャート選択画面に戻る
    const selectedChartJson = getSelectedChart();
    if (!selectedChartJson) {
      window.location.href = '/chart/';
      return;
    }

    // カメラ初期化
    initializeCamera();

    // クリーンアップ関数でカメラストリームを停止
    return () => {
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
      }
    };
  }, [navigate]);

  /**
   * カメラストリームを初期化
   */
  const initializeCamera = async () => {
    try {
      console.log('カメラ初期化開始...');
      setError(null);
      
      // カメラストリームを取得
      console.log('カメラストリーム取得中...');
      const stream = await getCameraStream();
      console.log('カメラストリーム取得完了:', stream);
      streamRef.current = stream;

      // video要素にストリームを設定
      if (videoRef.current) {
        console.log('video要素にストリーム設定中...');
        videoRef.current.srcObject = stream;
        
        // videoの読み込み完了を待つ
        videoRef.current.onloadedmetadata = () => {
          console.log('ビデオメタデータ読み込み完了');
          console.log('video.videoWidth:', videoRef.current?.videoWidth);
          console.log('video.videoHeight:', videoRef.current?.videoHeight);
          setIsStreaming(true);
        };
        
        videoRef.current.onerror = (e) => {
          console.error('ビデオ要素エラー:', e);
          setError('ビデオの表示に失敗しました');
        };
      } else {
        console.error('video要素が見つかりません');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'カメラの初期化に失敗しました';
      setError(errorMessage);
      console.error('カメラ初期化エラー:', err);
    }
  };

  /**
   * 写真撮影ハンドラー
   */
  const handleCapture = () => {
    try {
      console.log('撮影ボタンがクリックされました');
      console.log('videoRef.current:', videoRef.current);
      console.log('streamRef.current:', streamRef.current);
      console.log('isStreaming:', isStreaming);
      
      if (!videoRef.current || !streamRef.current) {
        throw new Error('カメラが初期化されていません');
      }

      // videoElementの状態を確認
      const video = videoRef.current;
      console.log('video.videoWidth:', video.videoWidth);
      console.log('video.videoHeight:', video.videoHeight);
      console.log('video.readyState:', video.readyState);
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('ビデオストリームが準備できていません');
      }

      setIsProcessing(true);
      
      // videoエレメントから写真を撮影してBase64で取得
      console.log('写真撮影を開始します...');
      const photoBase64 = capturePhotoFromVideo(videoRef.current, 0.8);
      console.log('撮影完了、Base64長:', photoBase64.length);
      setCapturedPhoto(photoBase64);
      
      // カメラストリームを停止
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      setIsStreaming(false);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '写真撮影に失敗しました';
      setError(errorMessage);
      console.error('写真撮影エラー:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 取り直しハンドラー
   * 撮影した写真を破棄してカメラを再初期化
   */
  const handleRetake = () => {
    setCapturedPhoto(null);
    setError(null);
    initializeCamera();
  };

  /**
   * 進むボタンハンドラー
   * 撮影した写真を既存のIResultオブジェクトに追加してチャート画面に遷移
   */
  const handleProceed = () => {
    try {
      if (!capturedPhoto) {
        throw new Error('写真が撮影されていません');
      }

      // 既存のIResultオブジェクトを取得
      const currentResult = getCurrentResult();
      if (!currentResult) {
        throw new Error('診断結果データが見つかりません');
      }

      setIsProcessing(true);

      // 写真データを追加
      const updatedResult: IResult = {
        ...currentResult,
        photo: capturedPhoto
      };

      // ローカルストレージに保存
      saveCurrentResult(updatedResult);
      
      // チャート画面に遷移
      navigate('/chart');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '処理中にエラーが発生しました';
      setError(errorMessage);
      console.error('進む処理エラー:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 戻るボタンハンドラー
   * チャート選択画面に戻る
   */
  const handleGoBack = () => {
    // カメラストリームを停止
    if (streamRef.current) {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    }
    window.location.href = '/chart/';
  };

  /**
   * エラー発生時の表示
   */
  if (error && !capturedPhoto) {
    return (
      <div className="photo-capture-container">
        <div className="error-container">
          <h2 className="error-title">エラーが発生しました</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button 
              className="retry-button"
              onClick={initializeCamera}
            >
              カメラを再試行
            </button>
            <button 
              className="back-button"
              onClick={() => navigate('/')}
            >
              チャート選択に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * メイン表示
   */
  return (
    <div className="photo-capture-container">
      <div className="photo-capture-content">
        {/* 戻るボタン（右上） */}
        <button 
          className="exit-button"
          onClick={handleGoBack}
          disabled={isProcessing}
        >
          ×
        </button>
        
        <h1 className="photo-capture-title">
          {capturedPhoto ? '撮影完了' : '名刺を撮影してください'}
        </h1>
        
        {/* カメラプレビューまたは撮影済み写真 */}
        <div className="camera-container">
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            playsInline
            muted
            style={{ display: isStreaming && !capturedPhoto ? 'block' : 'none' }}
          />
          
          {capturedPhoto && (
            <img
              src={`data:image/jpeg;base64,${capturedPhoto}`}
              alt="撮影された写真"
              className="captured-photo"
            />
          )}
        </div>
        
        {/* エラーメッセージ */}
        {error && (
          <div className="error-message-banner">
            <p>{error}</p>
          </div>
        )}
        
        {/* コントロールボタン */}
        <div className="photo-controls">
          {!capturedPhoto ? (
            // 撮影前のボタン
            <button
              className="capture-button"
              onClick={handleCapture}
              disabled={!isStreaming || isProcessing}
            >
              {isProcessing ? '処理中...' : '撮影'}
            </button>
          ) : (
            // 撮影後のボタン
            <div className="post-capture-controls">
              <button
                className="retake-button"
                onClick={handleRetake}
                disabled={isProcessing}
              >
                取り直し
              </button>
              <button
                className="proceed-button"
                onClick={handleProceed}
                disabled={isProcessing}
              >
                {isProcessing ? '処理中...' : '進む'}
              </button>
            </div>
          )}
        </div>
        
        {/* 説明文 */}
        <div className="photo-instructions">
          <p>
            {!capturedPhoto 
              ? '名刺全体がフレームに収まるように撮影してください'
              : '撮影内容を確認して、問題なければ「進む」を押してください'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhotoCapture;