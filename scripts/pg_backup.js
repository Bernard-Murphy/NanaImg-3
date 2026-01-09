#!/usr/bin/env node

/**
 * PostgreSQL Database Backup Script
 *
 * This script creates a backup of the PostgreSQL database, uploads it to S3,
 * and cleans up backups older than 5 days.
 *
 * Cron job to run this script every night at midnight:
 * 0 0 * * * /bin/bash -l -c 'cd /path/to/app && export $(grep -v "^#" scripts/.env | xargs) && node scripts/pg_backup.js'
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const dotenv = require("dotenv");
dotenv.config();

// Configure AWS S3 (using same config as the app)
AWS.config.update({
  region: process.env.REGION || "us-east-1",
});

const s3 = new AWS.S3({
  endpoint: process.env.STORJ_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORJ_SECRET_ACCESS_ID,
    secretAccessKey: process.env.STORJ_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.STORJ_BUCKET;
const BACKUP_PREFIX = "backups/database/";

// Get database connection details from environment
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}
console.log(dbUrl, "dbUrl");
// Parse database URL
const dbUrlMatch = dbUrl.match(
  /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
);
if (!dbUrlMatch) {
  console.error("Invalid DATABASE_URL format");
  process.exit(1);
}

const [, dbUser, dbPassword, dbHost, dbPort, dbName] = dbUrlMatch;

/**
 * Generate a timestamped filename for the backup
 */
function generateBackupFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `feednana_backup_${year}-${month}-${day}_${hours}-${minutes}.sql`;
}

/**
 * Create a PostgreSQL database dump
 */
function createDatabaseDump(filename) {
  return new Promise((resolve, reject) => {
    const dumpCommand = `pg_dump postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName} --no-password --format=custom --compress=9 --file=${filename}`;

    console.log(`Creating database dump: ${filename}`);
    console.log(`Running: ${dumpCommand.replace(dbPassword, "***")}`);

    exec(dumpCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Error creating database dump:", error);
        reject(error);
        return;
      }

      if (stderr) {
        console.log("pg_dump stderr:", stderr);
      }

      console.log("Database dump created successfully");
      resolve(filename);
    });
  });
}

/**
 * Upload file to S3
 */
async function uploadToS3(localPath, s3Key) {
  const fileContent = fs.readFileSync(localPath);

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileContent,
    ContentType: "application/octet-stream",
    Metadata: {
      "backup-date": new Date().toISOString(),
      "backup-type": "postgresql-dump",
    },
  };

  console.log(`Uploading ${localPath} to S3: ${BUCKET_NAME}/${s3Key}`);

  try {
    const result = await s3.upload(uploadParams).promise();
    console.log("Upload successful:", result.Location);
    return result;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

/**
 * List backup files in S3
 */
async function listBackupFiles() {
  const listParams = {
    Bucket: BUCKET_NAME,
    Prefix: BACKUP_PREFIX,
  };

  try {
    const result = await s3.listObjectsV2(listParams).promise();
    return result.Contents || [];
  } catch (error) {
    console.error("Error listing backup files:", error);
    throw error;
  }
}

/**
 * Delete old backup files (older than 5 days)
 */
async function cleanupOldBackups() {
  const files = await listBackupFiles();
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  console.log(`Found ${files.length} backup files`);

  const filesToDelete = files.filter((file) => {
    if (!file.LastModified) return false;
    return file.LastModified < fiveDaysAgo;
  });

  if (filesToDelete.length === 0) {
    console.log("No old backups to delete");
    return;
  }

  console.log(`Deleting ${filesToDelete.length} old backup files`);

  const deleteParams = {
    Bucket: BUCKET_NAME,
    Delete: {
      Objects: filesToDelete.map((file) => ({ Key: file.Key })),
    },
  };

  try {
    const result = await s3.deleteObjects(deleteParams).promise();
    console.log(`Deleted ${result.Deleted?.length || 0} old backup files`);
  } catch (error) {
    console.error("Error deleting old backups:", error);
    // Don't throw here - cleanup failure shouldn't stop the backup process
  }
}

/**
 * Clean up local temporary files
 */
function cleanupLocalFile(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`Cleaned up local file: ${filepath}`);
    }
  } catch (error) {
    console.warn("Warning: Could not clean up local file:", error.message);
  }
}

/**
 * Main backup function
 */
async function performBackup() {
  let tempFile = null;

  try {
    console.log("Starting database backup process...");

    // Generate filename
    const filename = generateBackupFilename();
    tempFile = path.join("/tmp", filename); // Use /tmp for temporary storage

    // Create database dump
    await createDatabaseDump(tempFile);

    // Upload to S3
    const s3Key = `${BACKUP_PREFIX}${filename}`;
    await uploadToS3(tempFile, s3Key);

    // Clean up old backups
    await cleanupOldBackups();

    console.log("Database backup completed successfully!");
  } catch (error) {
    console.error("Database backup failed:", error);
    process.exit(1);
  } finally {
    // Clean up local temporary file
    if (tempFile) {
      cleanupLocalFile(tempFile);
    }
  }
}

// Run the backup
if (require.main === module) {
  performBackup().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

module.exports = { performBackup };
