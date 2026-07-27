import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { processParentLookup } from './src/parentLookupService.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Parent Lookup API route
  app.post('/api/parent-lookup', async (req, res) => {
    try {
      const { studentCode, parentPhone, spreadsheetId } = req.body || {};
      const teacherToken = req.headers.authorization?.replace('Bearer ', '');

      const result = await processParentLookup(studentCode, parentPhone, spreadsheetId, teacherToken);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Express Parent Lookup API Error:', error);
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ في الخادم أثناء البحث عن بيانات الطالب.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
