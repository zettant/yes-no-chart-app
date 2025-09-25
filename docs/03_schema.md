# DBテーブルスキーマ

サーバはsqlite3のDBにファイルにチャート情報および診断結果データを保存する

## chartテーブル

resultテーブルには、診断結果データを保存する。

| カラム  | 型     | key/index   | 説明                             |
| ------- | ------ | ----------- | -------------------------------- |
| id      | int    | primary key | サロゲートキー                   |
| name    | string |             | チャート名                       |
| type    | string |             | チャートタイプ（decision/point） |
| diagram | string |             | チャート情報のJSON文字列         |



## resultテーブル

resultテーブルには、診断結果データを保存する。

| カラム         | 型     | key/index   | 説明                                     |
| -------------- | ------ | ----------- | ---------------------------------------- |
| id             | int    | primary key | サロゲートキー                           |
| timestamp      | string |             | 実施日時（ISO8601）                      |
| passphrase     | string |             | 写真暗号化用のランダム文字列パスフレーズ |
| chart_name     | string |             | チャート名                               |
| result_id      | string |             | 診断結果ID                               |
| point          | int    |             | チャートタイプ=pointの場合の最終ポイント |
| choose_history | string |             | 設問IDと選択枝番号の配列の配列のJSON     |

