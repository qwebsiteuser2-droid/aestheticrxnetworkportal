import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAudioPricingAndRemoveText1700000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables exist before trying to modify them
    const areaConfigsExists = await queryRunner.hasTable('advertisement_area_configs');
    const videoAdsExists = await queryRunner.hasTable('video_advertisements');

    // Add audio pricing to advertisement area configs
    if (areaConfigsExists) {
      const hasAudioMultiplier = await queryRunner.hasColumn('advertisement_area_configs', 'audio_enabled_price_multiplier');
      if (!hasAudioMultiplier) {
        await queryRunner.addColumn('advertisement_area_configs', new TableColumn({
          name: 'audio_enabled_price_multiplier',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: true,
          default: 1.5,
          comment: 'Price multiplier for audio-enabled videos (e.g., 1.5 = 50% extra cost)'
        }));
      }
    }

    // Add audio_enabled field to video advertisements
    if (videoAdsExists) {
      const hasAudioEnabled = await queryRunner.hasColumn('video_advertisements', 'audio_enabled');
      if (!hasAudioEnabled) {
        await queryRunner.addColumn('video_advertisements', new TableColumn({
          name: 'audio_enabled',
          type: 'boolean',
          isNullable: true,
          default: false,
          comment: 'Whether audio is enabled for this video advertisement'
        }));
      }

      // Remove any text type advertisements (set to image as fallback)
      // Only if table has data and type column exists
      const hasTypeColumn = await queryRunner.hasColumn('video_advertisements', 'type');
      if (hasTypeColumn) {
        await queryRunner.query(`
          UPDATE video_advertisements 
          SET type = 'image' 
          WHERE type = 'text'
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('advertisement_area_configs', 'audio_enabled_price_multiplier');
    await queryRunner.dropColumn('video_advertisements', 'audio_enabled');
  }
}

