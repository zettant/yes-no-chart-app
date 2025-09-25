package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"math/big"
)

// ランダム文字列生成用の文字セット（アルファベット大文字小文字数字）
const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// GenerateRandomString - 指定された長さのランダム文字列を生成
// 暗号化パスフレーズ用のランダム文字列（32文字）を生成
func GenerateRandomString(length int) (string, error) {
	result := make([]byte, length)
	for i := range result {
		// 暗号学的に安全な乱数を生成
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		result[i] = charset[num.Int64()]
	}
	return string(result), nil
}

// HashPassphrase - パスフレーズをSHA256でハッシュ化
// AES暗号化キーとして使用するため、32バイトのキーを生成
func HashPassphrase(passphrase string) []byte {
	hash := sha256.Sum256([]byte(passphrase))
	return hash[:]
}

// EncryptImage - 画像データ（Base64文字列）をAES256-CTRで暗号化
// Base64デコード → 暗号化 → Base64エンコードの流れで処理
func EncryptImage(imageBase64 string, key []byte) (string, error) {
	// Base64デコード
	imageData, err := base64.StdEncoding.DecodeString(imageBase64)
	if err != nil {
		return "", err
	}

	// AES暗号化オブジェクト作成
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	// CTRモード用の初期化ベクトル（IV）を生成
	iv := make([]byte, aes.BlockSize)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	// CTRモードで暗号化
	stream := cipher.NewCTR(block, iv)
	encrypted := make([]byte, len(imageData))
	stream.XORKeyStream(encrypted, imageData)

	// IV + 暗号化データを連結してBase64エンコード
	result := append(iv, encrypted...)
	return base64.StdEncoding.EncodeToString(result), nil
}

// DecryptImage - 暗号化された画像データを復号化（管理用）
// 実際のアプリでは使用しないが、デバッグ・管理用途で実装
func DecryptImage(encryptedBase64 string, key []byte) (string, error) {
	// Base64デコード
	data, err := base64.StdEncoding.DecodeString(encryptedBase64)
	if err != nil {
		return "", err
	}

	// IV（先頭16バイト）と暗号化データを分離
	if len(data) < aes.BlockSize {
		return "", err
	}
	iv := data[:aes.BlockSize]
	encryptedData := data[aes.BlockSize:]

	// AES暗号化オブジェクト作成
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	// CTRモードで復号化
	stream := cipher.NewCTR(block, iv)
	decrypted := make([]byte, len(encryptedData))
	stream.XORKeyStream(decrypted, encryptedData)

	// Base64エンコードして返却
	return base64.StdEncoding.EncodeToString(decrypted), nil
}