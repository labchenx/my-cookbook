import { config as loadDotenv } from 'dotenv';
import {
  ensureXhsDownloaderDevService,
  writeXhsDownloaderDevStatus,
  type XhsDownloaderDevStatus,
} from '../features/parsing/services/xhsDownloaderDev';

loadDotenv();

async function main() {
  const { status, childProcess } = await ensureXhsDownloaderDevService();
  writeXhsDownloaderDevStatus(status);
  console.log(`[xhs-downloader] ${status.message}`);

  if (!childProcess) {
    return;
  }

  const updateStatus = (nextStatus: XhsDownloaderDevStatus) => {
    writeXhsDownloaderDevStatus(nextStatus);
  };

  childProcess.once('exit', (code) => {
    updateStatus({
      ...status,
      available: false,
      source: 'unavailable',
      code: 'start_failed',
      message:
        typeof code === 'number'
          ? `Managed XHS Downloader process exited with code ${code}.`
          : 'Managed XHS Downloader process exited.',
      updatedAt: new Date().toISOString(),
    });
  });

  const shutdown = (signal: NodeJS.Signals) => {
    if (!childProcess.kill(signal)) {
      process.exit(0);
      return;
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await new Promise<void>((resolve) => {
    childProcess.once('exit', () => resolve());
  });
}

main().catch((error) => {
  console.error('[xhs-downloader] Failed to manage XHS Downloader startup.', error);
  process.exitCode = 1;
});
