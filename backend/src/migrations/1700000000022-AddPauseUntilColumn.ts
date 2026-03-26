import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPauseUntilColumn1700000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if video_advertisements table exists before trying to modify it
    const tableExists = await queryRunner.hasTable('video_advertisements');
    
    if (!tableExists) {
      // Table doesn't exist yet - skip this migration
      return;
    }

    // Check if column already exists before adding it
    const hasPauseUntil = await queryRunner.hasColumn('video_advertisements', 'pause_until');

    // Add pause_until column for temporary pauses
    if (!hasPauseUntil) {
      await queryRunner.addColumn('video_advertisements', new TableColumn({
        name: 'pause_until',
        type: 'timestamp',
        isNullable: true,
        default: null,
        comment: 'Timestamp when temporary pause should auto-resume. NULL for permanent pauses.'
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('video_advertisements', 'pause_until');
  }
}
