# Yes/No診断チャートシステム

設問に答えていくことで診断結果を表示するWebアプリケーションシステムです。決定木タイプとポイント制タイプの2種類の診断方式に対応しています。

## 機能概要

### チャートアプリ（診断実行用）
- チャート選択画面：利用可能な診断チャートから選択
- 写真登録画面：名刺などの写真を撮影
- チャート画面：設問に順次回答
- 結果表示画面：診断結果の表示と保存

### 設定アプリ（管理用）
- チャート一覧画面：登録済みチャートの確認・削除
- 新規登録画面：CSVファイルからチャートを作成

## 技術構成

- **バックエンド**: Go + Gin + GORM + SQLite3
- **フロントエンド**: React + TypeScript + Vite
- **コンテナ**: Docker + Docker Compose
- **ビルド**: Makefile

## クイックスタート

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd yes-no-chart
```

### 2. システムのビルド
```bash
make build
```

### 3. サービスの起動
```bash
make start
```

### 4. アクセス
- **チャートアプリ**: http://localhost/chart
- **設定アプリ**: http://localhost/setting
- **REST API**: http://localhost:15000/api

## 開発環境

### 必要な環境
- Go 1.25.1以上
- Node.js 18以上
- Docker & Docker Compose
- Make

### 開発サーバーの起動
```bash
# チャートアプリの開発サーバー（ポート3000）
make dev-chart

# 設定アプリの開発サーバー（ポート3001）
make dev-setting
```

## Makefileコマンド

### ビルド関連
- `make build-server` - バックエンドサーバをビルド
- `make build-chart` - チャートアプリをビルド
- `make build-setting` - 設定アプリをビルド
- `make build` - 全てのコンポーネントをビルド

### Docker管理
- `make start` - サービスを起動
- `make stop` - サービスを停止
- `make restart` - サービスを再起動
- `make logs` - ログを表示

### クリーンアップ
- `make clean` - ビルド成果物を削除
- `make clean-deep` - node_modules含む全ての一時ファイルを削除

### その他
- `make status` - システムステータス確認
- `make deploy` - 本番デプロイ（clean + build + start）

## CSVファイル仕様

チャート登録用のCSVファイルは以下の構成で作成してください：

### ファイル形式
- UTF-8 BOM付きのCSVファイル
- 各パートの間に空行を挿入

### 基本情報パート
```csv
チャート名
チャートタイプ（decision または point）
```

### 設問パート
```csv
設問ID,最終フラグ,設問文,選択肢1,選択肢2,選択肢3,選択肢4,選択肢5,遷移先1,遷移先2,遷移先3,遷移先4,遷移先5
1,0,質問文をここに入力,はい,いいえ,,,2,3,,,
```

### 診断結果パート
```csv
診断結果ID,ポイント下限,ポイント上限,表示文章
1,0,10,診断結果の文章をここに入力
```

詳細な仕様については `docs/03_chart.md` を参照してください。

### サンプルCSVファイル

`samples/` ディレクトリに3つのサンプルCSVファイルを用意しています：

1. **`personality_chart.csv`** - 性格診断チャート（判定型）
   - 性格タイプを4つの質問で診断
   - 8つの診断結果パターン

2. **`health_check.csv`** - 健康度チェック（ポイント型）  
   - 生活習慣を5つの質問で評価
   - ポイント制による4段階評価

3. **`career_aptitude.csv`** - キャリア適性診断（判定型）
   - 職業適性を複数の質問で診断
   - 27つの詳細な診断結果

## アーキテクチャ

### ディレクトリ構成
```
yes-no-chart/
├── src/
│   ├── backend/          # Go バックエンドサーバ
│   ├── chart_app/        # React チャートアプリ
│   └── setting_app/      # React 設定アプリ
├── volumes/
│   ├── bin/              # ビルド済み実行ファイル
│   ├── db/               # SQLiteデータベース
│   └── photos/           # 暗号化された写真
├── docs/                 # 設計ドキュメント
├── Dockerfile
├── docker-compose.yml
└── Makefile
```

### ポート構成
- **80**: アプリコンテンツ（チャートアプリ、設定アプリ）
- **15000**: REST API

### データ保存
- **チャート情報**: SQLite3データベース（JSON形式で保存）
- **診断結果**: SQLite3データベース
- **写真ファイル**: AES256-CTRで暗号化して保存

## セキュリティ

- 写真ファイルはAES256-CTRで暗号化して保存
- 暗号化キーはランダム文字列のSHA256ハッシュ値
- Docker環境では非rootユーザーで実行
- ログイン機能なし（オープンアクセス）

## トラブルシューティング

### ビルドエラーが発生した場合
```bash
make clean-deep
make build
```

### Dockerサービスが起動しない場合
```bash
make stop
docker-compose down -v
make start
```

### データベースをリセットしたい場合
```bash
make init-db
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 貢献

プルリクエストやイシューは歓迎します。大きな変更を行う前に、まずイシューで議論することをお勧めします。
