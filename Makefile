# Yes/No Chart システムのMakefile
# ビルド、デプロイ、Docker管理を自動化
#
# 注意事項:
# - Go 1.25.1が必要です
# - toolchainエラーが発生した場合は、新しいターミナルを開くか以下を実行してください:
#   unset GOROOT

# 変数定義
BACKEND_DIR = src/backend
CHART_APP_DIR = src/chart_app
SETTING_APP_DIR = src/setting_app
TOOL_DIR = src/tool
VOLUMES_BIN_DIR = volumes/bin
VOLUMES_CHART_DIR = $(VOLUMES_BIN_DIR)/chart_app
VOLUMES_SETTING_DIR = $(VOLUMES_BIN_DIR)/setting_app

# デフォルトターゲット
.DEFAULT_GOAL := help

# ヘルプ表示
.PHONY: help
help:
	@echo "Yes/No Chart システム - 利用可能なコマンド:"
	@echo ""
	@echo "  ビルド関連:"
	@echo "    build-server   - バックエンドサーバをビルドしてvolumes/bin/にデプロイ"
	@echo "    build-chart    - チャートアプリをビルドしてvolumes/bin/chart_app/にデプロイ"
	@echo "    build-setting  - 設定アプリをビルドしてvolumes/bin/setting_app/にデプロイ"
	@echo "    build-tool     - 集計ツールをビルドしてプロジェクトルートにコピー"
	@echo "    build          - 全てのコンポーネント（サーバ、アプリ、ツール）をビルド"
	@echo ""
	@echo "  クリーンアップ:"
	@echo "    clean          - ビルド成果物とvolumes/bin/を削除"
	@echo "    clean-deep     - node_modules含む全ての一時ファイルを削除"
	@echo ""
	@echo "  Docker管理:"
	@echo "    start          - Docker Composeでサービスを起動"
	@echo "    stop           - Docker Composeでサービスを停止"
	@echo "    restart        - サービスを再起動"
	@echo "    logs           - サービスのログを表示"
	@echo ""
	@echo "  開発支援:"
	@echo "    dev-chart      - チャートアプリの開発サーバーを起動"
	@echo "    dev-setting    - 設定アプリの開発サーバーを起動"
	@echo "    test           - 全てのテストを実行"

# ディレクトリ作成
$(VOLUMES_BIN_DIR):
	@echo "📁 volumes/bin/ ディレクトリを作成中..."
	@mkdir -p $(VOLUMES_BIN_DIR)

$(VOLUMES_CHART_DIR): $(VOLUMES_BIN_DIR)
	@mkdir -p $(VOLUMES_CHART_DIR)

$(VOLUMES_SETTING_DIR): $(VOLUMES_BIN_DIR)
	@mkdir -p $(VOLUMES_SETTING_DIR)

# バックエンドサーバーのビルド
.PHONY: build-server
build-server: $(VOLUMES_BIN_DIR)
	@echo "🔨 バックエンドサーバーをビルド中..."
	@cd $(BACKEND_DIR) && \
		echo "  - Go依存関係を解決中..." && \
		GOTOOLCHAIN=local go mod tidy && \
		echo "  - Linuxバイナリをビルド中..." && \
		GOTOOLCHAIN=local GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -a -ldflags '-w -s' -o ../../$(VOLUMES_BIN_DIR)/backend .
	@echo "✅ バックエンドサーバーのビルドが完了: $(VOLUMES_BIN_DIR)/backend"

