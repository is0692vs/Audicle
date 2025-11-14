import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageProvider } from "./types";

export class R2StorageProvider implements StorageProvider {
    private client: S3Client;
    private bucketName: string;

    constructor() {
        const accountId = process.env.R2_ACCOUNT_ID;
        if (!accountId) {
            throw new Error("R2_ACCOUNT_ID is not set");
        }

        this.bucketName = process.env.R2_BUCKET_NAME || "audicle-audio-cache";

        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

        if (!accessKeyId || !secretAccessKey) {
            throw new Error("R2 access keys are not set");
        }

        this.client = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    async generatePresignedPutUrl(key: string, expiresIn: number): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: "audio/mpeg",
        });
        return await getSignedUrl(this.client, command, { expiresIn });
    }

    async generatePresignedGetUrl(key: string, expiresIn: number): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });
        return await getSignedUrl(this.client, command, { expiresIn });
    }

    async uploadObject(key: string, data: ArrayBuffer | Buffer, contentType: string, expiresIn: number = 3600): Promise<string> {
        // AWS SDKはUint8Arrayを期待しているため変換が必要
        const body = data instanceof Buffer ? new Uint8Array(data) : new Uint8Array(data);
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: body,
                ContentType: contentType,
            })
        );

        // R2は公開エンドポイントを持たないため、取得時は署名付きURLを生成
        return this.generatePresignedGetUrl(key, expiresIn);
    }

    async deleteObject(key: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            })
        );
    }

    async headObject(key: string): Promise<{ exists: boolean; size?: number }> {
        try {
            const response = await this.client.send(
                new HeadObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                })
            );
            return { exists: true, size: response.ContentLength };
        } catch (error: unknown) {
            const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
            if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
                return { exists: false };
            }
            throw error;
        }
    }
}
