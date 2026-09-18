import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    Owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // ReferenceCode of a ServiceRequest (LB-...) or Consultation (LC-...), or empty
    RequestReference: { type: String, default: '' },
    OriginalName: { type: String, required: true, maxlength: 150 },
    StoredName: { type: String, required: true, unique: true },
    MimeType: { type: String, required: true },
    SizeBytes: { type: Number, required: true },
    UploadedByRole: { type: String, enum: ['client', 'admin'], required: true },
    UploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'documents' },
);

documentSchema.index({ Owner: 1, createdAt: -1 });
documentSchema.index({ RequestReference: 1, createdAt: -1 });

export const DocumentModel = mongoose.model('Document', documentSchema);
