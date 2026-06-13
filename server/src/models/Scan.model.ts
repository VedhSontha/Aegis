import { Schema, model, Document } from 'mongoose';

export interface IScan extends Document {
  target: string;
  targetType: 'url' | 'repo';
  status: 'pending' | 'scanning' | 'complete' | 'error';
  score: number;
  grade: string;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    passed: number;
  };
  createdAt: Date;
  completedAt: Date | null;
}

const ScanSchema = new Schema<IScan>({
  target: { type: String, required: true },
  targetType: { type: String, enum: ['url', 'repo'], required: true },
  status: { type: String, enum: ['pending', 'scanning', 'complete', 'error'], default: 'pending' },
  score: { type: Number, default: 100 },
  grade: { type: String, default: 'A+' },
  summary: {
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
    passed: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now, index: true },
  completedAt: { type: Date, default: null }
});

export const Scan = model<IScan>('Scan', ScanSchema);
