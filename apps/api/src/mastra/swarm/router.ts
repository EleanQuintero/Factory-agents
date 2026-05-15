import { Router } from 'express';
import {
  handleHealth,
  handleCreateAgent,
  handleUpdateAgent,
  handleChat,
  handleStatus,
} from './controllers/agent.controller';

const router = Router();

// Health check
router.get('/health', handleHealth);

// Agent management
router.post('/agent/create', handleCreateAgent);
router.post('/agent/update', handleUpdateAgent);

// Chat with agent
router.post('/chat/:agentId', handleChat);

// VM status
router.get('/status', handleStatus);

export default router;