package main

// GORM構造体タグで使用されるため、importは必要

// Chart テーブルモデル - チャート情報を保存
type Chart struct {
	ID      uint   `gorm:"primaryKey" json:"id"`        // サロゲートキー
	Name    string `json:"name"`                        // チャート名
	Type    string `json:"type"`                        // チャートタイプ（decision/single/multi）
	Diagram string `json:"diagram"`                     // チャート情報のJSON文字列
}

// Result テーブルモデル - 診断結果データを保存
type Result struct {
	ID            uint   `gorm:"primaryKey" json:"id"`               // サロゲートキー
	Timestamp     string `json:"timestamp"`                          // 実施日時（ISO8601）
	Passphrase    string `json:"passphrase"`                         // 写真暗号化用のランダム文字列パスフレーズ
	ChartName     string `json:"chart_name"`                         // チャート名
	ResultID      string `json:"result_id"`                          // 診断結果ID
	Point         string `json:"point"`                              // チャートタイプ=single,pointの場合の最終ポイント情報のJSON文字列（カテゴリとそれに対するポイント）
	ChooseHistory string `json:"choose_history"`                     // 設問IDと選択枝番号の配列の配列のJSON
}

// IQuestion インターフェース - フロントエンドとの型定義統一
type IQuestion struct {
	ID       int      `json:"id"`       // 設問ID
	IsLast   bool     `json:"isLast"`   // trueなら最終問題
	Category string   `json:"category"` // 問題カテゴリ（multiタイプで使用）
	Sentence string   `json:"sentence"` // 設問文
	Choises  []string `json:"choises"`  // 選択肢（1〜5）
	Nexts    []int    `json:"nexts"`    // 遷移先の設問ID（またはisLast=trueなら診断結果ID）
	Points   []int    `json:"points,omitempty"` // ポイント型チャート用：各選択肢のポイント値
}

// IDiagnosis インターフェース - フロントエンドとの型定義統一
type IDiagnosis struct {
	ID       int    `json:"id"`       // 診断結果ID
	Category string `json:"category"` // 対象カテゴリ（multiタイプで使用）
	Lower    int    `json:"lower"`    // ポイント下限
	Upper    int    `json:"upper"`    // ポイント上限
	Sentence string `json:"sentence"` // 診断結果の文章
}

// IChart インターフェース - フロントエンドとの型定義統一
type IChart struct {
	Name      string       `json:"name"`      // チャート名
	Type      string       `json:"type"`      // チャートタイプ
	Questions []IQuestion  `json:"questions"` // 設問一覧
	Diagnoses []IDiagnosis `json:"diagnoses"` // 診断結果一覧
}

// IHistory インターフェース - 選択履歴
type IHistory struct {
	QuestionID int `json:"questionId"` // 設問ID
	Choise     int `json:"choise"`     // 選択番号
}

// IPoint インターフェース - カテゴリ別ポイント管理用
type IPoint struct {
	Category string `json:"category"` // 設問カテゴリ
	Point    int    `json:"point"`    // カテゴリごとの点数
}

// IResult インターフェース - 診断結果保存データ
type IResult struct {
	ChartName     string     `json:"chartName"`     // チャート名
	ChartType     string     `json:"chartType"`     // チャートタイプ
	Timestamp     string     `json:"timestamp"`     // 開始時刻（ISO8601フォーマット）
	Photo         string     `json:"photo"`         // 撮影データJPEGのBase64文字列
	CurrentQId    *int       `json:"currentQId"`    // 現在の設問ID
	CurrentPoint  *int       `json:"currentPoint"`  // 現時点の点数(singleタイプ用)
	CurrentPoints []IPoint   `json:"currentPoints,omitempty"` // 現時点のカテゴリ別点数(multiタイプ用)
	DiagnosisId   *int       `json:"diagnosisId"`   // 診断結果ID(結果まで到達した場合に記入)
	History       []IHistory `json:"history"`       // 何を選択してきたかの履歴
}