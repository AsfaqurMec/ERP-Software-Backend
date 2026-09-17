export class AppError extends Error {
  constructor(public status: number, message: string, public code = 'ERROR') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string) {
    super(404, `${entity} not found`, 'NOT_FOUND');
  }
}

export class BusinessError extends AppError {
  constructor(message: string) {
    super(422, message, 'BUSINESS_RULE');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}
