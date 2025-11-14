export interface StorageProvider {
    /**
     * ファイルアップロード用の署名付きURLを生成
     */
    generatePresignedPutUrl(key: string, expiresIn: number): Promise<string>;

    /**
     * ファイル取得用の署名付きURLを生成
     */
    generatePresignedGetUrl(key: string, expiresIn: number): Promise<string>;

    /**
     * サーバーサイドから直接ファイルをアップロード
     */
    uploadObject(key: string, data: ArrayBuffer | Buffer, contentType: string, expiresIn?: number): Promise<string>;

    /**
     * ファイルを削除
     */
    deleteObject(key: string): Promise<void>;

    /**
     * ファイルの存在確認
     */
    headObject(key: string): Promise<{ exists: boolean; size?: number }>;
}
