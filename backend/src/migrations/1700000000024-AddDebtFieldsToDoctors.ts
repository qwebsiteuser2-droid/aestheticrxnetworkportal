import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDebtFieldsToDoctors1700000000024 implements MigrationInterface {
  name = 'AddDebtFieldsToDoctors1700000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const doctorsTableExists = await queryRunner.hasTable('doctors');
    
    if (!doctorsTableExists) {
      console.log('⚠️ Doctors table does not exist, skipping debt fields migration');
      return;
    }

    // Add custom_debt_limit column
    const hasCustomDebtLimit = await queryRunner.hasColumn('doctors', 'custom_debt_limit');
    if (!hasCustomDebtLimit) {
      await queryRunner.addColumn('doctors', new TableColumn({
        name: 'custom_debt_limit',
        type: 'decimal',
        precision: 12,
        scale: 2,
        isNullable: true,
        comment: 'Custom debt limit set by admin for this doctor'
      }));
      console.log('✅ Added custom_debt_limit column to doctors table');
    }

    // Add admin_debt_override column
    const hasAdminDebtOverride = await queryRunner.hasColumn('doctors', 'admin_debt_override');
    if (!hasAdminDebtOverride) {
      await queryRunner.addColumn('doctors', new TableColumn({
        name: 'admin_debt_override',
        type: 'boolean',
        default: false,
        isNullable: false,
        comment: 'Whether admin has overridden the default debt limit'
      }));
      console.log('✅ Added admin_debt_override column to doctors table');
    }

    // Add total_owed_amount column
    const hasTotalOwedAmount = await queryRunner.hasColumn('doctors', 'total_owed_amount');
    if (!hasTotalOwedAmount) {
      await queryRunner.addColumn('doctors', new TableColumn({
        name: 'total_owed_amount',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
        isNullable: false,
        comment: 'Total amount owed by this doctor'
      }));
      console.log('✅ Added total_owed_amount column to doctors table');
    }

    // Add debt_limit_exceeded column
    const hasDebtLimitExceeded = await queryRunner.hasColumn('doctors', 'debt_limit_exceeded');
    if (!hasDebtLimitExceeded) {
      await queryRunner.addColumn('doctors', new TableColumn({
        name: 'debt_limit_exceeded',
        type: 'boolean',
        default: false,
        isNullable: false,
        comment: 'Whether the doctor has exceeded their debt limit'
      }));
      console.log('✅ Added debt_limit_exceeded column to doctors table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const doctorsTableExists = await queryRunner.hasTable('doctors');
    
    if (!doctorsTableExists) {
      return;
    }

    // Remove columns in reverse order
    const hasDebtLimitExceeded = await queryRunner.hasColumn('doctors', 'debt_limit_exceeded');
    if (hasDebtLimitExceeded) {
      await queryRunner.dropColumn('doctors', 'debt_limit_exceeded');
    }

    const hasTotalOwedAmount = await queryRunner.hasColumn('doctors', 'total_owed_amount');
    if (hasTotalOwedAmount) {
      await queryRunner.dropColumn('doctors', 'total_owed_amount');
    }

    const hasAdminDebtOverride = await queryRunner.hasColumn('doctors', 'admin_debt_override');
    if (hasAdminDebtOverride) {
      await queryRunner.dropColumn('doctors', 'admin_debt_override');
    }

    const hasCustomDebtLimit = await queryRunner.hasColumn('doctors', 'custom_debt_limit');
    if (hasCustomDebtLimit) {
      await queryRunner.dropColumn('doctors', 'custom_debt_limit');
    }
  }
}

