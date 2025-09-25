import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import ms from 'ms';
import { envs } from '@/config';
import { generateCode } from '@/utils/code';

const { accessKeyId, bucketName, endpoint, region, secretAccessKey } = envs.aws;

export class CloudStorageProvider {
  private s3Client: S3Client;
  constructor() {
    this.s3Client = new S3Client({
      endpoint: `https://${region}.${endpoint}/${envs.stage}`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async signFile(body: { filename: string; filetype: string }) {
    const { filename, url } = this.generateFilenameUrl(body.filename);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      ContentType: body.filetype,
      ACL: 'public-read',
    });

    const signedRequest = await getSignedUrl(this.s3Client, command, {
      expiresIn: ms('20 minutes'),
    });
    return { signedRequest, url, filename };
  }

  async uploadFile(body: { filename: string; filetype: string; file: File }) {
    const file = body.file;
    const maxFileSize = 10 * 1024 * 1024; // 10MB limit
    if (file instanceof Buffer && file.length > maxFileSize) {
      throw new Error(
        `File size exceeds the limit of ${maxFileSize / (1024 * 1024)}MB`
      );
    }

    const { filename, url } = this.generateFilenameUrl(body.filename);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Body: body.file,
      Key: filename,
      ContentType: body.filetype,
      ACL: 'public-read',
    });

    try {
      await this.s3Client.send(command);
    } catch (err) {
      console.error(err);
      throw new Error('Error uploading file to S3, for file: ' + filename);
    }

    return url;
  }

  private generateFilenameUrl(originalName: string): {
    filename: string;
    url: string;
  } {
    const code = generateCode();
    const terminal = originalName.split('.').pop();
    const filename = `${code}.${terminal}`;
    const url = `https://${bucketName}.${region}.${endpoint}/${envs.stage}${filename}`;
    return { filename, url };
  }
}
