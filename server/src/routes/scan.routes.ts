import { Router } from 'express';
import { createScan, getScan, streamScan } from '../controllers/scan.controller';

const router = Router();

router.post('/', createScan);
router.get('/:id', getScan);
router.get('/:id/stream', streamScan);

export default router;
