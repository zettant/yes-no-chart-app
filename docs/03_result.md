# 診断結果保存データ仕様

診断アプリでは、診断結果（途中経過）を以下のようにローカルストレージに保存しておき、最後にサーバに送信して、送信完了した時に削除する。また、チャート画面でリロードされた時は、このデータから現状を復元して途中からスタートする。

診断結果の保存データはIResult型とし、以下ように定義する。

```typescript
interface IResult {
  questionId: number;  // 設問ID
  choise: number;      // 選択番号
}

interface IResult {
  chartName: string;  // チャート名
  chartType: string;  // チャートタイプ
  timestamp: string;  // 開始時刻（ISO8601フォーマット）
  photo: string;      // 撮影データJPEGのBase64文字列
  currentQId?: number; // 現在の設問ID
  currentPoint?: number; // 現時点の点数(チャートタイプ=pointの場合のみ)
  diagnosisId?: number;  // 診断結果ID(結果まで到達した場合に記入)
  history: IResult[];    // 何を選択してきたかの履歴
}
```

