import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAdvertisementSlides1700000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if video_advertisements table exists before trying to modify it
    const tableExists = await queryRunner.hasTable('video_advertisements');
    
    if (!tableExists) {
      // Table doesn't exist yet - skip this migration
      return;
    }

    // Check if columns already exist before adding them
    const hasSlides = await queryRunner.hasColumn('video_advertisements', 'slides');
    const hasSlideCount = await queryRunner.hasColumn('video_advertisements', 'slide_count');
    const hasSlideInterval = await queryRunner.hasColumn('video_advertisements', 'slide_interval_seconds');
    const hasAutoSlide = await queryRunner.hasColumn('video_advertisements', 'auto_slide_enabled');

    // Add slides field to store JSON array of slide URLs
    if (!hasSlides) {
      await queryRunner.addColumn('video_advertisements', new TableColumn({
        name: 'slides',
        type: 'jsonb',
        isNullable: true,
        default: null,
        comment: 'JSON array of slide objects: [{url, type, title, description, duration}]'
      }));
    }

    // Add slide_count field for admin configuration
    if (!hasSlideCount) {
      await queryRunner.addColumn('video_advertisements', new TableColumn({
        name: 'slide_count',
        type: 'int',
        isNullable: true,
        default: 1,
        comment: 'Number of slides to display (admin configurable)'
      }));
    }

    // Add slide_interval_seconds for slide rotation speed
    if (!hasSlideInterval) {
      await queryRunner.addColumn('video_advertisements', new TableColumn({
        name: 'slide_interval_seconds',
        type: 'int',
        isNullable: true,
        default: 5,
        comment: 'Seconds to display each slide before rotating'
      }));
    }

    // Add auto_slide_enabled flag
    if (!hasAutoSlide) {
      await queryRunner.addColumn('video_advertisements', new TableColumn({
        name: 'auto_slide_enabled',
        type: 'boolean',
        isNullable: true,
        default: true,
        comment: 'Enable automatic slide rotation'
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('video_advertisements', 'auto_slide_enabled');
    await queryRunner.dropColumn('video_advertisements', 'slide_interval_seconds');
    await queryRunner.dropColumn('video_advertisements', 'slide_count');
    await queryRunner.dropColumn('video_advertisements', 'slides');
  }
}

