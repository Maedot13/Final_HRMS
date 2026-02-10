
import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes here require authentication
router.use(authenticate);

router.get('/:id', employeeController.getEmployee);
router.patch('/:id', employeeController.updateEmployee);

export default router;
