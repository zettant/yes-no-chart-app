import type { IChart, IQuestion, IDiagnosis, ValidationError } from './types';

/**
 * CSVファイルをテキストとして読み込み
 * @param file - CSVファイル
 * @returns CSVテキストのPromise
 */
export const readCSVFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      resolve(csvText);
    };
    
    reader.onerror = () => {
      reject(new Error('ファイル読み込みに失敗しました'));
    };
    
    // UTF-8 BOM付きとして読み込み
    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * CSVテキストを行に分割し、BOMを除去
 * @param csvText - CSVテキスト
 * @returns 行配列
 */
const parseCSVLines = (csvText: string): string[] => {
  // BOMを除去（UTF-8 BOMは0xEF,0xBB,0xBF）
  const cleanText = csvText.replace(/^\uFEFF/, '');
  
  // 行に分割（WindowsのCRLF、MacのCR、UnixのLFに対応）
  const lines = cleanText.split(/\r\n|\r|\n/);
  
  // 空行も保持する（後でパーサーが空行を判定して処理する）
  return lines;
};

/**
 * CSVの行をフィールド配列にパース
 * @param line - CSV行文字列
 * @returns フィールド配列
 */
const parseCSVLine = (line: string): string[] => {
  // 引用符で囲まれた文字列の処理は複雑なので、シンプルにカンマで分割
  // 引用符処理が必要な場合は後で拡張
  const fields = line.split(',');
  
  // 各フィールドをトリム
  return fields.map(field => field.trim());
};

/**
 * CSVテキストをIChart型オブジェクトに変換
 * @param csvText - CSVテキスト
 * @returns IChart型オブジェクト
 */
export const parseCSVToChart = (csvText: string): IChart => {
  const lines = parseCSVLines(csvText);
  const errors: ValidationError[] = [];
  
  if (lines.length < 5) {
    throw new Error('CSVファイルの形式が不正です。最低5行必要です。');
  }
  
  // 基本情報パート（1行目：チャート名、2行目：チャートタイプ）
  const chartName = lines[0].trim();
  const chartType = lines[1].trim();
  
  if (!chartName) {
    errors.push({ row: 1, field: 'チャート名', message: 'チャート名が入力されていません' });
  }
  
  if (chartType !== 'decision' && chartType !== 'single' && chartType !== 'multi') {
    errors.push({ row: 2, field: 'チャートタイプ', message: 'チャートタイプは"decision"、"single"、または"multi"を指定してください' });
  }
  
  // 空行をスキップして設問パートを探索
  let currentLineIndex = 2;
  
  // 空行をスキップ
  while (currentLineIndex < lines.length && lines[currentLineIndex].trim() === '') {
    currentLineIndex++;
  }
  
  if (currentLineIndex >= lines.length) {
    throw new Error('設問パートが見つかりません');
  }
  
  // 設問パートのヘッダーをスキップ
  currentLineIndex++;
  
  // 設問データをパース
  const questions: IQuestion[] = [];
  while (currentLineIndex < lines.length && lines[currentLineIndex].trim() !== '') {
    const fields = parseCSVLine(lines[currentLineIndex]);
    
    // ヘッダー行かどうかをチェック（最初のフィールドが"設問ID"かどうか）
    if (fields[0]?.trim() === '設問ID') {
      currentLineIndex++;
      continue; // ヘッダー行はスキップ
    }
    
    try {
      const question = parseQuestionRow(fields, chartType);
      questions.push(question);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`エラー行 ${currentLineIndex + 1}: "${lines[currentLineIndex]}"`);
        console.error(`パースされたフィールド数: ${fields.length}`);
        console.error(`フィールド内容:`, fields);
        for (let i = 0; i < fields.length; i++) {
          console.error(`  [${i}]: "${fields[i]}"`);
        }
        errors.push({ 
          row: currentLineIndex + 1, 
          field: '設問行', 
          message: `${error.message} (行内容: "${lines[currentLineIndex]}")` 
        });
      }
    }
    
    currentLineIndex++;
  }
  
  // 空行をスキップして診断結果パートを探索
  while (currentLineIndex < lines.length && lines[currentLineIndex].trim() === '') {
    currentLineIndex++;
  }
  
  if (currentLineIndex >= lines.length) {
    throw new Error('診断結果パートが見つかりません');
  }
  
  // 診断結果データをパース
  const diagnoses: IDiagnosis[] = [];
  while (currentLineIndex < lines.length) {
    if (lines[currentLineIndex].trim() === '') {
      currentLineIndex++;
      continue;
    }
    
    const fields = parseCSVLine(lines[currentLineIndex]);
    
    // ヘッダー行かどうかをチェック（最初のフィールドが"診断結果ID"かどうか）
    if (fields[0]?.trim() === '診断結果ID') {
      currentLineIndex++;
      continue; // ヘッダー行はスキップ
    }
    
    try {
      const diagnosis = parseDiagnosisRow(fields, chartType);
      diagnoses.push(diagnosis);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`エラー行 ${currentLineIndex + 1}: "${lines[currentLineIndex]}"`);
        console.error(`パースされたフィールド数: ${fields.length}`);
        console.error(`フィールド内容:`, fields);
        errors.push({ 
          row: currentLineIndex + 1, 
          field: '診断結果行', 
          message: `${error.message} (行内容: "${lines[currentLineIndex]}")` 
        });
      }
    }
    
    currentLineIndex++;
  }
  
  // エラーがある場合は例外をスロー
  if (errors.length > 0) {
    const errorMessages = errors.map(error => 
      `行${error.row} (${error.field}): ${error.message}`
    ).join('\n');
    throw new Error(`CSVの形式エラーがあります:\n${errorMessages}`);
  }
  
  // バリデーション
  if (questions.length === 0) {
    throw new Error('設問が1つも定義されていません');
  }
  
  if (diagnoses.length === 0) {
    throw new Error('診断結果が1つも定義されていません');
  }
  
  return {
    name: chartName,
    type: chartType,
    questions,
    diagnoses
  };
};

