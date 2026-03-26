import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAIModelsTable1700000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('ai_models');
    if (!tableExists) {
    await queryRunner.createTable(
      new Table({
        name: 'ai_models',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'display_name',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'model_id',
            type: 'varchar',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
          },
          {
            name: 'max_tokens',
            type: 'int',
            default: 0,
          },
          {
            name: 'temperature',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0.7,
          },
          {
            name: 'max_requests_per_minute',
            type: 'int',
            default: 20,
          },
          {
            name: 'provider',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_models', true);
  }
}
