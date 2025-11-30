import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { config } from "dotenv";
import { resolve } from "path";

// .env.test.local を読み込む
config({ path: resolve(__dirname, "../.env.test.local") });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ 環境変数が設定されていません");
    console.error("📝 .env.test.local ファイルを作成して以下を設定してください：");
    console.error("   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co");
    console.error("   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_USER_ID = "test-user-id-123";
const TEST_USER_EMAIL = "test@example.com";

async function seedTestData() {
    console.log("テストデータの投入を開始します...");

    // 1. テストユーザーの設定
    console.log("1. ユーザー設定を作成中...");
    const { error: userError } = await supabase
        .from("user_settings")
        .upsert({
            user_id: TEST_USER_ID,
            playback_speed: 1.0,
            voice_model: "ja-JP-Standard-B",
            language: "ja-JP",
            color_theme: "ocean",
        });

    if (userError) {
        console.error("ユーザー設定の作成に失敗:", userError);
        process.exit(1);
    }

    console.log("✓ ユーザー設定を作成しました");

    // 2. テスト記事の作成（E2Eで必要な件数を確保）
    console.log("2. テスト記事を作成中...");
    const articles = [
        {
            owner_email: TEST_USER_EMAIL,
            url: "https://example.com/article-1",
            title: "テスト記事1",
            thumbnail_url: "https://via.placeholder.com/300",
        },
        {
            owner_email: TEST_USER_EMAIL,
            url: "https://example.com/article-2",
            title: "テスト記事2",
            thumbnail_url: "https://via.placeholder.com/300",
        },
        {
            owner_email: TEST_USER_EMAIL,
            url: "https://example.com/popular-1",
            title: "人気記事1 - TypeScript入門",
            thumbnail_url: "https://via.placeholder.com/300",
        },
        {
            owner_email: TEST_USER_EMAIL,
            url: "https://example.com/popular-2",
            title: "人気記事2 - Next.js完全ガイド",
            thumbnail_url: "https://via.placeholder.com/300",
        },
        {
            owner_email: TEST_USER_EMAIL,
            url: "https://example.com/popular-3",
            title: "人気記事3 - Supabase実践",
            thumbnail_url: "https://via.placeholder.com/300",
        },
    ];

    const { data: createdArticles, error: articlesError } = await supabase
        .from("articles")
        .upsert(articles, { onConflict: "url" })
        .select();

    if (articlesError || !createdArticles) {
        console.error("記事の作成に失敗:", articlesError);
        process.exit(1);
    }
    console.log(`✓ ${createdArticles.length}件の記事を作成しました`);

    // 3. 人気記事の統計データを作成（access_count >= 5）
    console.log("3. 人気記事の統計データを作成中...");
    const popularArticles = createdArticles.slice(2);
    const fixedAccessCounts = [15, 20, 25];

    for (let i = 0; i < popularArticles.length; i += 1) {
        const article = popularArticles[i];
        const articleHash = createHash("sha256").update(article.url).digest("hex");
        const { error: statsError } = await supabase
            .from("article_stats")
            .upsert(
                {
                    article_hash: articleHash,
                    url: article.url,
                    title: article.title,
                    domain: "example.com",
                    access_count: fixedAccessCounts[i] ?? 10,
                    unique_users: 10,
                    cache_hit_rate: 0.85,
                    is_fully_cached: true,
                },
                { onConflict: "article_hash" }
            );

        if (statsError) {
            console.error("統計データの作成に失敗:", statsError);
            process.exit(1);
        }
    }
    console.log(
        `✓ 人気記事の統計データを作成しました（${popularArticles.length}件，access_count: ${fixedAccessCounts.join(", ")}）`
    );

    // 4. 音声キャッシュインデックス
    console.log("4. 音声キャッシュインデックスを作成中...");
    for (let i = 0; i < popularArticles.length; i += 1) {
        const article = popularArticles[i];
        const { error: cacheError } = await supabase
            .from("audio_cache_index")
            .upsert(
                {
                    article_url: article.url,
                    voice: "ja-JP",
                    cached_chunks: ["chunk-1", "chunk-2"],
                    completed_playback: true,
                    read_count: 5 + i,
                },
                { onConflict: "article_url,voice" }
            );

        if (cacheError) {
            console.error("キャッシュインデックスの作成に失敗:", cacheError);
            process.exit(1);
        }
    }
    console.log("✓ 音声キャッシュインデックスを作成しました");

    // 5. デフォルトプレイリストの作成
    console.log("5. デフォルトプレイリストを作成中...");

    await supabase
        .from("playlists")
        .delete()
        .eq("owner_email", TEST_USER_EMAIL)
        .eq("is_default", true);

    const { data: defaultPlaylist, error: playlistError } = await supabase
        .from("playlists")
        .insert({
            owner_email: TEST_USER_EMAIL,
            name: "デフォルトプレイリスト",
            description: "テスト用デフォルトプレイリスト",
            is_default: true,
            visibility: "private",
        })
        .select()
        .single();

    if (playlistError || !defaultPlaylist) {
        console.error("プレイリストの作成に失敗:", playlistError);
        process.exit(1);
    }
    console.log("✓ デフォルトプレイリストを作成しました");

    // 6. プレイリストアイテムの追加（3件）
    console.log("6. プレイリストアイテムを追加中...");
    for (let i = 0; i < 3 && i < createdArticles.length; i += 1) {
        const article = createdArticles[i];
        const { error: itemError } = await supabase.from("playlist_items").insert({
            playlist_id: defaultPlaylist.id,
            article_id: article.id,
            position: i,
        });

        if (itemError) {
            console.error("プレイリストアイテムの追加に失敗:", itemError);
            process.exit(1);
        }
    }
    console.log("✓ プレイリストアイテムを追加しました");

    console.log("\n✅ テストデータの投入が完了しました！");
    console.log(`   - ユーザー: ${TEST_USER_EMAIL}`);
    console.log(`   - 記事: ${createdArticles.length}件`);
    console.log(`   - 人気記事: ${popularArticles.length}件`);
    console.log("   - プレイリスト: 1件（3記事含む）");
}

seedTestData().catch((error) => {
    console.error("エラーが発生しました:", error);
    process.exit(1);
});
