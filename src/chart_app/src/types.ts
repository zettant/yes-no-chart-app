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

// 選択履歴インターフェース
export interface IHistory {
  questionId: number; // 設問ID
  choise: number;     // 選択番号
}

// 診断結果保存データインターフェース
export interface IResult {
  chartName: string;      // チャート名
  chartType: string;      // チャートタイプ
  timestamp: string;      // 開始時刻（JST、ISO8601フォーマット）
  photo: string;          // 撮影データJPEGのBase64文字列
  currentQId?: number;    // 現在の設問ID
  currentPoint?: number;  // 現時点の点数(チャートタイプ=pointの場合のみ)
  diagnosisId?: number;   // 診断結果ID(結果まで到達した場合に記入)
  history: IHistory[];    // 何を選択してきたかの履歴
}