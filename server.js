// server.js — HTTP server entry point
'use strict';

require('dotenv').config();

const http = require('http');
const app  = require('./app');
const logger = require('./config/logger');
const { checkDatabaseConnection } = require('./config/database');

const PORT = parseInt(process.env.PORT || '3000', 10);

/**
 * Startup sequence:
 * 1. Verify database connectivity
 * 2. Start HTTP server
 * Exits with code 1 on any startup failure.
 */
async function startServer() {
  try {
    // Step 1: Verify DB connectivity before accepting requests
    await checkDatabaseConnection();

    // Step 2: Start the HTTP server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info('Appasamy Reports server started', {
        port:        PORT,
        environment: process.env.NODE_ENV || 'development',
        pid:         process.pid,
      });
    });

    // Graceful shutdown on SIGTERM / SIGINT
    const shutdown = (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      // Force exit after 10 seconds if connections don't drain
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    // Log unhandled promise rejections — never swallow them silently
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack:  reason instanceof Error ? reason.stack : undefined,
      });
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception — shutting down', {
        error: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });

  } catch (err) {
    logger.error('Server startup failed', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

startServer();
