package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
)

// generateCSV: 診断結果データをCSV仕様に従ってファイルに出力する
// CSV仕様：ID,時刻,結果番号,文章,選択履歴（設問ID,選択肢番号の繰り返し）
func generateCSV(results []Result, chart *IChart, csvFilePath string) error {
	// CSVファイルを作成・オープン
	file, err := os.Create(csvFilePath)
	if err != nil {
		return fmt.Errorf("CSVファイル作成エラー: %v", err)
	}
	defer file.Close()

	// CSVライターを作成
	writer := csv.NewWriter(file)
	defer writer.Flush()

	// ヘッダー行を書き出し
	// 最初の5カラム：ID,時刻,結果番号,文章,選択履歴
	header := []string{"ID", "時刻", "結果番号", "文章", "選択履歴"}
	if err := writer.Write(header); err != nil {
		return fmt.Errorf("ヘッダー書き出しエラー: %v", err)
	}

	// 各診断結果をCSV行として出力
	for _, result := range results {
		// CSV行データを構築
		csvRow, err := buildCSVRow(&result, chart)
		if err != nil {
			return fmt.Errorf("結果ID %d のCSV行構築エラー: %v", result.ID, err)
		}

		// CSV行を書き出し
		if err := writer.Write(csvRow); err != nil {
			return fmt.Errorf("結果ID %d のCSV行書き出しエラー: %v", result.ID, err)
		}
	}

	fmt.Printf("  CSVファイルを生成: %s\n", csvFilePath)
	return nil
}

// buildCSVRow: 単一の診断結果からCSV行データを構築する
func buildCSVRow(result *Result, chart *IChart) ([]string, error) {
	// 基本情報（最初の4カラム）を設定
	row := []string{
		strconv.Itoa(int(result.ID)),    // ID
		result.Timestamp,                // 時刻
		result.ResultID,                 // 結果番号
		"",                              // 文章（後で設定）
	}

	// 診断結果の文章を取得
	resultText, err := getResultText(result, chart)
	if err != nil {
		return nil, fmt.Errorf("診断結果文章取得エラー: %v", err)
	}
	row[3] = resultText

	// 選択履歴をJSONから解析
	var history []IHistory
	if err := json.Unmarshal([]byte(result.ChooseHistory), &history); err != nil {
		return nil, fmt.Errorf("選択履歴JSON解析エラー: %v", err)
	}

	// 選択履歴を設問ID,選択肢番号の形式でCSVに追加
	// 5番目のカラムから設問IDと選択肢番号を交互に配置
	for _, h := range history {
		row = append(row, strconv.Itoa(h.QuestionID)) // 設問ID
		row = append(row, strconv.Itoa(h.Choise))     // 選択肢番号
	}

	return row, nil
}

// getResultText: 診断結果IDに対応する結果文章を取得する
func getResultText(result *Result, chart *IChart) (string, error) {
	// チャートタイプによって処理を分岐
	switch chart.Type {
	case "decision":
		// 決定木タイプ：結果IDから直接診断結果を検索
		resultID, err := strconv.Atoi(result.ResultID)
		if err != nil {
			return "", fmt.Errorf("結果ID変換エラー: %v", err)
		}

		for _, diagnosis := range chart.Diagnoses {
			if diagnosis.ID == resultID {
				return diagnosis.Sentence, nil
			}
		}
		return "", fmt.Errorf("診断結果ID %d が見つかりません", resultID)

	case "point":
		// ポイントタイプ：獲得ポイントに応じた診断結果を検索
		for _, diagnosis := range chart.Diagnoses {
			if result.Point >= diagnosis.Lower && result.Point <= diagnosis.Upper {
				return diagnosis.Sentence, nil
			}
		}
		return "", fmt.Errorf("ポイント %d に対応する診断結果が見つかりません", result.Point)

	default:
		return "", fmt.Errorf("未知のチャートタイプ: %s", chart.Type)
	}
}