/**
 * 設問行をIQuestion型にパース
 * @param fields - CSVフィールド配列
 * @param chartType - チャートタイプ
 * @returns IQuestion型オブジェクト
 */
const parseQuestionRow = (fields: string[], chartType: string): IQuestion => {
  // フィールド数の確認と不足分の補完（14フィールド必要：ID、最終フラグ、カテゴリ、設問文、選択肢1-5、遷移先/ポイント1-5）
  while (fields.length < 14) {
    fields.push('');
  }
  
  const id = parseInt(fields[0], 10);
  const isLast = fields[1] === '1';
  const category = fields[2] || 'default'; // カテゴリフィールドを追加
  const sentence = fields[3]; // インデックスを1つずらす
  
  // 選択肢を取得（空文字でないもののみ）
  const choises: string[] = [];
  const nexts: number[] = [];
  const points: number[] = [];  // ポイント型チャート用
  
  for (let i = 0; i < 5; i++) {
    const choiceText = fields[4 + i]?.trim(); // インデックスを1つずらす
    const nextIdText = fields[9 + i]?.trim(); // インデックスを1つずらす
    
    console.log(`選択肢${i + 1}: "${choiceText}", 遷移先/ポイント${i + 1}: "${nextIdText}"`);
    
    if (choiceText && choiceText !== '') {
      choises.push(choiceText);
      
      if (nextIdText && nextIdText !== '') {
        const nextId = parseInt(nextIdText, 10);
        if (isNaN(nextId)) {
          throw new Error(`選択肢${i + 1}の遷移先/ポイントが数値ではありません`);
        }
        
        if (chartType === 'decision') {
          // decisionタイプ：遷移先はそのまま次の設問IDまたは診断結果ID
          nexts.push(nextId);
        } else if (chartType === 'single' || chartType === 'multi') {
          // single/multiタイプ：遷移先の値をポイントとして使用
          points.push(nextId);
          // 次の設問IDは現在のID + 1（順次進行）
          nexts.push(id + 1);
        } else {
          // 旧来のpointタイプ（後方互換性のため保持）
          points.push(nextId);
          nexts.push(id + 1);
        }
      } else {
        // 遷移先が空の場合はエラー（選択肢がある場合は遷移先必須）
        throw new Error(`選択肢${i + 1}の遷移先/ポイントが設定されていません`);
      }
    }
  }
  
  // バリデーション
  if (isNaN(id) || id < 1) {
    throw new Error('設問IDが無効です');
  }
  
  if (!sentence) {
    throw new Error('設問文が入力されていません');
  }
  
  if (choises.length < 2) {
    throw new Error('選択肢は最低2つ必要です');
  }
  
  if (choises.length !== nexts.length) {
    throw new Error('選択肢と遷移先の数が一致しません');
  }
  
  const question: IQuestion = {
    id,
    isLast,
    category,
    sentence,
    choises,
    nexts
  };
  
  // ポイントを使用するチャートタイプの場合のみpoints配列を追加
  if ((chartType === 'single' || chartType === 'multi') && points.length > 0) {
    question.points = points;
  }
  
  return question;
};

/**
 * 診断結果行をIDiagnosis型にパース
 * @param fields - CSVフィールド配列
 * @param chartType - チャートタイプ
 * @returns IDiagnosis型オブジェクト
 */
const parseDiagnosisRow = (fields: string[], chartType: string): IDiagnosis => {
  // フィールド数の不足分を空文字で補完（最低5フィールド必要：ID、カテゴリ、下限、上限、文章）
  while (fields.length < 5) {
    fields.push('');
  }
  
  const id = parseInt(fields[0], 10);
  const category = fields[1] || 'default'; // カテゴリフィールドを追加
  const sentence = fields[4]; // インデックスを1つずらす
  
  let lower = 0;
  let upper = 0;
  
  // ポイントを使用するチャートタイプの場合のみポイント範囲を設定
  if (chartType === 'single' || chartType === 'multi') {
    const lowerText = fields[2]?.trim();
    const upperText = fields[3]?.trim();
    
    if (lowerText) {
      lower = parseInt(lowerText, 10);
      if (isNaN(lower)) {
        throw new Error('ポイント下限が数値ではありません');
      }
    }
    
    if (upperText) {
      upper = parseInt(upperText, 10);
      if (isNaN(upper)) {
        throw new Error('ポイント上限が数値ではありません');
      }
    }
  }
  
  // バリデーション
  if (isNaN(id) || id < 1) {
    throw new Error('診断結果IDが無効です');
  }
  
  if (!sentence) {
    throw new Error('表示文章が入力されていません');
  }
  
  return {
    id,
    category,
    lower,
    upper,
    sentence
  };
};