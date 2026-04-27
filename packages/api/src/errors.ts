export class HttpError extends Error {
  readonly statusCode: number;
  readonly errorToken: string;
  readonly errorCode: string;

  constructor(statusCode: number, errorToken: string, errorCode: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorToken = errorToken;
    this.errorCode = errorCode;
  }
}

export const NotFound = (resource: string, id: string) =>
  new HttpError(404, "not_found", `${resource}.not_found`, `${resource} ${id} not found`);

export const ValidationError = (code: string, message: string) =>
  new HttpError(400, "validation_error", code, message);
