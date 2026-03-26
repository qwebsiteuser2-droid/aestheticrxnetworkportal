import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateConversationsAndMessages1700000000013 implements MigrationInterface {
  name = 'CreateConversationsAndMessages1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create conversations table
    const conversationsTableExists = await queryRunner.hasTable('conversations');
    if (!conversationsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'conversations',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'doctor_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'user_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'status',
              type: 'varchar',
              length: '20',
              default: "'active'",
            },
            {
              name: 'last_message_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'doctor_unread_count',
              type: 'integer',
              default: 0,
            },
            {
              name: 'user_unread_count',
              type: 'integer',
              default: 0,
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
        }),
        true
      );

      // Add indexes
      await queryRunner.createIndex('conversations', new TableIndex({
        name: 'IDX_conversations_doctor_id',
        columnNames: ['doctor_id'],
      }));

      await queryRunner.createIndex('conversations', new TableIndex({
        name: 'IDX_conversations_user_id',
        columnNames: ['user_id'],
      }));

      await queryRunner.createIndex('conversations', new TableIndex({
        name: 'IDX_conversations_last_message_at',
        columnNames: ['last_message_at'],
      }));

      // Add unique constraint for doctor-user pair
      await queryRunner.createIndex('conversations', new TableIndex({
        name: 'IDX_conversations_doctor_user_unique',
        columnNames: ['doctor_id', 'user_id'],
        isUnique: true,
      }));

      // Add foreign keys
      await queryRunner.createForeignKey('conversations', new TableForeignKey({
        name: 'FK_conversations_doctor',
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }));

      await queryRunner.createForeignKey('conversations', new TableForeignKey({
        name: 'FK_conversations_user',
        columnNames: ['user_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }));

      console.log('✅ Created conversations table');
    }

    // Create messages table
    const messagesTableExists = await queryRunner.hasTable('messages');
    if (!messagesTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'messages',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'conversation_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'sender_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'content',
              type: 'text',
              isNullable: false,
            },
            {
              name: 'message_type',
              type: 'varchar',
              length: '20',
              default: "'text'",
            },
            {
              name: 'is_read',
              type: 'boolean',
              default: false,
            },
            {
              name: 'read_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true
      );

      // Add indexes
      await queryRunner.createIndex('messages', new TableIndex({
        name: 'IDX_messages_conversation_id',
        columnNames: ['conversation_id'],
      }));

      await queryRunner.createIndex('messages', new TableIndex({
        name: 'IDX_messages_sender_id',
        columnNames: ['sender_id'],
      }));

      await queryRunner.createIndex('messages', new TableIndex({
        name: 'IDX_messages_created_at',
        columnNames: ['created_at'],
      }));

      await queryRunner.createIndex('messages', new TableIndex({
        name: 'IDX_messages_is_read',
        columnNames: ['is_read'],
      }));

      // Add foreign keys
      await queryRunner.createForeignKey('messages', new TableForeignKey({
        name: 'FK_messages_conversation',
        columnNames: ['conversation_id'],
        referencedTableName: 'conversations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }));

      await queryRunner.createForeignKey('messages', new TableForeignKey({
        name: 'FK_messages_sender',
        columnNames: ['sender_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }));

      console.log('✅ Created messages table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop messages table first (has FK to conversations)
    await queryRunner.dropTable('messages', true, true, true);
    console.log('✅ Dropped messages table');

    // Drop conversations table
    await queryRunner.dropTable('conversations', true, true, true);
    console.log('✅ Dropped conversations table');
  }
}

