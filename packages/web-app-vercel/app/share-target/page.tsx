import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import * as supabaseLocal from "@/lib/supabaseLocal";
import { getOrCreateDefaultPlaylist } from "@/lib/playlist-utils";
import { AutoCloseComponent } from "./AutoCloseComponent";
import type { Article } from "@/types/playlist";

interface ShareTargetPageProps {
  searchParams: Promise<{
    url?: string;
    title?: string;
  }>;
}

/**
 * 共有されたURLを検証する
 * @param url 検証対象のURL
 * @returns URLが有効な場合はtrue、無効な場合はfalse
 */
function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // http/httpsスキームのみ許可（javascript:, data:などの危険なスキームを拒否）
    const allowedProtocols = ["http:", "https:"];
    return allowedProtocols.includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

export default async function ShareTargetPage({
  searchParams,
}: ShareTargetPageProps) {
  const params = await searchParams;
  const sharedUrl = params.url;
  const sharedTitle = params.title;

  // URLパラメータが存在しない場合はホームへリダイレクト
  if (!sharedUrl) {
    redirect("/");
  }

  // URL検証
  if (!validateUrl(sharedUrl)) {
    console.error("Invalid URL scheme or format:", sharedUrl);
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="text-center text-white">
          <p className="text-xl">無効なURLです</p>
          <p className="text-zinc-400 mt-2">共有されたURLが正しくありません</p>
        </div>
      </div>
    );
  }

  // 認証チェック
  const session = await auth();

  if (!session || !session.user?.email) {
    // 未ログインの場合はログインページへリダイレクト
    const returnUrl = `/share-target?url=${encodeURIComponent(sharedUrl)}${sharedTitle ? `&title=${encodeURIComponent(sharedTitle)}` : ""}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(returnUrl)}`);
  }

  const userEmail = session.user.email;

  // 構造化ログ: 共有操作の開始
  console.log(
    JSON.stringify({
      action: "share_target_start",
      user_id: userEmail,
      timestamp: new Date().toISOString(),
      url: sharedUrl,
      has_title: !!sharedTitle,
    })
  );

  try {
    // デフォルトプレイリストを取得または作成
    const defaultPlaylistResult = await getOrCreateDefaultPlaylist(userEmail);

    if (defaultPlaylistResult.error || !defaultPlaylistResult.playlist) {
      console.error(
        "Failed to get default playlist:",
        defaultPlaylistResult.error
      );
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-900">
          <div className="text-center text-white">
            <p className="text-xl">プレイリストの取得に失敗しました</p>
            <p className="text-zinc-400 mt-2">
              しばらく待ってから再度お試しください
            </p>
          </div>
        </div>
      );
    }

    const playlistId = defaultPlaylistResult.playlist.id;

    // 記事を作成または既存のものを取得
    let article: Article | null = null;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Local fallback
      article = await supabaseLocal.upsertArticle(
        userEmail,
        sharedUrl,
        sharedTitle || "Shared Article",
        undefined,
        0
      );
    } else {
      // まず既存の記事を検索
      const { data: existingArticle, error: searchError } = await supabase
        .from("articles")
        .select()
        .eq("owner_email", userEmail)
        .eq("url", sharedUrl)
        .maybeSingle();

      if (searchError) {
        console.error("Error searching for existing article:", searchError);
        throw new Error("記事の検索に失敗しました");
      }

      if (existingArticle) {
        // 既存の記事があればタイトルを更新（共有時にタイトルが渡された場合）
        if (sharedTitle && sharedTitle !== existingArticle.title) {
          const { data: updated, error: updateError } = await supabase
            .from("articles")
            .update({ title: sharedTitle })
            .eq("id", existingArticle.id)
            .select()
            .single();

          if (updateError) {
            console.error("Error updating article title:", updateError);
            throw new Error("記事タイトルの更新に失敗しました");
          }
          article = updated;
        } else {
          article = existingArticle;
        }
      } else {
        // 新規作成
        const { data: created, error: createError } = await supabase
          .from("articles")
          .insert({
            owner_email: userEmail,
            url: sharedUrl,
            title: sharedTitle || "Shared Article",
            last_read_position: 0,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating article:", createError);
          throw new Error("記事の作成に失敗しました");
        }
        article = created;
      }
    }

    if (!article) {
      console.error("Failed to create or fetch article");
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-900">
          <div className="text-center text-white">
            <p className="text-xl">記事の追加に失敗しました</p>
          </div>
        </div>
      );
    }

    // プレイリストに追加（既に存在する場合はスキップ）
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Local fallback
      await supabaseLocal.addPlaylistItem(playlistId, article.id);
    } else {
      // RPC関数を使用してアトミックに追加（race condition対策）
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc("add_playlist_item_at_end", {
          p_playlist_id: playlistId,
          p_article_id: article.id,
        })
        .single();

      if (rpcError) {
        console.error("Error calling add_playlist_item_at_end:", rpcError);
        throw new Error("プレイリストへの追加に失敗しました");
      }

      console.log(
        JSON.stringify({
          action: "playlist_item_added",
          user_id: userEmail,
          timestamp: new Date().toISOString(),
          position: rpcResult?.position,
          already_exists: rpcResult?.already_exists,
        })
      );
    }

    // 成功：自動的に閉じるコンポーネントを表示
    console.log(
      JSON.stringify({
        action: "share_target_success",
        user_id: userEmail,
        timestamp: new Date().toISOString(),
        article_id: article.id,
        playlist_id: playlistId,
      })
    );
    return <AutoCloseComponent articleTitle={sharedTitle || article.title} />;
  } catch (error) {
    console.error("Error in share-target:", error);
    console.log(
      JSON.stringify({
        action: "share_target_error",
        user_id: userEmail,
        timestamp: new Date().toISOString(),
        error_type: error instanceof Error ? error.constructor.name : "unknown",
        error_message: error instanceof Error ? error.message : String(error),
      })
    );
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="text-center text-white">
          <p className="text-xl">エラーが発生しました</p>
          <p className="text-zinc-400 mt-2">
            記事の追加に失敗しました。しばらく待ってから再度お試しください
          </p>
        </div>
      </div>
    );
  }
}
