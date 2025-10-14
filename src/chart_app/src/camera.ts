/**
 * カメラ機能のユーティリティファイル
 * 写真撮影とBase64変換を担当
 */

/**
 * カメラの種類を表すタイプ
 */
export type CameraFacingMode = 'user' | 'environment';

/**
 * カメラストリームを取得
 * @param facingMode カメラの向き ('user': インカメラ, 'environment': バックカメラ)
 * @returns MediaStream オブジェクト
 */
export const getCameraStream = async (facingMode: CameraFacingMode = 'environment'): Promise<MediaStream> => {
  try {
    // ユーザーのカメラにアクセス許可を要求
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },  // 理想的な幅
        height: { ideal: 720 },  // 理想的な高さ
        facingMode: facingMode   // カメラの向きを指定
      },
      audio: false // 音声は不要
    });
    return stream;
  } catch (error) {
    console.error('カメラアクセスに失敗しました:', error);
    throw new Error('カメラへのアクセスが拒否されました');
  }
};

/**
 * カメラストリームを停止
 * @param stream - 停止するMediaStreamオブジェクト
 */
export const stopCameraStream = (stream: MediaStream): void => {
  // すべてのトラックを停止してカメラリソースを解放
  stream.getTracks().forEach(track => {
    track.stop();
  });
};

/**
 * videoエレメントから写真を撮影してBase64形式で取得
 * @param videoElement - 撮影対象のvideo要素
 * @param quality - JPEG品質（0.0-1.0、デフォルト0.8）
 * @returns Base64エンコードされたJPEG画像文字列
 */
export const capturePhotoFromVideo = (
  videoElement: HTMLVideoElement, 
  quality: number = 0.8
): string => {
  try {
    // canvasエレメントを作成して画像をキャプチャ
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas contextの取得に失敗しました');
    }

    // canvasサイズをvideoサイズに設定
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    // videoの現在のフレームをcanvasに描画
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // canvasの内容をJPEGでBase64エンコード
    const base64Image = canvas.toDataURL('image/jpeg', quality);
    
    // data:image/jpeg;base64, プレフィックスを除去
    return base64Image.replace(/^data:image\/jpeg;base64,/, '');
  } catch (error) {
    console.error('写真撮影に失敗しました:', error);
    throw new Error('写真撮影に失敗しました');
  }
};

/**
 * ファイル入力から画像を読み込んでBase64形式で取得（デバッグ用）
 * @param file - 画像ファイル
 * @returns Base64エンコードされた画像文字列のPromise
 */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const result = reader.result as string;
        // data:image/*;base64, プレフィックスを除去
        const base64 = result.split(',')[1];
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイル読み込みに失敗しました'));
    };
    
    reader.readAsDataURL(file);
  });
};