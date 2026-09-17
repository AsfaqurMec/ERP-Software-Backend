import { app } from './app.js';
import { startKeepAlive, stopKeepAlive } from './lib/keep-alive.js';

const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, () => {
  console.log(`🚀 StockPilot API server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  
  // Start automatic keep-alive self-ping (prevents Render sleep)
  startKeepAlive();
});

// Graceful shutdown
function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  stopKeepAlive();
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
