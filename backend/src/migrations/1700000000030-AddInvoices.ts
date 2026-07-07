import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoices1700000000030 implements MigrationInterface {
  name = 'AddInvoices1700000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invoice_counter (
        id SERIAL PRIMARY KEY,
        next_number INT NOT NULL DEFAULT 2001
      )
    `);
    await queryRunner.query(`
      INSERT INTO invoice_counter (id, next_number)
      SELECT 1, 2001
      WHERE NOT EXISTS (SELECT 1 FROM invoice_counter WHERE id = 1)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(32) NOT NULL UNIQUE,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
        clinic_name VARCHAR(255),
        doctor_name VARCHAR(255),
        invoice_date DATE NOT NULL,
        custom_footer TEXT,
        line_items JSONB NOT NULL,
        grand_total DECIMAL(12, 2) NOT NULL,
        source VARCHAR(20) NOT NULL DEFAULT 'manual',
        created_by UUID,
        emailed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS invoices`);
    await queryRunner.query(`DROP TABLE IF EXISTS invoice_counter`);
  }
}
