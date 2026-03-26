import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePayFastITNTable1700000000012 implements MigrationInterface {
  name = 'CreatePayFastITNTable1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payfast_itn_notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'm_payment_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'pf_payment_id',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'payment_status',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'item_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'item_description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'amount_gross',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'amount_fee',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'amount_net',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'custom_str1',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'custom_str2',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'custom_str3',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'custom_str4',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'custom_str5',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'custom_int1',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'custom_int2',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'custom_int3',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'custom_int4',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'custom_int5',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'name_first',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'name_last',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'email_address',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'merchant_id',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'token',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'billing_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'signature',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'raw_payload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'received'",
          },
          {
            name: 'processing_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_PAYFAST_ITN_PF_PAYMENT_ID',
            columnNames: ['pf_payment_id'],
          },
          {
            name: 'IDX_PAYFAST_ITN_M_PAYMENT_ID',
            columnNames: ['m_payment_id'],
          },
          {
            name: 'IDX_PAYFAST_ITN_STATUS',
            columnNames: ['status'],
          },
          {
            name: 'IDX_PAYFAST_ITN_CREATED_AT',
            columnNames: ['created_at'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payfast_itn_notifications');
  }
}
