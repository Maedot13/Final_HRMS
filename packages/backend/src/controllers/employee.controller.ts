
import { Request, Response } from 'express';
import * as employeeService from '../services/employee.service';
import { UserRole } from '@hrms/types';

export const getEmployee = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const user = req.user;

        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid employee ID. Please provide a numeric database ID.' });
        }

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Fetch employee
        const employee = await employeeService.getEmployeeById(id);

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Authorization:
        // 1. Admin/HR can view anyone
        // 2. Employee can view themselves
        const isSelf = employee.userId === user.userId;
        const isAdminOrHR = user.role === UserRole.ADMIN || user.role === UserRole.HR_OFFICER;

        if (!isSelf && !isAdminOrHR) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        res.json(employee);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateEmployee = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const user = req.user;
        const data = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid employee ID. Please provide a numeric database ID.' });
        }

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Fetch employee to check ownership
        const employee = await employeeService.getEmployeeById(id);

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Authorization:
        // 1. Admin/HR can update anyone (potentially partial fields)
        // 2. Employee can update themselves (restricted fields usually, like contact info)

        const isSelf = employee.userId === user.userId;
        const isAdminOrHR = user.role === UserRole.ADMIN || user.role === UserRole.HR_OFFICER;

        if (!isSelf && !isAdminOrHR) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        // TODO: Validate input with Zod schema (omitted for brevity in this step, should add later)

        // Prevent critical field updates by non-admins if necessary
        // For now, passing data through

        const updatedEmployee = await employeeService.updateEmployee(id, data);
        res.json(updatedEmployee);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
