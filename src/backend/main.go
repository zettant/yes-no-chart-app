package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/driver/sqlite"
	_ "modernc.org/sqlite" // pure go SQLite driver
)

func main() {
	// データベース用ディレクトリを作成（存在しない場合）
	dbPath := "/app/db/database.db"
	dbDir := filepath.Dir(dbPath)
	
	log.Printf("データベースパス: %s", dbPath)
	log.Printf("データベースディレクトリ: %s", dbDir)
	
	// ディレクトリの状態を確認
	if info, err := os.Stat(dbDir); err != nil {
		if os.IsNotExist(err) {
			log.Printf("ディレクトリが存在しません。作成中...")
			if err := os.MkdirAll(dbDir, 0755); err != nil {
				log.Fatal("データベースディレクトリの作成に失敗しました:", err)
			}
		} else {
			log.Fatal("ディレクトリの確認に失敗しました:", err)
		}
	} else {
		log.Printf("ディレクトリ存在確認: %s (権限: %s)", dbDir, info.Mode())
	}
	
	// ディスク容量の確認
	if info, err := os.Stat(dbDir); err == nil {
		log.Printf("ディレクトリ情報: サイズ=%d, 権限=%s", info.Size(), info.Mode())
	}
	
	// 書き込み権限のテスト
	testFile := filepath.Join(dbDir, "test_write.tmp")
	if file, err := os.Create(testFile); err != nil {
		log.Fatal("ディレクトリへの書き込み権限がありません:", err)
	} else {
		file.Close()
		os.Remove(testFile)
		log.Printf("書き込み権限テスト: OK")
	}

	// SQLite設定を最適化してout of memoryエラーを回避
	log.Printf("データベース接続を試行中...")
	
	// SQLiteの設定パラメータを追加（メモリ効率化とエラー回避）
	dsn := dbPath + "?cache=shared&mode=rwc&_journal_mode=WAL&_synchronous=NORMAL&_cache_size=1000&_temp_store=memory"
	
	db, err := gorm.Open(sqlite.Dialector{
		DriverName: "sqlite",
		DSN:        dsn,
	}, &gorm.Config{
		// SQL文のログ出力を無効化（メモリ節約）
		Logger: nil,
		// プリペアドステートメントの無効化（メモリ節約）
		PrepareStmt: false,
	})
	
	if err != nil {
		log.Printf("SQLiteエラーの詳細: %v", err)
		
		// 最小限の設定で再試行
		simpleDSN := dbPath + "?cache=shared&mode=rwc"
		log.Printf("シンプル設定で再試行中...")
		db, err = gorm.Open(sqlite.Dialector{
			DriverName: "sqlite",
			DSN:        simpleDSN,
		}, &gorm.Config{
			Logger: nil,
			PrepareStmt: false,
		})
		
		if err != nil {
			// 最後の手段として/tmp/を試す
			backupPath := "/tmp/database.db"
			log.Printf("バックアップパス %s で再試行中...", backupPath)
			db, err = gorm.Open(sqlite.Dialector{
				DriverName: "sqlite",
				DSN:        backupPath + "?cache=shared&mode=rwc",
			}, &gorm.Config{
				Logger: nil,
				PrepareStmt: false,
			})
			if err != nil {
				log.Fatal("データベース接続に失敗しました:", err)
			}
			log.Printf("バックアップパスでの接続に成功")
		} else {
			log.Printf("シンプル設定での接続に成功")
		}
	} else {
		log.Printf("データベース接続に成功")
	}

	// データベーステーブルの自動マイグレーション
	err = db.AutoMigrate(&Chart{}, &Result{})
	if err != nil {
		log.Fatal("データベースマイグレーションに失敗しました:", err)
	}

	// Ginエンジンの初期化
	r := gin.Default()

	// CORS設定（SPAからのアクセスを許可）
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// REST API エンドポイントの定義
	api := r.Group("/api")
	{
		// チャート管理API
		api.GET("/charts", GetChartsHandler(db))       // チャート一覧取得
		api.POST("/register", RegisterChartHandler(db)) // チャート保存・作成
		api.DELETE("/charts/:name", DeleteChartHandler(db)) // チャート削除

		// 診断機能API
		api.POST("/save", SaveResultHandler(db)) // 診断結果保存
	}

	// 静的ファイルホスティング
	// 設定アプリ（/setting）- 具体的なパスを先に定義
	r.Static("/setting/assets", "/app/setting_app/assets")
	r.StaticFile("/setting/vite.svg", "/app/setting_app/vite.svg")
	r.GET("/setting/create", func(c *gin.Context) {
		c.File("/app/setting_app/index.html")
	})
	r.GET("/setting/", func(c *gin.Context) {
		c.File("/app/setting_app/index.html")
	})
	
	// チャートアプリ（/chart）- 具体的なパスを先に定義
	r.Static("/chart/assets", "/app/chart_app/assets")
	r.StaticFile("/chart/vite.svg", "/app/chart_app/vite.svg")
	r.StaticFile("/chart/sw.js", "/app/chart_app/sw.js")
	r.StaticFile("/chart/manifest.json", "/app/chart_app/manifest.json")
	r.GET("/chart/photo", func(c *gin.Context) {
		c.File("/app/chart_app/index.html")
	})
	r.GET("/chart/result", func(c *gin.Context) {
		c.File("/app/chart_app/index.html")
	})
	r.GET("/chart/", func(c *gin.Context) {
		c.File("/app/chart_app/index.html")
	})
	
	// ルート直下のチャートアプリのルート（SPA用）
	r.Static("/assets", "/app/chart_app/assets")
	r.StaticFile("/vite.svg", "/app/chart_app/vite.svg")
	r.GET("/photo", func(c *gin.Context) {
		c.File("/app/chart_app/index.html")
	})
	r.GET("/result", func(c *gin.Context) {
		c.File("/app/chart_app/index.html")
	})

	// リダイレクト処理
	r.GET("/", func(c *gin.Context) {
		c.Redirect(301, "/chart/")
	})
	r.GET("/chart", func(c *gin.Context) {
		c.Redirect(301, "/chart/")
	})

	// HTTPサーバー起動（port 80でアプリコンテンツとREST API両方を提供）
	log.Println("サーバーを port 80 で起動中（アプリコンテンツ + REST API）...")
	if err := r.Run(":80"); err != nil {
		log.Fatal("サーバーの起動に失敗しました:", err)
	}
}