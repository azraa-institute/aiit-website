import { randomUUID } from 'crypto';
import { Global, Injectable, Logger, Module, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 (S3-compatible) client, used for direct browser -> R2 video
 * uploads -- the video file itself never passes through this server's
 * memory, unlike the Supabase-backed image/audio media-library path
 * (AdminBlogService.uploadToPublicUrl), which exists only to work around a
 * Supabase-specific RLS/JWT bug that doesn't apply to R2 (see
 * SupabaseAdminService's own doc comment for that bug).
 *
 * This is the one deliberate exception to this codebase's "thin hand-rolled
 * fetch wrapper, no SDK" house style (GithubPublisherService,
 * SupabaseAdminService, the PayPal/Razorpay/Paystack clients): AWS
 * Signature V4 presigned-URL signing is cryptographic, not a simple bearer
 * header, and Cloudflare's own R2 docs point at this exact SDK for it --
 * worth the dependency rather than hand-rolling SigV4.
 */
@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private client: S3Client | null = null;

  isConfigured(): boolean {
    return Boolean(
      process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME &&
        process.env.R2_PUBLIC_URL,
    );
  }

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        // R2 doesn't support virtual-hosted-style bucket addressing
        // (bucket-name.account-id.r2.cloudflarestorage.com isn't a real,
        // resolvable host) -- without this the SDK's v3 default produces
        // exactly that non-existent hostname and every signed URL fails
        // with a DNS-level "Failed to fetch" in the browser. Cloudflare's
        // own R2 + AWS SDK docs call this out explicitly.
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });
    }
    return this.client;
  }

  /**
   * A short-lived signed PUT URL for a direct browser -> R2 upload, plus the
   * resulting public URL once it lands. `contentType`/`contentLength` are
   * both baked into the signature (SignedHeaders), so the upload fails
   * outright if the browser sends a different mimetype or byte count than
   * what the caller validated before asking for this URL -- not just an
   * advisory check, R2 itself enforces it.
   */
  async createPresignedUploadUrl(
    key: string,
    contentType: string,
    contentLength: number,
    expiresSeconds = 300,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Video uploads are not configured on this server yet (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/R2_PUBLIC_URL missing).',
      );
    }
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
      });
      const uploadUrl = await getSignedUrl(this.getClient(), command, { expiresIn: expiresSeconds });
      const publicUrl = `${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`;
      return { uploadUrl, publicUrl };
    } catch (err) {
      this.logger.error('Could not create R2 presigned URL', err instanceof Error ? err.stack : String(err));
      throw new ServiceUnavailableException('Could not prepare the video upload right now -- try again shortly.');
    }
  }

  /** `media/video/{uuid}.{ext}` -- same unguessable-key convention as AdminBlogService.uploadToPublicUrl. */
  buildVideoKey(originalFilename: string): string {
    const ext = (originalFilename.split('.').pop() || 'bin').toLowerCase();
    return `media/video/${randomUUID()}.${ext}`;
  }
}

@Global()
@Module({ providers: [R2Service], exports: [R2Service] })
export class R2Module {}
