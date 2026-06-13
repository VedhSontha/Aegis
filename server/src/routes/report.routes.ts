import { Router } from 'express';
import { exportMarkdown, getBadge } from '../controllers/report.controller';

const router = Router();

router.get('/:id/export.md', exportMarkdown);
router.get('/badge/:id.svg', getBadge);
router.get('/badge/:id', getBadge);

export default router;
