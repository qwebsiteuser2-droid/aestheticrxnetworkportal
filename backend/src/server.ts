import { createServer } from 'http';
import app from './app';
import { initializeDatabase, closeDatabase } from './db/data-source';
import { schedulerService } from './services/schedulerService';
import { initializeSocketServer } from './socket/socketServer';

const PORT = parseInt(process.env.PORT || '4000', 10);

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection
    // In test/CI environments, allow server to start even if DB init fails
    // (for E2E tests that might not need full DB functionality)
    if (process.env.NODE_ENV === 'test' || process.env.CI) {
      try {
        await initializeDatabase();
      } catch (dbError) {
        console.error('⚠️ Database initialization failed in test/CI environment:', dbError);
        console.warn('⚠️ Server will continue without database connection (E2E tests may have limited functionality)');
        // Don't throw - allow server to start for basic health checks
      }
    } else {
      await initializeDatabase();
    }

    // Create HTTP server with Express app
    const httpServer = createServer(app);
    
    // Initialize Socket.io server
    const io = initializeSocketServer(httpServer);

    // Start the server
    // Bind to 0.0.0.0 to accept connections from all interfaces (important for CI/Docker)
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`🌐 Listening on: 0.0.0.0:${PORT}`);
      console.log(`✅ Server is ready to accept connections`);
      
      // Log Gmail configuration status at startup
      const hasGmailApi = !!(process.env.GMAIL_API_CLIENT_ID && process.env.GMAIL_API_CLIENT_SECRET && process.env.GMAIL_API_REFRESH_TOKEN && process.env.GMAIL_API_USER_EMAIL);
      const hasSmtp = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
      console.log(`📧 Email Configuration:`);
      console.log(`   Gmail API: ${hasGmailApi ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`   SMTP Fallback: ${hasSmtp ? '✅ Configured' : '❌ Not configured'}`);
      if (!hasGmailApi && !hasSmtp) {
        console.log(`   ⚠️ WARNING: No email service configured! OTPs and notifications will not be sent.`);
      }
      
      // Start the auto email scheduler
      schedulerService.start();
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Unexpected server error:', error);
        process.exit(1);
      }
    });

    // Log when server closes
    server.on('close', () => {
      console.log('⚠️ Server closed');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          // Stop the scheduler
          schedulerService.stop();
          
          await closeDatabase();
          console.log('Database connection closed');
          process.exit(0);
        } catch (error: unknown) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error: unknown) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
console.log('🔧 Starting server initialization...');
console.log('📦 Node version:', process.version);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('🔌 PORT:', process.env.PORT || '4000 (default)');
startServer().catch((error) => {
  console.error('❌ Fatal error starting server:', error);
  process.exit(1);
});
