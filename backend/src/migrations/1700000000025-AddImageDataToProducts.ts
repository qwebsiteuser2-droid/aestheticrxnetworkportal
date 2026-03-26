import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImageDataToProducts1700000000025 implements MigrationInterface {
    name = 'AddImageDataToProducts1700000000025'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column exists before adding
        const hasColumn = await queryRunner.hasColumn('products', 'image_data');
        
        if (!hasColumn) {
            console.log('Adding image_data column to products table...');
            await queryRunner.query(`
                ALTER TABLE "products" 
                ADD COLUMN IF NOT EXISTS "image_data" TEXT
            `);
            console.log('✅ image_data column added to products table');
        } else {
            console.log('image_data column already exists in products table');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('products', 'image_data');
        
        if (hasColumn) {
            await queryRunner.query(`
                ALTER TABLE "products" 
                DROP COLUMN IF EXISTS "image_data"
            `);
            console.log('image_data column removed from products table');
        }
    }
}
