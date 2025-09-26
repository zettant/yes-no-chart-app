// フロントエンド用の型定義ファイル
// バックエンドのモデルと統一した型定義を使用

// 設問インターフェース
export interface IQuestion {
  id: number;       // 設問ID
  isLast: boolean;  // trueなら最終問題
  sentence: string; // 設問文
  choises: string[]; // 選択肢（1〜5）
  nexts: number[];   // 遷移先の設問ID（またはisLast=trueなら診断結果ID）
  points?: number[];  // ポイント型チャート用：各選択肢のポイント値
}

// 診断結果インターフェース
export interface IDiagnosis {
  id: number;       // 診断結果ID
  lower: number;    // ポイント下限
  upper: number;    // ポイント上限
  sentence: string; // 診断結果の文章
}

// チャートインターフェース
export interface IChart {
  name: string;          // チャート名
  type: string;          // チャートタイプ（decision/point）
  questions: IQuestion[]; // 設問一覧
  diagnoses: IDiagnosis[]; // 診断結果一覧
}

// CSVパース用の型定義
export interface CSVRow {
  [key: string]: string;
}

// CSVバリデーションエラー
export interface ValidationError {
  row: number;      // エラー発生行番号
  field: string;    // エラー発生フィールド名
  message: string;  // エラーメッセージ
}