import { Router } from 'express';
import * as campusController from '../controllers/campus.controller';
import { authenticate, requireUniversityAdmin } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

// All campus management routes require university admin (ADMIN + scope: UNIVERSITY)
router.use(authenticate);
router.use(requireUniversityAdmin);

router.get('/', cacheMiddleware(60), campusController.getCampuses);
router.post('/', campusController.createCampus);
router.get('/:id/users', campusController.getCampusUsers); // more specific before :id
router.get('/:id', campusController.getCampusById);
router.patch('/:id', campusController.updateCampus);

export default router;
