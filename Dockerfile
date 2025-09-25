# マルチステージビルドでコンテナサイズを最小化
FROM alpine:3.18

# 必要なパッケージをインストール
# ca-certificates: HTTPS通信用
# timezone: タイムゾーン設定用
RUN apk --no-cache add ca-certificates tzdata

# タイムゾーンを日本時間に設定
ENV TZ=Asia/Tokyo

# 非rootユーザーでアプリケーションを実行（セキュリティ強化）
RUN addgroup -g 1000 appgroup && \
    adduser -D -s /bin/sh -u 1000 -G appgroup appuser

# アプリケーション用ディレクトリを作成
RUN mkdir -p /app /app/db /app/photos /app/chart_app /app/setting_app && \
    chown -R appuser:appgroup /app

# 作業ディレクトリを設定
WORKDIR /app

# ポート80（アプリコンテンツ）と15000（REST API）を公開
EXPOSE 80 15000

# ボリュームマウントポイントを定義
VOLUME ["/app/bin", "/app/db", "/app/photos", "/app/chart_app", "/app/setting_app"]

# 実行ユーザーを変更
USER appuser

# ヘルスチェック設定（アプリケーションが正常に動作しているかを確認）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# バックエンドサーバーの実行コマンド
# ボリュームマウントされた実行ファイルを起動
CMD ["/app/bin/backend"]