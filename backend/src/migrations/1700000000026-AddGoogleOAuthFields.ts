import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGoogleOAuthFields1700000000026 implements MigrationInterface {
  name = 'AddGoogleOAuthFields1700000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if google_id column already exists
    const hasGoogleId = await queryRunner.hasColumn('doctors', 'google_id');
    if (!hasGoogleId) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'google_id',
          type: 'varchar',
          length: '255',
          isNullable: true,
        })
      );
    }

    // Check if is_google_user column already exists
    const hasIsGoogleUser = await queryRunner.hasColumn('doctors', 'is_google_user');
    if (!hasIsGoogleUser) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'is_google_user',
          type: 'boolean',
          default: false,
        })
      );
    }

    // Check if google_email_verified column already exists
    const hasGoogleEmailVerified = await queryRunner.hasColumn('doctors', 'google_email_verified');
    if (!hasGoogleEmailVerified) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'google_email_verified',
          type: 'boolean',
          default: false,
        })
      );
    }

    console.log('✅ Added Google OAuth fields to doctors table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check and remove columns if they exist
    const hasGoogleEmailVerified = await queryRunner.hasColumn('doctors', 'google_email_verified');
    if (hasGoogleEmailVerified) {
      await queryRunner.dropColumn('doctors', 'google_email_verified');
    }

    const hasIsGoogleUser = await queryRunner.hasColumn('doctors', 'is_google_user');
    if (hasIsGoogleUser) {
      await queryRunner.dropColumn('doctors', 'is_google_user');
    }

    const hasGoogleId = await queryRunner.hasColumn('doctors', 'google_id');
    if (hasGoogleId) {
      await queryRunner.dropColumn('doctors', 'google_id');
    }

    console.log('✅ Removed Google OAuth fields from doctors table');
  }
}
