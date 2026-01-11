-- AlterTable
ALTER TABLE "albums" ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "files" ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "timelines" ALTER COLUMN "name" DROP NOT NULL;
