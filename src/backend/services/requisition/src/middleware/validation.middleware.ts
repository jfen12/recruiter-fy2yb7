/**
 * @fileoverview Express middleware for validating requisition-related requests
 * Implements comprehensive input validation, sanitization, and business rule enforcement
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'; // v4.18.2
import { validate as uuidValidate } from 'uuid'; // v9.0.0
import { validateRequisitionCreate, validateRequisitionUpdate, ValidationError } from '../utils/validation';
import { ApiResponse } from '../../shared/types/common.types';
import { RequisitionStatus } from '../interfaces/requisition.interface';

/**
 * Error response generator for validation failures
 * @param res - Express response object
 * @param error - Validation error details
 * @returns API response with validation errors
 */
function sendValidationError(res: Response, error: ValidationError): Response<ApiResponse<null>> {
  return res.status(400).json({
    status: 400,
    message: error.message,
    data: null,
    errors: Object.entries(error.errors).map(([field, messages]) => 
      `${field}: ${messages.join(', ')}`
    ),
    metadata: {
      error_codes: error.errorCodes,
      validation_timestamp: new Date().toISOString()
    },
    pagination: null
  });
}

/**
 * Middleware for validating requisition creation requests
 * Implements comprehensive validation and sanitization
 */
export const validateCreateRequisition: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract and validate request body
    const requisitionData = req.body;

    // Perform validation using the utility function
    await validateRequisitionCreate(requisitionData);

    // Additional status validation for creation
    if (requisitionData.status && requisitionData.status !== RequisitionStatus.DRAFT) {
      throw new ValidationError(
        'Invalid initial status',
        { status: ['New requisitions must be created in DRAFT status'] },
        { status: ['E_INVALID_INITIAL_STATUS'] }
      );
    }

    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      sendValidationError(res, error);
    } else {
      next(error);
    }
  }
};

/**
 * Middleware for validating requisition update requests
 * Implements comprehensive validation and sanitization
 */
export const validateUpdateRequisition: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate ID parameter
    const { id } = req.params;
    if (!uuidValidate(id)) {
      throw new ValidationError(
        'Invalid requisition ID',
        { id: ['Invalid UUID format'] },
        { id: ['E_INVALID_UUID'] }
      );
    }

    // Extract and validate request body
    const updateData = {
      id,
      ...req.body
    };

    // Perform validation using the utility function
    await validateRequisitionUpdate(updateData);

    // Validate status transitions
    if (updateData.status) {
      const currentStatus = req.body.current_status;
      if (!isValidStatusTransition(currentStatus, updateData.status)) {
        throw new ValidationError(
          'Invalid status transition',
          { status: [`Cannot transition from ${currentStatus} to ${updateData.status}`] },
          { status: ['E_INVALID_STATUS_TRANSITION'] }
        );
      }
    }

    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      sendValidationError(res, error);
    } else {
      next(error);
    }
  }
};

/**
 * Middleware for validating requisition ID format
 * Implements UUID validation
 */
export const validateRequisitionId: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { id } = req.params;

  if (!uuidValidate(id)) {
    const error = new ValidationError(
      'Invalid requisition ID',
      { id: ['Invalid UUID format'] },
      { id: ['E_INVALID_UUID'] }
    );
    sendValidationError(res, error);
    return;
  }

  next();
};

/**
 * Validates requisition status transitions
 * Implements business rules for status changes
 * @param currentStatus - Current requisition status
 * @param newStatus - Requested new status
 * @returns boolean indicating if transition is valid
 */
function isValidStatusTransition(
  currentStatus: RequisitionStatus,
  newStatus: RequisitionStatus
): boolean {
  const validTransitions: Record<RequisitionStatus, RequisitionStatus[]> = {
    [RequisitionStatus.DRAFT]: [
      RequisitionStatus.OPEN,
      RequisitionStatus.CANCELLED
    ],
    [RequisitionStatus.OPEN]: [
      RequisitionStatus.IN_PROGRESS,
      RequisitionStatus.ON_HOLD,
      RequisitionStatus.CANCELLED
    ],
    [RequisitionStatus.IN_PROGRESS]: [
      RequisitionStatus.OPEN,
      RequisitionStatus.ON_HOLD,
      RequisitionStatus.CLOSED,
      RequisitionStatus.CANCELLED
    ],
    [RequisitionStatus.ON_HOLD]: [
      RequisitionStatus.OPEN,
      RequisitionStatus.CANCELLED
    ],
    [RequisitionStatus.CLOSED]: [
      RequisitionStatus.CANCELLED
    ],
    [RequisitionStatus.CANCELLED]: []
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}