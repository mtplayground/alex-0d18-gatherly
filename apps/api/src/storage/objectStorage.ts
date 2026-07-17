import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ObjectStorageConfig } from '../config';

const signedUrlExpiresSeconds = 60 * 60;

export interface ObjectStorage {
  uploadBuffer(input: UploadBufferInput): Promise<string>;
  getSignedReadUrl(relativeKey: string): Promise<string>;
}

export interface UploadBufferInput {
  relativeKey: string;
  contentType: string;
  body: Buffer;
}

function buildFullKey(config: ObjectStorageConfig, relativeKey: string): string {
  if (relativeKey.startsWith('/')) {
    throw new Error('Object storage key must be relative');
  }

  return `${config.prefix}${relativeKey}`;
}

export function createObjectStorage(config: ObjectStorageConfig): ObjectStorage {
  const s3 = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async uploadBuffer(input) {
      const fullKey = buildFullKey(config, input.relativeKey);
      await s3.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: fullKey,
          Body: input.body,
          ContentLength: input.body.length,
          ContentType: input.contentType,
        }),
      );

      return input.relativeKey;
    },

    async getSignedReadUrl(relativeKey) {
      const fullKey = buildFullKey(config, relativeKey);
      return getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: fullKey,
        }),
        { expiresIn: signedUrlExpiresSeconds },
      );
    },
  };
}
