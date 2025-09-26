package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
)

// decryptPhotos: 診断結果に紐づく暗号化された写真ファイルを復号化する
func decryptPhotos(results []Result, photoDir, outputDir string) (int, error) {
	decryptedCount := 0

	// 各診断結果について写真ファイルを復号化
	for _, result := range results {
		// 暗号化ファイルのパス（ファイル名は診断結果のID）
		encryptedFilePath := filepath.Join(photoDir, strconv.Itoa(int(result.ID)))

		// 暗号化ファイルが存在するかチェック
		if _, err := os.Stat(encryptedFilePath); os.IsNotExist(err) {
			fmt.Printf("    警告: 結果ID %d の写真ファイルが見つかりません: %s\n", result.ID, encryptedFilePath)
			continue
		}

		// 復号化後のファイルパス（[id].jpg形式）
		decryptedFilePath := filepath.Join(outputDir, fmt.Sprintf("%d.jpg", result.ID))

		// 写真ファイルを復号化
		if err := decryptPhotoFile(encryptedFilePath, decryptedFilePath, result.Passphrase); err != nil {
			return decryptedCount, fmt.Errorf("結果ID %d の写真復号エラー: %v", result.ID, err)
		}

		decryptedCount++
	}

	return decryptedCount, nil
}

// decryptPhotoFile: 単一の暗号化写真ファイルを復号化する
func decryptPhotoFile(encryptedFilePath, decryptedFilePath, passphrase string) error {
	// パスフレーズからAES256キーを生成（SHA256ハッシュ）
	key := generateAESKey(passphrase)

	// 暗号化ファイルを読み込み
	encryptedData, err := os.ReadFile(encryptedFilePath)
	if err != nil {
		return fmt.Errorf("暗号化ファイル読み込みエラー: %v", err)
	}

	// AES256-CTRで復号化
	decryptedData, err := decryptAES256CTR(encryptedData, key)
	if err != nil {
		return fmt.Errorf("AES復号エラー: %v", err)
	}

	// 復号化データをJPEGファイルとして保存
	if err := os.WriteFile(decryptedFilePath, decryptedData, 0644); err != nil {
		return fmt.Errorf("復号化ファイル保存エラー: %v", err)
	}

	return nil
}

// generateAESKey: パスフレーズからSHA256ハッシュを使用してAES256キーを生成する
func generateAESKey(passphrase string) []byte {
	hash := sha256.Sum256([]byte(passphrase))
	return hash[:]
}

// decryptAES256CTR: AES256-CTRモードで暗号化データを復号化する
func decryptAES256CTR(encryptedData, key []byte) ([]byte, error) {
	// AES暗号化ブロックを作成
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("AES暗号ブロック作成エラー: %v", err)
	}

	// 暗号化データが最低限のサイズ（IV + 暗号化データ）を持つかチェック
	if len(encryptedData) < aes.BlockSize {
		return nil, fmt.Errorf("暗号化データが短すぎます（最低 %d バイト必要）", aes.BlockSize)
	}

	// 初期化ベクトル（IV）を抽出（最初の16バイト）
	iv := encryptedData[:aes.BlockSize]
	ciphertext := encryptedData[aes.BlockSize:]

	// CTRモードのストリーム暗号を作成
	stream := cipher.NewCTR(block, iv)

	// 復号化データ用のバッファを作成
	plaintext := make([]byte, len(ciphertext))

	// 復号化を実行
	stream.XORKeyStream(plaintext, ciphertext)

	return plaintext, nil
}

// encryptAES256CTR: AES256-CTRモードでデータを暗号化する（参考実装）
// 注意: この関数は集計ツールでは使用されませんが、暗号化処理の理解のために記載
func encryptAES256CTR(plaintext, key []byte) ([]byte, error) {
	// AES暗号化ブロックを作成
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("AES暗号ブロック作成エラー: %v", err)
	}

	// ランダムなIVを生成
	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]
	
	// IVをランダムデータで埋める（実際の実装では適切な乱数生成が必要）
	if _, err := io.ReadFull(io.Reader(nil), iv); err != nil {
		return nil, fmt.Errorf("IV生成エラー: %v", err)
	}

	// CTRモードのストリーム暗号を作成
	stream := cipher.NewCTR(block, iv)

	// 暗号化を実行
	stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintext)

	return ciphertext, nil
}