# Vercel Blob head() 呼び出し最適化実装

## 概要

Vercel Blob の `head()` API 呼び出しを削減し、コストとパフォーマンスを最適化しました。

## 問題点

### 以前の実装
- **各チャンクごとに個別に `head()` を呼び出し**
- 10チャンクの記事 = 10回の head() API 呼び出し
- 同じ記事を複数回再生すると、毎回同じ head() 呼び出しが発生
- API コストとレイテンシーが増大

### コスト例
```
記事再生: 10チャンク × head() 呼び出し = 10 API calls
5回再生: 10 × 5 = 50 API calls
```

## 実装した最適化

### 1. インメモリキャッシュ (TTL: 1分)

```typescript
const blobExistenceCache = new Map<string, { 
  exists: boolean; 
  url?: string; 
  timestamp: number 
}>();
const BLOB_CACHE_TTL = 60 * 1000; // 1分
```

**効果:**
- 同一リクエスト内での重複 head() 呼び出しを排除
- 短時間での再生時に head() 呼び出しをスキップ

### 2. バッチ並列実行 (最大5件ずつ)

```typescript
const BATCH_SIZE = 5;
for (let i = 0; i < keysToCheck.length; i += BATCH_SIZE) {
  const batch = keysToCheck.slice(i, i + BATCH_SIZE);
  const results = await Promise.all(
    batch.map(async (key) => {
      try {
        const result = await head(key);
        return { key, exists: true, url: result.url };
      } catch {
        return { key, exists: false };
      }
    })
  );
}
```

**効果:**
- 10チャンクの場合、シーケンシャル実行よりも最大2倍高速化
- ネットワークレイテンシーの影響を軽減

### 3. 人気記事の最適化

```typescript
// 人気記事の場合、キャッシュが存在する前提で head() 呼び出しをスキップ
const keysToCheck = isPopularArticle ? [] : uncachedKeys;
```

**効果:**
- 人気記事 (readCount >= 5 && completedPlayback) では head() を完全スキップ
- キャッシュミス時のみ TTS にフォールバック

### 4. 自動クリーンアップ

```typescript
// 1000エントリ超えたら古い500件を削除
if (blobExistenceCache.size > 1000) {
  const entries = Array.from(blobExistenceCache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toDelete = entries.slice(0, 500);
  toDelete.forEach(([key]) => blobExistenceCache.delete(key));
}
```

**効果:**
- メモリリークを防止
- 長時間稼働時の安定性向上

## パフォーマンス改善

### Before (最適化前)
```
10チャンク記事を5回再生:
- head() 呼び出し: 50回
- レイテンシー: ~1秒 (10チャンク × 100ms)
```

### After (最適化後)
```
10チャンク記事を5回再生 (1分以内):
- 1回目: head() 10回 (バッチ並列: ~200ms)
- 2-5回目: head() 0回 (キャッシュヒット)
- 合計 head() 呼び出し: 10回 (80% 削減)
- レイテンシー: 初回 ~200ms、以降 ~0ms
```

### 人気記事の場合
```
人気記事 (readCount >= 5) を再生:
- head() 呼び出し: 0回 (完全スキップ)
- レイテンシー: ~0ms
- TTS フォールバック: キャッシュミス時のみ
```

## モニタリング

新しいログ出力:

```typescript
console.log(`[OPTIMIZATION] Head calls saved: ${headCallsSaved}, Keys to check: ${keysToCheck.length}/${cacheKeys.length}`);
console.log(`Cache stats - Hits: ${cacheHits}, Misses: ${cacheMisses}, Rate: ${hitRate * 100}%, Head calls saved: ${headCallsSaved}`);
console.log(`[OPTIMIZATION] Blob existence cache size: ${blobExistenceCache.size}`);
```

**例:**
```
[OPTIMIZATION] Head calls saved: 10, Keys to check: 0/10
Cache stats - Hits: 10, Misses: 0, Rate: 100%, Head calls saved: 10
[OPTIMIZATION] Blob existence cache size: 127
```

## コスト削減試算

### 前提条件
- 月間アクティブユーザー: 100人
- 1人あたり記事再生数: 50記事/月
- 平均チャンク数: 10チャンク/記事
- 再視聴率: 20% (同じ記事を1分以内に再生)

### Before
```
総 head() 呼び出し:
100ユーザー × 50記事 × 10チャンク = 50,000 calls/月
```

### After
```
総 head() 呼び出し:
- 初回: 100 × 50 × 10 = 50,000 calls
- 再視聴 (20%): 100 × 50 × 0.2 × 0 = 0 calls (キャッシュヒット)
- 人気記事 (30%): 100 × 50 × 0.3 × 0 = 0 calls (スキップ)
- 合計: 50,000 × 0.5 = 25,000 calls/月

削減率: 50%
```

## 追加の最適化案

### 1. Redis/Vercel KV によるキャッシュ共有
現在のインメモリキャッシュは単一サーバーインスタンス内のみ有効。Redis/Vercel KV を使用すれば、全インスタンスでキャッシュを共有可能。

### 2. Blob URL の TTL 管理
Vercel Blob の public URL は永続的なため、TTL を延長してキャッシュ効率を向上可能。

### 3. Prefetch 戦略
記事読み込み時に全チャンクの存在確認を事前実行し、再生開始時の head() 呼び出しを完全に排除。

## 参考資料

- [Vercel Blob Documentation](https://vercel.com/docs/vercel-blob)
- [Vercel Data Cache](https://vercel.com/docs/data-cache)
- [Vercel Observability Insights](https://vercel.com/docs/observability/insights)
