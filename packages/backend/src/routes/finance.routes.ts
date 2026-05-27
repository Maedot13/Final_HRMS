import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { financeLeaveDataStore, getFinanceLeaveData } from '../services/finance.service';
import { getCampusScope, getCampusIdFilter } from '../lib/campusScope';

const router = Router();
router.use(authenticate);

router.post('/leave-data', (req, res) => {
    financeLeaveDataStore.push({ ...req.body, id: Date.now(), receivedAt: new Date() });
    res.status(200).json({ success: true });
});

router.get('/leave-data', async (req, res) => {
    try {
        const campusCtx = getCampusScope(req);
        const campusId = getCampusIdFilter(campusCtx);

        const data = await getFinanceLeaveData(campusId);
        res.status(200).json(data);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
