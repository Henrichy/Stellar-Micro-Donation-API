const express = require('express');
const request = require('supertest');
const asyncHandler = require('../../src/utils/asyncHandler');
const { errorHandler } = require('../../src/middleware/errorHandler');

describe('Async Handler Error Integration', () => {
  it('should catch throwing async route handlers and forward them to the error middleware with correlation ID', async () => {
    const app = express();

    // Mock requestId middleware to attach a correlation ID (req.id)
    app.use((req, res, next) => {
      req.id = 'ci-correlation-id-999';
      next();
    });

    // An async route handler that throws an error
    app.get('/test-error', asyncHandler(async (req, res) => {
      throw new Error('Async error test');
    }));

    // Register global error middleware
    app.use(errorHandler);

    const response = await request(app)
      .get('/test-error')
      .expect(500);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Async error test',
          requestId: 'ci-correlation-id-999',
          timestamp: expect.any(String),
        }),
      })
    );
  });
});
