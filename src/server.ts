import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`DORMEX Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('Failed to start DORMEX server:', err);
    process.exit(1);
  }
}

start();
