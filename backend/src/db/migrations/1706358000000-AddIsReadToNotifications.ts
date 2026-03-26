import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsReadToNotifications1706358000000 implements MigrationInterface {
    name = 'AddIsReadToNotifications1706358000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if is_read column exists before adding
        const hasIsReadColumn = await queryRunner.hasColumn('notifications', 'is_read');
        if (!hasIsReadColumn) {
            await queryRunner.query(`ALTER TABLE "notifications" ADD "is_read" boolean NOT NULL DEFAULT false`);
        }

        // Convert type column from ENUM to VARCHAR if needed
        // This allows adding new notification types without migration issues
        try {
            // Check current column type
            const columnInfo = await queryRunner.query(`
                SELECT data_type, udt_name 
                FROM information_schema.columns 
                WHERE table_name = 'notifications' AND column_name = 'type'
            `);
            
            if (columnInfo && columnInfo.length > 0) {
                const udtName = columnInfo[0].udt_name;
                
                // If it's using the enum type, convert to varchar
                if (udtName === 'notifications_type_enum') {
                    console.log('Converting type column from ENUM to VARCHAR...');
                    
                    // Alter column to varchar, casting existing values
                    await queryRunner.query(`
                        ALTER TABLE "notifications" 
                        ALTER COLUMN "type" TYPE varchar(50) 
                        USING "type"::text
                    `);
                    
                    // Optionally drop the old enum type
                    try {
                        await queryRunner.query(`DROP TYPE IF EXISTS notifications_type_enum`);
                    } catch (err) {
                        console.log('Could not drop enum type:', err);
                    }
                }
            }
        } catch (err) {
            console.log('Column type check/conversion error (may be fine):', err);
        }

        // Drop the old CHECK constraint if it exists
        try {
            await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "CHK_notifications_type"`);
        } catch (err) {
            // Ignore - constraint may not exist
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('notifications', 'is_read');
        if (hasColumn) {
            await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "is_read"`);
        }
    }
}

