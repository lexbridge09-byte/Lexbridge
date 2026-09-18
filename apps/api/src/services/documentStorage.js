import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DOCUMENT_ALLOWED_TYPES } from '@lexbridge/shared';
import {
  S3_ACCESS_KEY_ID,
  S3_BUCKET,
  S3_ENDPOINT,
  S3_FORCE_PATH_STYLE,
  S3_KEY_PREFIX,
  S3_REGION,
  S3_SECRET_ACCESS_KEY,
  STORAGE_DRIVER,
  UPLOAD_DIR,
} from '../config/index.js';
import { createHttpError } from '../utils.js';

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const GENERIC_MIME_TYPES = new Set(['', 'application/octet-stream']);
const INVALID_FILE_MESSAGE = 'Upload a PDF, JPG, PNG or DOCX file up to 10 MB.';

function startsWithBytes(buffer, bytes) {
  return buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);
}

// Identify the real file type from its contents rather than trusting the browser
export function detectDocumentType(buffer) {
  if (startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (
    startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04])
    && buffer.includes('[Content_Types].xml')
    && buffer.includes('word/')
  ) {
    return DOCX_MIME_TYPE;
  }
  return null;
}

// Single-server storage on local disk
function createLocalDriver() {
  const resolvePath = (storedName) => path.join(UPLOAD_DIR, path.basename(storedName));
  return {
    async save(storedName, buffer) {
      await fsPromises.mkdir(UPLOAD_DIR, { recursive: true });
      await fsPromises.writeFile(resolvePath(storedName), buffer, { flag: 'wx' });
    },
    async open(storedName) {
      const filePath = resolvePath(storedName);
      try {
        await fsPromises.access(filePath);
      } catch {
        throw createHttpError(404, 'Document not found');
      }
      return fs.createReadStream(filePath);
    },
    async remove(storedName) {
      await fsPromises.rm(resolvePath(storedName), { force: true });
    },
  };
}

// Shared object storage, required once more than one API instance runs
function createS3Driver() {
  const client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT || undefined,
    forcePathStyle: S3_FORCE_PATH_STYLE,
    // Without explicit keys the SDK uses its default credential chain (e.g. an IAM role)
    credentials: S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY
      ? { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY }
      : undefined,
  });
  const deriveKey = (storedName) => `${S3_KEY_PREFIX}${path.basename(storedName)}`;

  return {
    async save(storedName, buffer, mimeType) {
      await client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: deriveKey(storedName),
        Body: buffer,
        ContentType: mimeType,
      }));
    },
    async open(storedName) {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: deriveKey(storedName) }));
        return result.Body;
      } catch (err) {
        if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
          throw createHttpError(404, 'Document not found');
        }
        throw err;
      }
    },
    async remove(storedName) {
      await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: deriveKey(storedName) }));
    },
  };
}

const storageDriver = STORAGE_DRIVER === 's3' ? createS3Driver() : createLocalDriver();

export async function saveDocumentFile({ buffer, declaredMimeType }) {
  const detectedMimeType = detectDocumentType(buffer);
  const isDeclaredTypeConsistent = GENERIC_MIME_TYPES.has(declaredMimeType ?? '')
    || declaredMimeType === detectedMimeType;
  if (!detectedMimeType || !DOCUMENT_ALLOWED_TYPES[detectedMimeType] || !isDeclaredTypeConsistent) {
    throw createHttpError(400, INVALID_FILE_MESSAGE);
  }

  const storedName = `${crypto.randomUUID()}${DOCUMENT_ALLOWED_TYPES[detectedMimeType]}`;
  await storageDriver.save(storedName, buffer, detectedMimeType);
  return { storedName, mimeType: detectedMimeType };
}

// Resolves to a readable stream, or rejects with a 404 error if the file is missing
export function openDocumentStream(storedName) {
  return storageDriver.open(storedName);
}

export async function deleteDocumentFile(storedName) {
  await storageDriver.remove(storedName);
}
