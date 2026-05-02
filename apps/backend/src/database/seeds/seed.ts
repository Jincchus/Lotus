import { AppDataSource } from '../data-source';
import { seedBrokers } from './brokers.seed';

async function runSeed() {
  await AppDataSource.initialize();
  try {
    await seedBrokers(AppDataSource);
    console.log('Seed completed.');
  } finally {
    await AppDataSource.destroy();
  }
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
