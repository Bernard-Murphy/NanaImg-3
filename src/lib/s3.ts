import AWS from "aws-sdk";

AWS.config.update({
  region: process.env.REGION || "us-east-1",
});

export const s3 = new AWS.S3({
  endpoint: process.env.STORJ_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORJ_SECRET_ACCESS_ID!,
    secretAccessKey: process.env.STORJ_SECRET_ACCESS_KEY!,
  },
  // s3ForcePathStyle: true,
  // signatureVersion: 'v4',
});

export const BUCKET_NAME = process.env.STORJ_BUCKET || "feednana";

export async function createMultipartUpload(key: string, contentType: string) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  };

  const upload = await s3.createMultipartUpload(params).promise();
  return upload.UploadId;
}

export async function getPresignedUploadUrl(
  key: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    PartNumber: partNumber,
    UploadId: uploadId,
  };

  return s3.getSignedUrlPromise("uploadPart", params);
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ ETag: string; PartNumber: number }>
) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  };

  return s3.completeMultipartUpload(params).promise();
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  return s3.upload(params).promise();
}

export async function deleteFile(key: string) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  return s3.deleteObject(params).promise();
}

export function getFileUrl(key: string): string {
  return `${process.env.NEXT_PUBLIC_FILE_CDN_URL}/${key}`;
}
