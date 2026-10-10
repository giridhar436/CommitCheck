/**
 * Envelope shapes every endpoint returns (see README / API examples).
 * Success: { success: true, message, data }
 * Error:   { success: false, message, error }
 */
export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: unknown;
}
