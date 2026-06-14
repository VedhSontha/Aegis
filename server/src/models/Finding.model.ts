import { Schema, model, Document, Types } from 'mongoose';

export interface IFinding extends Document {
  scanId: Types.ObjectId;
  checkId: string;
  category: 'headers' | 'transport' | 'cookies' | 'cors' | 'disclosure' | 'clickjacking' | 'dependencies' | 'xss' | 'secrets' | 'code';
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  passed: boolean;
  evidence: string;
  description: string;
  fix: {
    text: string;
    code: string;
    lang: 'http' | 'javascript' | 'bash' | 'yaml' | 'python' | 'sql' | 'text';
  };
  weight: number;
}

const FindingSchema = new Schema<IFinding>({
  scanId: { type: Schema.Types.ObjectId, ref: 'Scan', required: true, index: true },
  checkId: { type: String, required: true },
  category: {
    type: String,
    enum: ['headers', 'transport', 'cookies', 'cors', 'disclosure', 'clickjacking', 'dependencies', 'xss', 'secrets', 'code'],
    required: true
  },
  title: { type: String, required: true },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'], required: true },
  passed: { type: Boolean, required: true },
  evidence: { type: String, default: '' },
  description: { type: String, default: '' },
  fix: {
    text: { type: String, default: '' },
    code: { type: String, default: '' },
    lang: { type: String, enum: ['http', 'javascript', 'bash', 'yaml', 'python', 'sql', 'text'], default: 'http' }
  },
  weight: { type: Number, default: 1.0 }
});

export const Finding = model<IFinding>('Finding', FindingSchema);
