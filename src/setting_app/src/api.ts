import type { IChart } from './types';

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
 * チャート登録API
 * バックエンドサーバの /api/register にPOSTリクエストを送信
 * @param chartData - 登録するチャートデータ
 */
export const registerChart = async (chartData: IChart): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chartData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP Error: ${response.status}`);
    }
  } catch (error) {
    console.error('チャート登録に失敗しました:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('チャート登録に失敗しました');
  }
};

/**
 * チャート削除API
 * バックエンドサーバの /api/charts/:name にDELETEリクエストを送信
 * @param chartName - 削除するチャート名
 */
export const deleteChart = async (chartName: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/charts/${encodeURIComponent(chartName)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP Error: ${response.status}`);
    }
  } catch (error) {
    console.error('チャート削除に失敗しました:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('チャート削除に失敗しました');
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