import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExchangeRateAtPurchaseToLots1746144000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lots
      ADD COLUMN exchange_rate_at_purchase NUMERIC(18,8) NULL
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN lots.exchange_rate_at_purchase IS 'USD 종목 매수 시점 환율 (KRW/USD). KRW 종목은 NULL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lots DROP COLUMN exchange_rate_at_purchase
    `);
  }
}
