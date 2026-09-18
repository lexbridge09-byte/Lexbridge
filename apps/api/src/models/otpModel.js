import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    Email: { type: String, required: true, lowercase: true, trim: true, index: true },
    CodeHash: { type: String, required: true },
    Attempts: { type: Number, default: 0 },
    // TTL index: MongoDB removes the document once expiresAt passes
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true, collection: 'otpCodes' },
);

export const OtpModel = mongoose.model('Otp', otpSchema);
