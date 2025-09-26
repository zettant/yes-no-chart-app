package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetChartsHandler - チャート一覧取得API
// 保存されているチャート情報を全て返す
func GetChartsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var charts []Chart
		
		// データベースから全チャートを取得
		if err := db.Find(&charts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "チャート取得に失敗しました"})
			return
		}

		// チャート情報のJSON文字列配列を作成
		result := make([]string, len(charts))
		for i, chart := range charts {
			result[i] = chart.Diagram
		}

		c.JSON(http.StatusOK, result)
	}
}

// RegisterChartHandler - チャート保存・作成API
// チャート情報のJSON文字列を受信し、chartテーブルに保存する
// 最大3つまでの制限あり
func RegisterChartHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var requestData IChart
		
		// JSONリクエストをパース
		if err := c.ShouldBindJSON(&requestData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不正なJSONデータです"})
			return
		}

		// 現在のチャート数をチェック（最大3つまで）
		var count int64
		if err := db.Model(&Chart{}).Count(&count).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "チャート数の確認に失敗しました"})
			return
		}

		if count >= 3 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "チャートは最大3つまでしか保存できません"})
			return
		}

		// 同名チャートの存在チェック
		var existingChart Chart
		if err := db.Where("name = ?", requestData.Name).First(&existingChart).Error; err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "同じ名前のチャートが既に存在します"})
			return
		}

		// チャートデータをJSON文字列に変換
		diagramJSON, err := json.Marshal(requestData)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "チャートデータの変換に失敗しました"})
			return
		}

		// データベースに保存
		chart := Chart{
			Name:    requestData.Name,
			Type:    requestData.Type,
			Diagram: string(diagramJSON),
		}

		if err := db.Create(&chart).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "チャートの保存に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "チャートが正常に保存されました"})
	}
}

// DeleteChartHandler - チャート削除API
// 指定されたチャート名のチャートをchartテーブルから削除する
func DeleteChartHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		chartName := c.Param("name")

		// 指定されたチャートを削除
		result := db.Where("name = ?", chartName).Delete(&Chart{})
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "チャートの削除に失敗しました"})
			return
		}

		if result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "指定されたチャートが見つかりません"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "チャートが正常に削除されました"})
	}
}

// SaveResultHandler - 診断結果保存API
// 診断結果情報（IResult型のオブジェクト）をresultテーブルに保存する
// 写真はAES256-CTRで暗号化してファイルストレージに保存
func SaveResultHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var requestData IResult
		
		// JSONリクエストをパース
		if err := c.ShouldBindJSON(&requestData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不正なJSONデータです"})
			return
		}

		// 暗号化用のランダム文字列（32文字）を生成
		passphrase, err := GenerateRandomString(32)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "パスフレーズの生成に失敗しました"})
			return
		}

		// パスフレーズをハッシュ化してAES暗号化キーを生成
		encryptionKey := HashPassphrase(passphrase)

		// 写真データを暗号化（Base64デコード → AES256-CTR暗号化 → バイナリデータ）
		encryptedPhoto, err := EncryptImage(requestData.Photo, encryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "写真の暗号化に失敗しました"})
			return
		}

		// 選択履歴をJSON文字列に変換
		historyJSON, err := json.Marshal(requestData.History)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "選択履歴の変換に失敗しました"})
			return
		}

		// データベースに診断結果を保存
		result := Result{
			Timestamp:     requestData.Timestamp,
			Passphrase:    passphrase,
			ChartName:     requestData.ChartName,
			ResultID:      strconv.Itoa(*requestData.DiagnosisId),
			Point:         *requestData.CurrentPoint,
			ChooseHistory: string(historyJSON),
		}

		if err := db.Create(&result).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "診断結果の保存に失敗しました"})
			return
		}

		// 暗号化された写真をバイナリファイルとして保存
		// ファイル名は登録レコードのIDと同じにする
		photosDir := "/app/photos"
		if err := os.MkdirAll(photosDir, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "写真保存ディレクトリの作成に失敗しました"})
			return
		}

		photoFilePath := filepath.Join(photosDir, fmt.Sprintf("%d", result.ID))
		if err := os.WriteFile(photoFilePath, encryptedPhoto, 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "写真ファイルの保存に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "診断結果が正常に保存されました"})
	}
}