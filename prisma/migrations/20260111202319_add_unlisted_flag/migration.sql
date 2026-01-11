-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "album_comments_fk";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "file_comments_fk";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "timeline_comments_fk";

-- DropForeignKey
ALTER TABLE "votes" DROP CONSTRAINT IF EXISTS "album_votes_fk";

-- DropForeignKey
ALTER TABLE "votes" DROP CONSTRAINT IF EXISTS "comment_votes_fk";

-- DropForeignKey
ALTER TABLE "votes" DROP CONSTRAINT IF EXISTS "file_votes_fk";

-- DropForeignKey
ALTER TABLE "votes" DROP CONSTRAINT IF EXISTS "timeline_votes_fk";
