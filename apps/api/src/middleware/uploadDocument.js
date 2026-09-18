import multer from 'multer';
import { DOCUMENT_MAX_BYTES } from '@lexbridge/shared';

// Memory storage: the buffer is type-checked before anything is written to disk
export const uploadSingleDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DOCUMENT_MAX_BYTES, files: 1, fields: 5 },
}).single('file');
