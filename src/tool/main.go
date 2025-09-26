package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	_ "modernc.org/sqlite" // Pure Go SQLite driver
)

// メイン関数：コマンドライン引数を解析し、集計処理を実行する
func main() {
	// コマンドライン引数をチェック
	if len(os.Args) != 4 {
		fmt.Fprintf(os.Stderr, "使用方法: %s <dbファイルパス> <写真ディレクトリ> <出力先ディレクトリ>\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "例: %s ./volumes/db/database.db ./volumes/photos ./output\n", os.Args[0])
		os.Exit(1)
	}

	dbPath := os.Args[1]
	photoDir := os.Args[2]
	outputDir := os.Args[3]

	// 引数の検証を実行
	if err := validateArgs(dbPath, photoDir, outputDir); err != nil {
		fmt.Fprintf(os.Stderr, "引数エラー: %v\n", err)
		os.Exit(1)
	}

	// 集計処理メイン関数を実行
	if err := processAggregation(dbPath, photoDir, outputDir); err != nil {
		fmt.Fprintf(os.Stderr, "集計処理エラー: %v\n", err)
		os.Exit(1)
	}
}

// validateArgs: コマンドライン引数の妥当性を検証する
func validateArgs(dbPath, photoDir, outputDir string) error {
	// DBファイルの存在確認
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		return fmt.Errorf("データベースファイルが存在しません: %s", dbPath)
	}

	// 写真ディレクトリの存在確認
	if info, err := os.Stat(photoDir); os.IsNotExist(err) {
		return fmt.Errorf("写真ディレクトリが存在しません: %s", photoDir)
	} else if !info.IsDir() {
		return fmt.Errorf("写真パスがディレクトリではありません: %s", photoDir)
	}

	// 出力先ディレクトリが存在しない場合は作成
	if _, err := os.Stat(outputDir); os.IsNotExist(err) {
		if err := os.MkdirAll(outputDir, 0755); err != nil {
			return fmt.Errorf("出力先ディレクトリの作成に失敗しました: %v", err)
		}
		fmt.Printf("出力先ディレクトリを作成しました: %s\n", outputDir)
	}

	return nil
}

// processAggregation: 集計処理のメイン実行関数
func processAggregation(dbPath, photoDir, outputDir string) error {
	// データベース接続を初期化
	db, err := initDatabase(dbPath)
	if err != nil {
		return fmt.Errorf("データベース接続エラー: %v", err)
	}

	// チャート情報をすべて取得
	charts, err := getAllCharts(db)
	if err != nil {
		return fmt.Errorf("チャート取得エラー: %v", err)
	}

	fmt.Printf("取得したチャート数: %d\n", len(charts))

	// 各チャートに対して処理を実行
	chartResults := make(map[string]int)
	for _, chart := range charts {
		fmt.Printf("\nチャート '%s' を処理中...\n", chart.Name)

		// 診断結果データを取得
		results, err := getResultsByChartName(db, chart.Name)
		if err != nil {
			return fmt.Errorf("チャート '%s' の結果取得エラー: %v", chart.Name, err)
		}

		fmt.Printf("  診断結果数: %d件\n", len(results))

		// チャート情報をJSONからIChartオブジェクトに変換
		var chartObj IChart
		if err := json.Unmarshal([]byte(chart.Diagram), &chartObj); err != nil {
			return fmt.Errorf("チャート '%s' のJSON解析エラー: %v", chart.Name, err)
		}

		// CSVファイルを生成
		csvFilePath := filepath.Join(outputDir, chart.Name+".csv")
		if err := generateCSV(results, &chartObj, csvFilePath); err != nil {
			return fmt.Errorf("チャート '%s' のCSV生成エラー: %v", chart.Name, err)
		}

		// 写真ファイルを復号化
		decryptedCount, err := decryptPhotos(results, photoDir, outputDir)
		if err != nil {
			return fmt.Errorf("チャート '%s' の写真復号エラー: %v", chart.Name, err)
		}

		fmt.Printf("  復号化した写真数: %d件\n", decryptedCount)
		chartResults[chart.Name] = len(results)
	}

	// 最終結果を表示
	fmt.Println("\n=== 集計完了 ===")
	for chartName, count := range chartResults {
		fmt.Printf("チャート '%s': %d件の結果を処理\n", chartName, count)
	}

	return nil
}

// initDatabase: データベース接続を初期化する
func initDatabase(dbPath string) (*gorm.DB, error) {
	// SQLiteデータベースに接続（modernc.org/sqliteを使用）
	// modernc.org/sqliteドライバを明示的に指定
	dialector := sqlite.Dialector{
		DriverName: "sqlite", // modernc.org/sqliteドライバ名
		DSN:        dbPath,
	}
	
	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), // ログを無効化
	})
	if err != nil {
		return nil, err
	}

	return db, nil
}

// getAllCharts: chartテーブルから全てのチャート情報を取得する
func getAllCharts(db *gorm.DB) ([]Chart, error) {
	var charts []Chart
	if err := db.Find(&charts).Error; err != nil {
		return nil, err
	}
	return charts, nil
}

// getResultsByChartName: 指定されたチャート名の診断結果をすべて取得する
func getResultsByChartName(db *gorm.DB, chartName string) ([]Result, error) {
	var results []Result
	if err := db.Where("chart_name = ?", chartName).Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}