import { Router } from 'express';
import { generateShield, generateCiCd } from '../controllers/generate.controller';

const router = Router();

router.post('/shield', generateShield);
router.post('/cicd', generateCiCd);

export default router;
