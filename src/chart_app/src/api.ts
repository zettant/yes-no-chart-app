import type { IChart, IResult } from './types';

// APIベースURL - 環境に応じて設定
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost';

/**
 * チャート一覧取得API
 * バックエンドサーバの /api/charts にGETリクエストを送信
 * @returns チャート情報のJSON文字列配列
 */
export const fetchCharts = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/charts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('チャート一覧の取得に失敗しました:', error);
    throw new Error('チャート一覧の取得に失敗しました');
  }
};

/**
 * 診断結果保存API
 * バックエンドサーバの /api/save にPOSTリクエストを送信
 * @param resultData - 診断結果データ
 */
export const saveResult = async (resultData: IResult): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resultData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
  } catch (error) {
    console.error('診断結果の保存に失敗しました:', error);
    throw new Error('診断結果の保存に失敗しました');
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