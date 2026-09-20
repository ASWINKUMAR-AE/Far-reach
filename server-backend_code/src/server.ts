import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import newsRoutes from './routes/news.routes';
import procurementRoutes from './routes/procurement.routes';
import cvRoutes from './routes/cv.routes';
import paymentRoutes from './routes/payment.routes';
import fertilizerRoutes from './routes/fertilizer.routes';
import { startIngestionScheduler } from './services/ingestion.service';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Setup Socket.io for Live Updates
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Setup Prisma
export const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Set IO for routes
app.set('io', io);

// Routes
app.use('/api/news', newsRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/fertilizer', fertilizerRoutes);

// Socket.io Events
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start the ingestion scheduler for automatic RSS sync
startIngestionScheduler();

// Start Server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Live News Backend Server running on port ${PORT}`);
});
