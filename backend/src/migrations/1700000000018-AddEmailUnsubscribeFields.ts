import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailUnsubscribeFields1700000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if doctors table exists before trying to modify it
    const doctorsTableExists = await queryRunner.hasTable("doctors");
    
    if (!doctorsTableExists) {
      // Doctors table doesn't exist yet - skip this migration
      return;
    }

    // Check if columns already exist before adding them
    const hasEmailUnsubscribed = await queryRunner.hasColumn("doctors", "email_unsubscribed");
    const hasEmailUnsubscribedAt = await queryRunner.hasColumn("doctors", "email_unsubscribed_at");

    // Add email_unsubscribed column
    if (!hasEmailUnsubscribed) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'email_unsubscribed',
          type: 'boolean',
          default: false,
        })
      );
    }

    // Add email_unsubscribed_at column
    if (!hasEmailUnsubscribedAt) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'email_unsubscribed_at',
          type: 'timestamp',
          isNullable: true,
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove email_unsubscribed_at column
    await queryRunner.dropColumn('doctors', 'email_unsubscribed_at');

    // Remove email_unsubscribed column
    await queryRunner.dropColumn('doctors', 'email_unsubscribed');
  }
}

