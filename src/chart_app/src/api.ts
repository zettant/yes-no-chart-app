import type { IChart, IResult } from './types';
import { indexedDBHelper } from './indexeddb';
import { saveOfflineCharts, getOfflineCharts } from './storage';

// API calls use relative paths - same domain as the app

/**
 * チャート一覧取得API
 * バックエンドサーバの /api/charts にGETリクエストを送信
 * オフライン時はlocalStorageから取得
 * @returns チャート情報のJSON文字列配列
 */
export const fetchCharts = async (): Promise<string[]> => {
  try {
    const response = await fetch('/api/charts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const charts = await response.json();
    
    // オンライン時はチャート情報をオフライン用に保存
    saveOfflineCharts(charts);
    
    // オンライン時は未送信の診断結果を同期
    await syncOfflineResults();
    
    return charts;
  } catch (error) {
    console.error('チャート一覧の取得に失敗しました（オフラインモードに切り替え）:', error);
    
    // オフライン時はlocalStorageから取得
    const offlineCharts = getOfflineCharts();
    if (offlineCharts.length > 0) {
      console.log('オフライン用チャート情報を使用します:', offlineCharts.length, '件');
      return offlineCharts;
    }
    
    throw new Error('チャート一覧の取得に失敗しました（オフライン用データも存在しません）');
  }
};

/**
 * 診断結果保存API
 * バックエンドサーバの /api/save にPOSTリクエストを送信
 * オフライン時はIndexedDBに保存
 * @param resultData - 診断結果データ
 */
export const saveResult = async (resultData: IResult): Promise<void> => {
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resultData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server error response: ${response.status} - ${errorText}`);
      throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
    }
    
    console.log('診断結果をサーバに送信しました');
  } catch (error) {
    console.error('診断結果の保存に失敗しました（オフライン保存に切り替え）:', error);
    
    // オフライン時はIndexedDBに保存
    try {
      await indexedDBHelper.saveOfflineResult(resultData);
      console.log('診断結果をオフライン用に保存しました');
    } catch (dbError) {
      console.error('オフライン保存にも失敗しました:', dbError);
      throw new Error('診断結果の保存に失敗しました（オフライン保存不可）');
    }
  }
};

/**
 * オフライン時に保存された診断結果をサーバに同期
 * チャート一覧取得成功時に自動実行される
 */
export const syncOfflineResults = async (): Promise<void> => {
  try {
    const offlineResults = await indexedDBHelper.getOfflineResults();
    if (offlineResults.length === 0) {
      return;
    }
    
    console.log('オフライン診断結果の同期を開始:', offlineResults.length, '件');
    
    for (const offlineResult of offlineResults) {
      try {
        // ID と createdAt を除いてサーバに送信
        const { id, createdAt, ...resultData } = offlineResult;
        
        const response = await fetch('/api/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resultData),
        });
        
        if (response.ok && id) {
          // 送信成功時はIndexedDBから削除
          await indexedDBHelper.deleteOfflineResult(id);
          console.log('オフライン診断結果の同期完了 (ID:', id, ')');
        } else {
          console.warn('オフライン診断結果の同期失敗 (ID:', id, ') Status:', response.status);
        }
      } catch (error) {
        console.error('オフライン診断結果の同期エラー:', error);
        // エラーが発生した場合は該当レコードは残して次に進む
      }
    }
    
    console.log('オフライン診断結果の同期処理完了');
  } catch (error) {
    console.error('オフライン診断結果の同期処理でエラー:', error);
  }
};

/**
 * JSON文字列をIChart型オブジェクトに変換するユーティリティ関数
 * @param chartJson - チャート情報のJSON文字列
 * @returns IChart型オブジェクト
 */
export const parseChartData = (chartJson: string): IChart => {
  try {
    return JSON.parse(chartJson) as IChart;
  } catch (error) {
    console.error('チャートデータのパースに失敗しました:', error);
    throw new Error('チャートデータのパースに失敗しました');
  }
};