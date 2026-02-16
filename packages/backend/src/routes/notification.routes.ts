
import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

export default router;
