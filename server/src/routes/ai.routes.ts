import { Router } from 'express';
import { analyzeScanController } from '../controllers/ai.controller';

const router = Router();

router.post('/analyze', analyzeScanController);

export default router;
