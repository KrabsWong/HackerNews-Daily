import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer, Server } from 'http';
import open from 'open';
import { SERVER_CONFIG } from '../config/constants';

export interface ProcessedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
  time: string;
  description: string;
  commentSummary: string | null;
}

/**
 * Find an available port starting from the given port
 */
async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    
    server.listen(startPort, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try next one
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Start the web server and serve the Vue application
 */
export async function startWebServer(stories: ProcessedStory[]): Promise<void> {
  const app: Express = express();
  let server: Server | null = null;
  
  // Enable CORS for local development
  app.use(cors());
  
  // Parse JSON bodies
  app.use(express.json());
  
  // API endpoint to get stories
  app.get('/api/stories', (req: Request, res: Response) => {
    try {
      res.json(stories);
    } catch (error) {
      console.error('Error serving stories:', error);
      res.status(500).json({
        error: 'Failed to fetch stories',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Serve static files from Vue build directory
  const webDistPath = path.join(__dirname, '../../web/dist');
  app.use(express.static(webDistPath));
  
  // Fallback to index.html for SPA routing (Express 5 requires named wildcard)
  app.get('/{*path}', (req: Request, res: Response) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
  
  try {
    // Find available port starting from default
    const port = await findAvailablePort(SERVER_CONFIG.DEFAULT_PORT);
    
    // Start server
    server = app.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`\n🌐 Web server started at ${url}`);
      console.log('Opening browser...\n');
      
      // Open browser
      open(url).catch(err => {
        console.warn('⚠️  Could not automatically open browser:', err.message);
        console.log(`Please manually open: ${url}\n`);
      });
    });
    
    // Graceful shutdown on SIGINT (Ctrl+C) and SIGTERM
    const shutdown = () => {
      console.log('\n\n🛑 Shutting down web server...');
      if (server) {
        server.close(() => {
          console.log('✅ Server closed');
          process.exit(0);
        });
        
        // Force close after timeout
        setTimeout(() => {
          console.log('⚠️  Forcing server shutdown');
          process.exit(1);
        }, SERVER_CONFIG.SHUTDOWN_TIMEOUT);
      } else {
        process.exit(0);
      }
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    console.error('\n❌ Failed to start web server:', error);
    console.log('Falling back to CLI mode...\n');
    throw error;
  }
}
