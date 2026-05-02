import { DataSource } from 'typeorm';
import { Broker } from '../../brokers/broker.entity';

const BROKERS = [
  '나무증권',
  '영웅문 (키움증권)',
  '토스증권',
  '카카오페이증권',
  'NH투자증권',
  '삼성증권',
  '미래에셋증권',
  '한국투자증권',
  '신한투자증권',
  '대신증권',
];

export async function seedBrokers(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Broker);
  for (const name of BROKERS) {
    const exists = await repo.findOneBy({ name });
    if (!exists) {
      await repo.save(repo.create({ name }));
    }
  }
  console.log(`Brokers seeded: ${BROKERS.length} entries`);
}
