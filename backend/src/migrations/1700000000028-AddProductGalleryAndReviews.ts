import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductGalleryAndReviews1700000000028 implements MigrationInterface {
  name = 'AddProductGalleryAndReviews1700000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['image_front_data', 'image_back_data', 'image_side_data']) {
      const has = await queryRunner.hasColumn('products', col);
      if (!has) {
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "${col}" TEXT`);
      }
    }

    const hasReviews = await queryRunner.hasTable('product_reviews');
    if (!hasReviews) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "product_reviews" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "product_id" uuid NOT NULL,
          "user_id" uuid,
          "author_name" varchar(255) NOT NULL,
          "rating" int NOT NULL DEFAULT 5,
          "comment" text NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "FK_product_reviews_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_product_reviews_product_id" ON "product_reviews" ("product_id")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_reviews"`);
    for (const col of ['image_side_data', 'image_back_data', 'image_front_data']) {
      const has = await queryRunner.hasColumn('products', col);
      if (has) {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "${col}"`);
      }
    }
  }
}
