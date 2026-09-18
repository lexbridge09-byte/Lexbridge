export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

// MIME type -> extension used when storing the file
export const DOCUMENT_ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export const DOCUMENT_ACCEPT_ATTRIBUTE = '.pdf,.jpg,.jpeg,.png,.docx';
