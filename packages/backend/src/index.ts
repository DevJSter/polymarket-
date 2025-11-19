import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { marketsRouter } from './routes/markets';
import { eventsRouter } from './routes/events';
import { indexer } from './services/indexer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/markets', marketsRouter);
app.use('/api/events', eventsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    indexer: indexer.isRunning() ? 'running' : 'stopped'
  });
});

// Start indexer
indexer.start().catch(console.error);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`);
  console.log(`📊 Indexing events from blockchain...`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await indexer.stop();
  process.exit(0);
});
