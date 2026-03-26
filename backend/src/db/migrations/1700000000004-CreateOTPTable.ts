import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOTPTable1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'otp',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'otp_code',
            type: 'varchar',
            length: '6',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'is_used',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'used_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'purpose',
            type: 'varchar',
            length: '50',
            default: "'login'",
            comment: 'Purpose: login, password_reset, etc.',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_OTP_USER_ID',
            columnNames: ['user_id'],
          },
          {
            name: 'IDX_OTP_CODE',
            columnNames: ['otp_code'],
          },
          {
            name: 'IDX_OTP_EXPIRES_AT',
            columnNames: ['expires_at'],
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('otp');
  }
}
