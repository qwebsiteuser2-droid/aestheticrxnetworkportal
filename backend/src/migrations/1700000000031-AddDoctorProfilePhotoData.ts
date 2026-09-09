import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorProfilePhotoData1700000000031 implements MigrationInterface {
  name = 'AddDoctorProfilePhotoData1700000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('doctors', 'profile_photo_data');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "doctors" ADD COLUMN "profile_photo_data" text`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('doctors', 'profile_photo_data');
    if (hasColumn) {
      await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "profile_photo_data"`);
    }
  }
}
