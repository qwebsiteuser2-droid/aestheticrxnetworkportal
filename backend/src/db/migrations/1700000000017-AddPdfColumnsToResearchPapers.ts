import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Production error:
 *   column ResearchPaper.pdf_file_url does not exist
 * when GET /api/user-stats/:id loads research_papers.
 *
 * The TypeORM entity and CreateBaseTables migration include pdf_file_url /
 * pdf_file_name, but older production DBs were created without them.
 * Guarded ADD COLUMN so this is safe on fresh and existing databases.
 */
export class AddPdfColumnsToResearchPapers1700000000017 implements MigrationInterface {
  name = 'AddPdfColumnsToResearchPapers1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUrl = await queryRunner.hasColumn('research_papers', 'pdf_file_url');
    if (!hasUrl) {
      await queryRunner.query(`
        ALTER TABLE "research_papers"
        ADD COLUMN "pdf_file_url" varchar(500)
      `);
    }

    const hasName = await queryRunner.hasColumn('research_papers', 'pdf_file_name');
    if (!hasName) {
      await queryRunner.query(`
        ALTER TABLE "research_papers"
        ADD COLUMN "pdf_file_name" varchar(255)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasName = await queryRunner.hasColumn('research_papers', 'pdf_file_name');
    if (hasName) {
      await queryRunner.query(`ALTER TABLE "research_papers" DROP COLUMN "pdf_file_name"`);
    }
    const hasUrl = await queryRunner.hasColumn('research_papers', 'pdf_file_url');
    if (hasUrl) {
      await queryRunner.query(`ALTER TABLE "research_papers" DROP COLUMN "pdf_file_url"`);
    }
  }
}