# チャートアプリのビルド
.PHONY: build-chart
build-chart: $(VOLUMES_CHART_DIR)
	@echo "🔨 チャートアプリをビルド中..."
	@cd $(CHART_APP_DIR) && \
		if [ ! -d "node_modules" ]; then \
			echo "  - npm パッケージをインストール中..."; \
			npm install; \
		fi && \
		echo "  - Reactアプリをビルド中..." && \
		npm run build
	@echo "  - ビルド成果物をコピー中..."
	@rm -rf $(VOLUMES_CHART_DIR)/*
	@cp -r $(CHART_APP_DIR)/dist/* $(VOLUMES_CHART_DIR)/
	@echo "✅ チャートアプリのビルドが完了: $(VOLUMES_CHART_DIR)"

# 設定アプリのビルド
.PHONY: build-setting
build-setting: $(VOLUMES_SETTING_DIR)
	@echo "🔨 設定アプリをビルド中..."
	@cd $(SETTING_APP_DIR) && \
		if [ ! -d "node_modules" ]; then \
			echo "  - npm パッケージをインストール中..."; \
			npm install; \
		fi && \
		echo "  - Reactアプリをビルド中..." && \
		npm run build
	@echo "  - ビルド成果物をコピー中..."
	@rm -rf $(VOLUMES_SETTING_DIR)/*
	@cp -r $(SETTING_APP_DIR)/dist/* $(VOLUMES_SETTING_DIR)/
	@echo "✅ 設定アプリのビルドが完了: $(VOLUMES_SETTING_DIR)"

# 集計ツールのビルド
.PHONY: build-tool
build-tool:
	@echo "🔨 集計ツールをビルド中..."
	@cd $(TOOL_DIR) && \
		echo "  - Go依存関係を解決中..." && \
		GOTOOLCHAIN=local go mod tidy && \
		if [ "$$(uname)" = "Darwin" ]; then \
			echo "  - macOS用バイナリをビルド中..."; \
			GOTOOLCHAIN=local GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build -a -ldflags '-w -s' -o ../../aggregation-tool .; \
		else \
			echo "  - Linux用バイナリをビルド中..."; \
			GOTOOLCHAIN=local GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -a -ldflags '-w -s' -o ../../aggregation-tool .; \
		fi
	@echo "✅ 集計ツールのビルドが完了: ./aggregation-tool"

# 全コンポーネントのビルド
.PHONY: build
build: build-server build-chart build-setting build-tool
	@echo ""
	@echo "🎉 全てのコンポーネントのビルドが完了しました！"
	@echo "   - バックエンドサーバー: $(VOLUMES_BIN_DIR)/backend"
	@echo "   - チャートアプリ: $(VOLUMES_CHART_DIR)"
	@echo "   - 設定アプリ: $(VOLUMES_SETTING_DIR)"
	@echo "   - 集計ツール: ./aggregation-tool"

# クリーンアップ（ビルド成果物のみ）
.PHONY: clean
clean:
	@echo "🧹 ビルド成果物をクリーンアップ中..."
	@rm -rf $(VOLUMES_BIN_DIR)
	@rm -rf $(CHART_APP_DIR)/dist
	@rm -rf $(SETTING_APP_DIR)/dist
	@rm -f ./aggregation-tool
	@echo "✅ クリーンアップが完了しました"

# 深いクリーンアップ（node_modules含む）
.PHONY: clean-deep
clean-deep: clean
	@echo "🧹 深いクリーンアップを実行中..."
	@rm -rf $(CHART_APP_DIR)/node_modules
	@rm -rf $(SETTING_APP_DIR)/node_modules
	@rm -rf $(BACKEND_DIR)/vendor
	@echo "✅ 深いクリーンアップが完了しました"

# Docker Composeでサービス起動
.PHONY: start
start:
	@echo "🐳 Docker Composeでサービスを起動中..."
	@docker compose up -d
	@echo "✅ サービスが起動しました"
	@echo ""
	@echo "🌐 アクセス先:"
	@echo "   - チャートアプリ: http://localhost/chart"
	@echo "   - 設定アプリ: http://localhost/setting"

# Docker Composeでサービス停止
.PHONY: stop
stop:
	@echo "🐳 Docker Composeでサービスを停止中..."
	@docker compose down
	@echo "✅ サービスが停止しました"

# サービス再起動
.PHONY: restart
restart: stop start

# ログ表示
.PHONY: logs
logs:
	@echo "📜 サービスのログを表示中..."
	@docker compose logs -f

# チャートアプリの開発サーバー起動
.PHONY: dev-chart
dev-chart:
	@echo "🚀 チャートアプリの開発サーバーを起動中..."
	@cd $(CHART_APP_DIR) && \
		if [ ! -d "node_modules" ]; then npm install; fi && \
		npm run dev

# 設定アプリの開発サーバー起動
.PHONY: dev-setting
dev-setting:
	@echo "🚀 設定アプリの開発サーバーを起動中..."
	@cd $(SETTING_APP_DIR) && \
		if [ ! -d "node_modules" ]; then npm install; fi && \
		npm run dev

# テスト実行
.PHONY: test
test:
	@echo "🧪 テストを実行中..."
	@cd $(BACKEND_DIR) && go test ./... -v
	@echo "✅ 全てのテストが完了しました"

# データベースの初期化（開発用）
.PHONY: init-db
init-db:
	@echo "🗄️  データベースを初期化中..."
	@rm -f volumes/db/database.db
	@mkdir -p volumes/db
	@echo "✅ データベースが初期化されました（アプリ起動時に自動作成されます）"

# システムステータス確認
.PHONY: status
status:
	@echo "📊 システムステータス:"
	@echo ""
	@if [ -f "$(VOLUMES_BIN_DIR)/backend" ]; then \
		echo "  ✅ バックエンドサーバー: ビルド済み"; \
	else \
		echo "  ❌ バックエンドサーバー: 未ビルド"; \
	fi
	@if [ -d "$(VOLUMES_CHART_DIR)" ] && [ -n "$$(ls -A $(VOLUMES_CHART_DIR) 2>/dev/null)" ]; then \
		echo "  ✅ チャートアプリ: ビルド済み"; \
	else \
		echo "  ❌ チャートアプリ: 未ビルド"; \
	fi
	@if [ -d "$(VOLUMES_SETTING_DIR)" ] && [ -n "$$(ls -A $(VOLUMES_SETTING_DIR) 2>/dev/null)" ]; then \
		echo "  ✅ 設定アプリ: ビルド済み"; \
	else \
		echo "  ❌ 設定アプリ: 未ビルド"; \
	fi
	@echo ""
	@docker compose ps 2>/dev/null || echo "  🐳 Docker: サービス未起動"

# 本番用デプロイ（ビルド + 起動）
.PHONY: deploy
deploy: clean build start
	@echo ""
	@echo "🚀 本番デプロイが完了しました！"
	@echo ""
	@echo "🌐 アクセス先:"
	@echo "   - チャートアプリ: http://localhost/chart"
	@echo "   - 設定アプリ: http://localhost/setting"
	@echo "   - REST API: http://localhost:15000/api"


archive:
	cd volumes && tar zcf data-`date +%s`.tar.gz db photos

extract:
	./aggregation-tool volumes/db/database.db volumes/photos output
