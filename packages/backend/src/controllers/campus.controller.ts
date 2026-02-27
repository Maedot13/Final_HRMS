import { Request, Response } from 'express';
import * as campusService from '../services/campus.service';
import { sendError, sendSuccess, ErrorCode } from '../utils/errorHandler';

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

export const createCampus = async (req: Request, res: Response) => {
  try {
    const { code, name, description, timezone } = req.body;
    if (!code || !name || typeof code !== 'string' || typeof name !== 'string') {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'code and name are required', null, req);
    }
    const campus = await campusService.createCampus({ code, name, description, timezone });
    sendSuccess(res, campus, 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return sendError(res, 409, ErrorCode.UNIQUE_CONSTRAINT_VIOLATION, 'Campus code already exists', null, req);
    }
    sendError(res, 500, ErrorCode.INTERNAL_ERROR, error.message, null, req);
  }
};

export const updateCampus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid campus ID', null, req);
    }
    const { name, description, isActive, timezone } = req.body;
    const campus = await campusService.updateCampus(id, { name, description, isActive, timezone });
    sendSuccess(res, campus);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Campus not found', null, req);
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
