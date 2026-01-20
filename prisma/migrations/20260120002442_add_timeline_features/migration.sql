/*
  Warnings:

  - You are about to drop the column `positionEnd` on the `timeline_items` table. All the data in the column will be lost.
  - You are about to drop the column `positionStart` on the `timeline_items` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `timeline_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "timeline_items" DROP COLUMN "positionEnd",
DROP COLUMN "positionStart",
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "timeline_contributors" (
    "id" SERIAL NOT NULL,
    "timelineId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_contributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_item_files" (
    "id" SERIAL NOT NULL,
    "timelineItemId" INTEGER NOT NULL,
    "fileId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_item_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_item_albums" (
    "id" SERIAL NOT NULL,
    "timelineItemId" INTEGER NOT NULL,
    "albumId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_item_albums_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timeline_contributors_timelineId_userId_key" ON "timeline_contributors"("timelineId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_item_files_timelineItemId_fileId_key" ON "timeline_item_files"("timelineItemId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_item_albums_timelineItemId_albumId_key" ON "timeline_item_albums"("timelineItemId", "albumId");

-- AddForeignKey
ALTER TABLE "timeline_contributors" ADD CONSTRAINT "timeline_contributors_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_contributors" ADD CONSTRAINT "timeline_contributors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_item_files" ADD CONSTRAINT "timeline_item_files_timelineItemId_fkey" FOREIGN KEY ("timelineItemId") REFERENCES "timeline_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_item_files" ADD CONSTRAINT "timeline_item_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_item_albums" ADD CONSTRAINT "timeline_item_albums_timelineItemId_fkey" FOREIGN KEY ("timelineItemId") REFERENCES "timeline_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_item_albums" ADD CONSTRAINT "timeline_item_albums_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
