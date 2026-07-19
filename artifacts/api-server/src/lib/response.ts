import type { Response } from "express";

export function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function paginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number }
) {
  res.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
    timestamp: new Date().toISOString(),
  });
}

export function fail(res: Response, status: number, message: string) {
  res.status(status).json({ success: false, error: message });
}
