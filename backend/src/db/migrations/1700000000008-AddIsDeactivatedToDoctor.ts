import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddIsDeactivatedToDoctor1700000000008 implements MigrationInterface {
    name = 'AddIsDeactivatedToDoctor1700000000008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('doctors', 'is_deactivated');
        if (!hasColumn) {
            await queryRunner.addColumn('doctors', new TableColumn({
                name: 'is_deactivated',
                type: 'boolean',
                default: false,
                isNullable: false,
            }));
            console.log('✅ Added is_deactivated column to doctors');
        } else {
            console.log('ℹ️ is_deactivated column already exists');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('doctors', 'is_deactivated');
        if (hasColumn) {
            await queryRunner.dropColumn('doctors', 'is_deactivated');
        }
    }
}

