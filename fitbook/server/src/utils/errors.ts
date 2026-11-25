export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg: string, code?: string) => new ApiError(400, msg, code);
export const unauthorized = (msg = 'Authentication required') => new ApiError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'You do not have permission to perform this action') =>
  new ApiError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Resource not found') => new ApiError(404, msg, 'NOT_FOUND');
export const conflict = (msg: string, code?: string) => new ApiError(409, msg, code);
