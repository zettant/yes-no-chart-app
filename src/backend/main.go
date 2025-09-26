package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/driver/sqlite"
	_ "modernc.org/sqlite" // pure go SQLite driver
)

func main() {
	// データベース接続（pure goのsqlite3ドライバを使用）
	db, err := gorm.Open(sqlite.Dialector{
		DriverName: "sqlite",
		DSN:        "/app/db/database.db",
	}, &gorm.Config{})
	if err != nil {
		log.Fatal("データベース接続に失敗しました:", err)
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