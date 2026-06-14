import { Router } from 'express';
import { simulateAttacks } from '../controllers/simulate.controller';

const router = Router();

/** POST /api/simulate — run the 8-probe susceptibility simulation */
router.post('/', simulateAttacks);

export default router;
