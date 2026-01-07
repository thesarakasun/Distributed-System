require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');

// Import background jobs
const { startCleanupJob } = require('./jobs/cleanup');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;
const SERVER_NAME = process.env.SERVER_NAME || 'unknown';

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${SERVER_NAME}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    server: SERVER_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Distributed Shared Note-Taking System API',
    server: SERVER_NAME,
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      notes: '/api/notes/*',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    server: SERVER_NAME,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    server: SERVER_NAME,
  });
});

// Start background cleanup job
const stopCleanupJob = startCleanupJob();

// Start server
const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log('Distributed Shared Note-Taking System');
  console.log('========================================');
  console.log(`✓ Server: ${SERVER_NAME}`);
  console.log(`✓ Port: ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n✓ SIGTERM received, shutting down gracefully...');
  
  // Stop accepting new connections
  server.close(() => {
    console.log('✓ HTTP server closed');
    
    // Stop background jobs
    stopCleanupJob();
    
    // Exit process
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('✗ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('\n✓ SIGINT received, shutting down gracefully...');
  server.close(() => {
    stopCleanupJob();
    process.exit(0);
  });
});

module.exports = app;
