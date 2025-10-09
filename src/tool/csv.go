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

	// チャートタイプに応じてヘッダー行を生成
	header, err := buildCSVHeader(chart)
	if err != nil {
		return fmt.Errorf("ヘッダー生成エラー: %v", err)
	}
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

// buildCSVHeader: チャートタイプに応じてCSVヘッダーを生成する
func buildCSVHeader(chart *IChart) ([]string, error) {
	switch chart.Type {
	case "decision":
		// decisionタイプ: ID,時刻,結果番号,文章,選択履歴
		return []string{"ID", "時刻", "結果番号", "文章", "選択履歴"}, nil
	
	case "single", "multi":
		// single/multiタイプ: ID,時刻,カテゴリ名,ポイント,結果文章を繰り返し
		header := []string{"ID", "時刻"}
		
		// チャートからカテゴリ一覧を取得（questionsから重複除去）
		categoryMap := make(map[string]bool)
		var categories []string
		for _, question := range chart.Questions {
			if !categoryMap[question.Category] {
				categoryMap[question.Category] = true
				categories = append(categories, question.Category)
			}
		}
		
		// 各カテゴリに対してヘッダーを追加
		for i := range categories {
			categoryNum := fmt.Sprintf("%d番目", i+1)
			header = append(header, categoryNum+"カテゴリ名前", categoryNum+"カテゴリのポイント", categoryNum+"カテゴリの結果文章")
		}
		
		return header, nil
		
		
	default:
		return nil, fmt.Errorf("未知のチャートタイプ: %s", chart.Type)
	}
}

// buildCSVRow: 単一の診断結果からCSV行データを構築する
func buildCSVRow(result *Result, chart *IChart) ([]string, error) {
	switch chart.Type {
	case "decision":
		return buildCSVRowDecision(result, chart)
	case "single", "multi":
		return buildCSVRowPoint(result, chart)
	default:
		return nil, fmt.Errorf("未知のチャートタイプ: %s", chart.Type)
	}
}

// buildCSVRowDecision: decisionタイプのCSV行を構築
func buildCSVRowDecision(result *Result, chart *IChart) ([]string, error) {
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
	for _, h := range history {
		row = append(row, strconv.Itoa(h.QuestionID)) // 設問ID
		row = append(row, strconv.Itoa(h.Choise))     // 選択肢番号
	}

	return row, nil
}

// buildCSVRowPoint: pointタイプのCSV行を構築
func buildCSVRowPoint(result *Result, chart *IChart) ([]string, error) {
	// 基本情報（最初の2カラム）を設定
	row := []string{
		strconv.Itoa(int(result.ID)),    // ID
		result.Timestamp,                // 時刻
	}

	// Pointフィールドの形式を判定（単一値か配列か）
	if result.Point == "" || result.Point == "0" {
		// データ不完全の場合
		categoryMap := make(map[string]bool)
		var categories []string
		for _, question := range chart.Questions {
			if !categoryMap[question.Category] {
				categoryMap[question.Category] = true
				categories = append(categories, question.Category)
			}
		}
		
		for _, category := range categories {
			row = append(row, category, "0", "データ不完全")
		}
	} else {
		// まず配列形式（複数カテゴリ）として解析を試す
		var points []IPoint
		if err := json.Unmarshal([]byte(result.Point), &points); err == nil {
			// 複数カテゴリ形式の処理
			categoryMap := make(map[string]bool)
			var categories []string
			for _, question := range chart.Questions {
				if !categoryMap[question.Category] {
					categoryMap[question.Category] = true
					categories = append(categories, question.Category)
				}
			}

			// 各カテゴリの情報を追加
			for _, category := range categories {
				var categoryPoint int
				var categoryDiagnosis string = "診断結果なし"
				
				for _, point := range points {
					if point.Category == category {
						categoryPoint = point.Point
						// 診断結果を検索
						scaledPoint := point.Point / 2
						if scaledPoint > 5 {
							scaledPoint = 5
						}
						for _, diagnosis := range chart.Diagnoses {
							if diagnosis.Category == point.Category && 
							   scaledPoint >= diagnosis.Lower && 
							   scaledPoint <= diagnosis.Upper {
								categoryDiagnosis = diagnosis.Sentence
								break
							}
						}
						break
					}
				}
				
				row = append(row, category, strconv.Itoa(categoryPoint), categoryDiagnosis)
			}
		} else {
			// 単一値形式として解析を試す
			var singlePoint int
			if err := json.Unmarshal([]byte(result.Point), &singlePoint); err == nil {
				// 単一値の場合でも、複数カテゴリ形式でCSV出力
				categoryMap := make(map[string]bool)
				var categories []string
				for _, question := range chart.Questions {
					if !categoryMap[question.Category] {
						categoryMap[question.Category] = true
						categories = append(categories, question.Category)
					}
				}
				
				// 全カテゴリに同じポイントを設定（簡略化）
				for _, category := range categories {
					row = append(row, category, strconv.Itoa(singlePoint), "単一値形式データ")
				}
			} else {
				return nil, fmt.Errorf("Pointフィールドの解析に失敗: %s", result.Point)
			}
		}
	}

	// 選択履歴をJSONから解析して追加
	var history []IHistory
	if err := json.Unmarshal([]byte(result.ChooseHistory), &history); err != nil {
		return nil, fmt.Errorf("選択履歴JSON解析エラー: %v", err)
	}

	// 選択履歴を設問ID,選択肢番号の形式でCSVに追加
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

	case "single", "multi":
		// single/multiタイプ：Pointフィールドから獲得ポイントを解析して診断結果を検索
		// まず単一値として解析を試す
		var singlePoint int
		if err := json.Unmarshal([]byte(result.Point), &singlePoint); err == nil {
			for _, diagnosis := range chart.Diagnoses {
				if singlePoint >= diagnosis.Lower && singlePoint <= diagnosis.Upper {
					return diagnosis.Sentence, nil
				}
			}
			return "", fmt.Errorf("ポイント %d に対応する診断結果が見つかりません", singlePoint)
		}
		
		// 複数カテゴリ形式として解析を試す
		var points []IPoint
		if err := json.Unmarshal([]byte(result.Point), &points); err == nil {
			resultText := ""
			for i, point := range points {
				scaledPoint := point.Point / 2
				if scaledPoint > 5 {
					scaledPoint = 5
				}
				for _, diagnosis := range chart.Diagnoses {
					if diagnosis.Category == point.Category && 
					   scaledPoint >= diagnosis.Lower && 
					   scaledPoint <= diagnosis.Upper {
						if i > 0 {
							resultText += " | "
						}
						resultText += fmt.Sprintf("%s: %s", point.Category, diagnosis.Sentence)
						break
					}
				}
			}
			if resultText == "" {
				return "", fmt.Errorf("カテゴリ別ポイントに対応する診断結果が見つかりません")
			}
			return resultText, nil
		}
		
		return "", fmt.Errorf("Pointフィールドの解析に失敗: %s", result.Point)


	default:
		return "", fmt.Errorf("未知のチャートタイプ: %s", chart.Type)
	}
}