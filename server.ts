import fs from 'fs';
import path from 'path';

const standaloneServer = path.join(process.cwd(), '.next', 'standalone', 'server.js');

if (process.env.NODE_ENV === 'production' && fs.existsSync(standaloneServer)) {
  process.env.PORT = process.env.PORT || '3000';
  process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
  // Load standalone production server
  await import(standaloneServer);
} else {
  const { createServer } = await import('http');
  const { parse } = await import('url');
  const next = (await import('next')).default;

  const port = parseInt(process.env.PORT || '3000', 10);
  const dev = process.env.NODE_ENV !== 'production';
  const app = next({ dev, hostname: '0.0.0.0', port });
  const handle = app.getRequestHandler();

  await app.prepare();
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, '0.0.0.0', () => {
    console.log(`> Server ready on http://0.0.0.0:${port}`);
  });
}
