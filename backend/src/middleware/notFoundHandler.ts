import { Request, Response, NextFunction } from 'express';

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: {
      auth: '/api/auth/*',
      products: '/api/products/*',
      orders: '/api/orders/*',
      health: '/health',
      api: '/api'
    }
  });
};
