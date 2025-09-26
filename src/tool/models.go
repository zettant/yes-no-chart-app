package main

// Chart テーブルモデル - チャート情報を保存
// バックエンドのmodels.goと同じ構造体定義
type Chart struct {
	ID      uint   `gorm:"primaryKey" json:"id"`        // サロゲートキー
	Name    string `json:"name"`                        // チャート名
	Type    string `json:"type"`                        // チャートタイプ（decision/point）
	Diagram string `json:"diagram"`                     // チャート情報のJSON文字列
}

// Result テーブルモデル - 診断結果データを保存
// バックエンドのmodels.goと同じ構造体定義
type Result struct {
	ID            uint   `gorm:"primaryKey" json:"id"`               // サロゲートキー
	Timestamp     string `json:"timestamp"`                          // 実施日時（ISO8601）
	Passphrase    string `json:"passphrase"`                         // 写真暗号化用のランダム文字列パスフレーズ
	ChartName     string `json:"chart_name"`                         // チャート名
	ResultID      string `json:"result_id"`                          // 診断結果ID
	Point         int    `json:"point"`                              // チャートタイプ=pointの場合の最終ポイント
	ChooseHistory string `json:"choose_history"`                     // 設問IDと選択枝番号の配列の配列のJSON
}

// IQuestion インターフェース - チャートの設問情報
// フロントエンドのtypes.tsと同じ構造体定義
type IQuestion struct {
	ID       int      `json:"id"`       // 設問ID
	IsLast   bool     `json:"isLast"`   // trueなら最終問題
	Sentence string   `json:"sentence"` // 設問文
	Choises  []string `json:"choises"`  // 選択肢（1〜5）
	Nexts    []int    `json:"nexts"`    // 遷移先の設問ID（またはisLast=trueなら診断結果ID）
	Points   []int    `json:"points,omitempty"` // ポイント型チャート用：各選択肢のポイント値
}

// IDiagnosis インターフェース - チャートの診断結果情報
// フロントエンドのtypes.tsと同じ構造体定義
type IDiagnosis struct {
	ID       int    `json:"id"`       // 診断結果ID
	Lower    int    `json:"lower"`    // ポイント下限
	Upper    int    `json:"upper"`    // ポイント上限
	Sentence string `json:"sentence"` // 診断結果の文章
}

// IChart インターフェース - チャート全体の構造
// フロントエンドのtypes.tsと同じ構造体定義
type IChart struct {
	Name      string       `json:"name"`      // チャート名
	Type      string       `json:"type"`      // チャートタイプ
	Questions []IQuestion  `json:"questions"` // 設問一覧
	Diagnoses []IDiagnosis `json:"diagnoses"` // 診断結果一覧
}

// IHistory インターフェース - 選択履歴
// フロントエンドのtypes.tsと同じ構造体定義
type IHistory struct {
	QuestionID int `json:"questionId"` // 設問ID
	Choise     int `json:"choise"`     // 選択番号
}