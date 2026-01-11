-- Alter tables to track unlisted content
ALTER TABLE "files"
ADD COLUMN "unlisted" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "albums"
ADD COLUMN "unlisted" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "timelines"
ADD COLUMN "unlisted" BOOLEAN NOT NULL DEFAULT FALSE;

