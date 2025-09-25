import type { IResult } from './types';

// ローカルストレージキー名の定数定義
const STORAGE_KEYS = {
  CURRENT_RESULT: 'yes_no_chart_current_result',  // 現在進行中の診断結果
  SELECTED_CHART: 'yes_no_chart_selected_chart',  // 選択されたチャート情報
} as const;

/**
 * 現在の診断結果をローカルストレージに保存
 * チャート画面でのリロード復帰用
 * @param result - 保存する診断結果データ
 */
export const saveCurrentResult = (result: IResult): void => {
  try {
    const resultJson = JSON.stringify(result);
    localStorage.setItem(STORAGE_KEYS.CURRENT_RESULT, resultJson);
  } catch (error) {
    console.error('診断結果のローカル保存に失敗しました:', error);
    // ストレージエラーでもアプリを続行
  }
};

/**
 * ローカルストレージから現在の診断結果を取得
 * チャート画面でのリロード復帰時に使用
 * @returns 保存されている診断結果データ（存在しない場合はnull）
 */
export const getCurrentResult = (): IResult | null => {
  try {
    const resultJson = localStorage.getItem(STORAGE_KEYS.CURRENT_RESULT);
    if (!resultJson) {
      return null;
    }
    return JSON.parse(resultJson) as IResult;
  } catch (error) {
    console.error('診断結果のローカル取得に失敗しました:', error);
    return null;
  }
};

/**
 * 現在の診断結果をローカルストレージから削除
 * 診断完了後やリセット時に使用
 */
export const clearCurrentResult = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_RESULT);
  } catch (error) {
    console.error('診断結果のローカル削除に失敗しました:', error);
  }
};

/**
 * 選択されたチャート情報をローカルストレージに保存
 * 画面間でのチャート情報共有用
 * @param chartJson - 選択されたチャートのJSON文字列
 */
export const saveSelectedChart = (chartJson: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_CHART, chartJson);
  } catch (error) {
    console.error('チャート情報のローカル保存に失敗しました:', error);
  }
};

/**
 * 選択されたチャート情報をローカルストレージから取得
 * @returns 保存されているチャートのJSON文字列（存在しない場合はnull）
 */
export const getSelectedChart = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_CHART);
  } catch (error) {
    console.error('チャート情報のローカル取得に失敗しました:', error);
    return null;
  }
};

/**
 * 選択されたチャート情報をローカルストレージから削除
 * チャート選択リセット時に使用
 */
export const clearSelectedChart = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_CHART);
  } catch (error) {
    console.error('チャート情報のローカル削除に失敗しました:', error);
  }
};

/**
 * 全てのローカルストレージデータをクリア
 * アプリリセット時に使用
 */
export const clearAllStorage = (): void => {
  clearCurrentResult();
  clearSelectedChart();
};