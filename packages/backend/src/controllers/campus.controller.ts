import { Request, Response } from 'express';
import * as campusService from '../services/campus.service';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';
import { createCampusSchema, updateCampusSchema } from '../schemas/campus.schema';

export const getCampuses = async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true';
    const campuses = await campusService.getAllCampuses(activeOnly);
    sendSuccess(res, campuses);
  } catch (error: any) {
    sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
  }
};

export const getCampusById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid campus ID', null, req);
    }
    const campus = await campusService.getCampusById(id);
    if (!campus) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Campus not found', null, req);
    }
    sendSuccess(res, campus);
  } catch (error: any) {
    sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
  }
};

export const getCampusReadiness = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid campus ID', null, req);
    }
    const readiness = await campusService.getCampusReadiness(id);
    sendSuccess(res, readiness);
  } catch (error: any) {
    sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
  }
};

export const createCampus = async (req: Request, res: Response) => {
  try {
    const parsed = createCampusSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten(), req);
    }

    const creatorId = req.user!.userId;
    const result = await campusService.createCampus(parsed.data, creatorId);
    sendSuccess(res, result, 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return sendError(res, 409, ErrorCode.UNIQUE_CONSTRAINT_VIOLATION, 'Campus code or admin credentials already exist', null, req);
    }
    sendError(res, 400, ErrorCode.INTERNAL_ERROR, error.message, null, req);
  }
};

export const updateCampus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid campus ID', null, req);
    }

    const parsed = updateCampusSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten(), req);
    }

    const updatedById = req.user?.userId;
    const campus = await campusService.updateCampus(id, parsed.data, updatedById);
    sendSuccess(res, campus);
  } catch (error: any) {
    if (error.code === 'P2025' || error.message === 'Campus not found') {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Campus not found', null, req);
    }
    // ID pattern is locked — business rule violation
    if (error.message.includes('pattern is locked')) {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, error.message, null, req);
    }
    // Activation readiness failure
    if (error.message.includes('cannot be activated')) {
      return sendError(res, 422, ErrorCode.VALIDATION_ERROR, error.message, null, req);
    }
    sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
  }
};

export const getCampusUsers = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid campus ID', null, req);
    }
    const result = await campusService.getCampusUsers(id);
    if (!result) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Campus not found', null, req);
    }
    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
  }
};


