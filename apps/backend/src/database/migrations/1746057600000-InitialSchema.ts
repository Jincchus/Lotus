import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1746057600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum types
    await queryRunner.query(
      `CREATE TYPE market_enum AS ENUM ('KR', 'US')`,
    );
    await queryRunner.query(
      `CREATE TYPE currency_enum AS ENUM ('KRW', 'USD')`,
    );
    await queryRunner.query(
      `CREATE TYPE sell_type_enum AS ENUM ('MANUAL', 'STRATEGY')`,
    );

    // brokers
    await queryRunner.query(`
      CREATE TABLE brokers (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(100) NOT NULL UNIQUE,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // users
    await queryRunner.query(`
      CREATE TABLE users (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_id      VARCHAR NOT NULL UNIQUE,
        email          VARCHAR NOT NULL UNIQUE,
        name           VARCHAR NOT NULL,
        profile_image  VARCHAR,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // stocks
    await queryRunner.query(`
      CREATE TABLE stocks (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol     VARCHAR(20) NOT NULL,
        market     market_enum NOT NULL,
        name       VARCHAR(200) NOT NULL,
        currency   currency_enum NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (symbol, market)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_stocks_symbol ON stocks (symbol)`);

    // exchange_rates
    await queryRunner.query(`
      CREATE TABLE exchange_rates (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_currency   VARCHAR(10) NOT NULL,
        to_currency     VARCHAR(10) NOT NULL,
        rate            NUMERIC(18,8) NOT NULL,
        fetched_at      TIMESTAMPTZ NOT NULL,
        expires_at      TIMESTAMPTZ NOT NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_exchange_rates_from ON exchange_rates (from_currency)`,
    );

    // price_snapshots
    await queryRunner.query(`
      CREATE TABLE price_snapshots (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol      VARCHAR(20) NOT NULL,
        market      market_enum NOT NULL,
        price       NUMERIC(18,8) NOT NULL,
        change_rate NUMERIC(8,4),
        fetched_at  TIMESTAMPTZ NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        UNIQUE (symbol, market)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_price_snapshots_symbol ON price_snapshots (symbol)`,
    );

    // watchlists
    await queryRunner.query(`
      CREATE TABLE watchlists (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol     VARCHAR(20) NOT NULL,
        market     market_enum NOT NULL,
        name       VARCHAR(200) NOT NULL,
        currency   currency_enum NOT NULL,
        memo       TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, symbol, market)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_watchlists_user_id ON watchlists (user_id)`,
    );

    // strategies
    await queryRunner.query(`
      CREATE TABLE strategies (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name        VARCHAR(100) NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at  TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_strategies_user_id ON strategies (user_id)`,
    );

    // strategy_rules
    await queryRunner.query(`
      CREATE TABLE strategy_rules (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        strategy_id         UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
        target_profit_rate  NUMERIC(8,2) NOT NULL,
        sell_ratio          NUMERIC(8,2) NOT NULL,
        order_index         INT NOT NULL DEFAULT 0,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // lots
    await queryRunner.query(`
      CREATE TABLE lots (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stock_id            UUID NOT NULL REFERENCES stocks(id),
        broker_id           UUID NOT NULL REFERENCES brokers(id),
        purchase_price      NUMERIC(18,8) NOT NULL,
        purchase_date       DATE NOT NULL,
        initial_quantity    NUMERIC(18,8) NOT NULL,
        remaining_quantity  NUMERIC(18,8) NOT NULL,
        memo                TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at          TIMESTAMPTZ,
        CONSTRAINT chk_initial_quantity_positive CHECK (initial_quantity > 0),
        CONSTRAINT chk_remaining_not_exceed_initial CHECK (remaining_quantity <= initial_quantity),
        CONSTRAINT chk_remaining_non_negative CHECK (remaining_quantity >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_lots_user_id ON lots (user_id)`,
    );

    // position_rules
    await queryRunner.query(`
      CREATE TABLE position_rules (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lot_id              UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
        source_strategy_id  UUID REFERENCES strategies(id) ON DELETE SET NULL,
        target_profit_rate  NUMERIC(8,2) NOT NULL,
        sell_ratio          NUMERIC(8,2) NOT NULL,
        order_index         INT NOT NULL DEFAULT 0,
        is_executed         BOOLEAN NOT NULL DEFAULT false,
        executed_at         TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_position_rules_lot_id ON position_rules (lot_id)`,
    );

    // sell_histories
    await queryRunner.query(`
      CREATE TABLE sell_histories (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lot_id                UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
        position_rule_id      UUID REFERENCES position_rules(id) ON DELETE SET NULL,
        sell_price            NUMERIC(18,8) NOT NULL,
        sell_quantity         NUMERIC(18,8) NOT NULL,
        sell_date             DATE NOT NULL,
        trigger_profit_rate   NUMERIC(8,2),
        realized_profit       NUMERIC(18,8) NOT NULL,
        exchange_rate_at_sell NUMERIC(18,8),
        sell_type             sell_type_enum NOT NULL DEFAULT 'MANUAL',
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_sell_quantity_positive CHECK (sell_quantity > 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_sell_histories_lot_id ON sell_histories (lot_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sell_histories`);
    await queryRunner.query(`DROP TABLE IF EXISTS position_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS lots`);
    await queryRunner.query(`DROP TABLE IF EXISTS strategy_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS strategies`);
    await queryRunner.query(`DROP TABLE IF EXISTS watchlists`);
    await queryRunner.query(`DROP TABLE IF EXISTS price_snapshots`);
    await queryRunner.query(`DROP TABLE IF EXISTS exchange_rates`);
    await queryRunner.query(`DROP TABLE IF EXISTS stocks`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS brokers`);
    await queryRunner.query(`DROP TYPE IF EXISTS sell_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS currency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS market_enum`);
  }
}
