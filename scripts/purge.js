#!/usr/bin/env node

/**
 * Purge Script
 *
 * Permanently deletes a file from Storj and removes all associated
 * database records (comments, reports, mod logs, votes, timeline refs).
 *
 * Usage:
 *   node scripts/purge.js --id 123
 *   node scripts/purge.js --id 123 --dry-run
 */

const { PrismaClient } = require("@prisma/client");
const AWS = require("aws-sdk");
const dotenv = require("dotenv");
dotenv.config();

const prisma = new PrismaClient({ log: ["error"] });

AWS.config.update({ region: process.env.REGION || "us-east-1" });

const s3 = new AWS.S3({
  endpoint: process.env.STORJ_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORJ_SECRET_ACCESS_ID,
    secretAccessKey: process.env.STORJ_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.STORJ_BUCKET;

function parseArgs() {
  const args = process.argv.slice(2);
  let id = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--id" && args[i + 1]) {
      id = parseInt(args[i + 1].trim());
      if (isNaN(id)) {
        console.error(`Invalid ID: ${args[i + 1]}`);
        process.exit(1);
      }
      i++;
    }
    if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  if (id === null) {
    console.error("Usage: node scripts/purge.js --id <file_id> [--dry-run]");
    process.exit(1);
  }

  return { id, dryRun };
}

function s3KeyFromUrl(url) {
  const cdnBase = process.env.NEXT_PUBLIC_FILE_CDN_URL;
  if (cdnBase && url.startsWith(cdnBase)) {
    return url.slice(cdnBase.length + 1);
  }
  const match = url.match(/\/([^/]+\/[^/]+)$/);
  return match ? match[1] : null;
}

async function deleteS3Object(key) {
  await s3.deleteObject({ Bucket: BUCKET_NAME, Key: key }).promise();
  console.log(`  Deleted from Storj: ${key}`);
}

async function purgeFile(id, dryRun) {
  const file = await prisma.file.findUnique({ where: { id } });

  if (!file) {
    console.error(`File with ID ${id} not found in database.`);
    process.exit(1);
  }

  console.log(`\nFile #${file.id}`);
  console.log(`  Name:      ${file.fileName}`);
  console.log(`  Size:      ${(file.fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  MIME:      ${file.mimeType}`);
  console.log(`  URL:       ${file.fileUrl}`);
  console.log(`  Thumbnail: ${file.thumbnailUrl || "(none)"}`);
  console.log(`  Uploaded:  ${file.timestamp.toISOString()}`);
  console.log(`  Removed:   ${file.removed}`);

  const fileKey = s3KeyFromUrl(file.fileUrl);
  const thumbKey = file.thumbnailUrl ? s3KeyFromUrl(file.thumbnailUrl) : null;

  console.log(`\nS3 keys to delete:`);
  console.log(`  File:      ${fileKey || "(could not resolve)"}`);
  console.log(`  Thumbnail: ${thumbKey || "(none)"}`);

  if (dryRun) {
    console.log("\n[DRY RUN] No changes made.");
    return;
  }

  console.log("\nDeleting from Storj...");
  if (fileKey) await deleteS3Object(fileKey);
  if (thumbKey) await deleteS3Object(thumbKey);

  console.log("\nDeleting database records...");

  const timelineItemFiles = await prisma.timelineItemFile.deleteMany({
    where: { fileId: id },
  });
  console.log(`  TimelineItemFile rows removed: ${timelineItemFiles.count}`);

  const comments = await prisma.comment.deleteMany({
    where: { flavor: "file", contentId: id },
  });
  console.log(`  Comments removed: ${comments.count}`);

  const votes = await prisma.vote.deleteMany({
    where: { flavor: "file", contentId: id },
  });
  console.log(`  Votes removed: ${votes.count}`);

  const reports = await prisma.report.deleteMany({
    where: { flavor: "file", contentId: id },
  });
  console.log(`  Reports removed: ${reports.count}`);

  const modLogs = await prisma.modLog.deleteMany({
    where: { contentFlavor: "file", contentId: id },
  });
  console.log(`  ModLogs removed: ${modLogs.count}`);

  await prisma.file.delete({ where: { id } });
  console.log(`  File record deleted.`);

  console.log(`\nFile #${id} permanently purged.`);
}

if (require.main === module) {
  const { id, dryRun } = parseArgs();

  purgeFile(id, dryRun)
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { purgeFile };
