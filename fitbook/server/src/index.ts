import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { initSocket } from './socket';
import { startReminderJob } from './jobs/reminderJob';

const app = createApp();
const server = http.createServer(app);
initSocket(server);
startReminderJob();

server.listen(env.port, () => {
  console.log(`FitBook API listening on http://localhost:${env.port}`);
});
