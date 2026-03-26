import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDoctorAvailabilityFields1700000000012 implements MigrationInterface {
  name = 'AddDoctorAvailabilityFields1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_online column
    const hasIsOnline = await queryRunner.hasColumn('doctors', 'is_online');
    if (!hasIsOnline) {
      await queryRunner.addColumn('doctors', new TableColumn({
        name: 'is_online',
        type: 'boolean',
        default: false,
        isNullable: false,
      }));
    }

    // Add availability_status column
    const hasAvailabilityStatus = await queryRunner.hasColumn('doctors', 'availability_status');
    if (!hasAvailabilityStatus) {
      await queryRunner.addColumn('doctors', new TableColumn({
        name: 'availability_status',
        type: 'varchar',
        length: '20',
        default: "'available'",
        isNullable: false,
      }));
    }

    // Add last_active_at column
    const hasLastActiveAt = await queryRunner.hasColumn('doctors', 'last_active_at');
    if (!hasLastActiveAt) {
      await queryRunner.addColumn('doctors', new TableColumn({
        name: 'last_active_at',
        type: 'timestamp',
        isNullable: true,
      }));
    }

    // Add specialties column (array of strings for filtering)
    const hasSpecialties = await queryRunner.hasColumn('doctors', 'specialties');
    if (!hasSpecialties) {
      await queryRunner.addColumn('doctors', new TableColumn({
        name: 'specialties',
        type: 'text',
        isArray: true,
        isNullable: true,
      }));
    }

    console.log('✅ Added doctor availability fields: is_online, availability_status, last_active_at, specialties');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('doctors', 'specialties');
    await queryRunner.dropColumn('doctors', 'last_active_at');
    await queryRunner.dropColumn('doctors', 'availability_status');
    await queryRunner.dropColumn('doctors', 'is_online');
    
    console.log('✅ Removed doctor availability fields');
  }
}

