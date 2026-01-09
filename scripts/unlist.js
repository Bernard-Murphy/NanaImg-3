#!/usr/bin/env node

/**
 * Unlist Script
 *
 * This script takes an array of IDs and sets removed = 't' (true) for
 * files, albums, and timelines with those IDs in the database.
 *
 * Usage:
 * node scripts/unlist.js
 * npm run unlist
 * node scripts/unlist.js --ids 1,2,3,4,5
 *
 * Examples:
 * npm run unlist -- --ids 1,2,3
 * node scripts/unlist.js --ids 1,2,3
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error"],
});

/**
 * Unlist content by setting removed = true for files, albums, and timelines
 * @param {number[]} ids - Array of content IDs to unlist
 */
async function unlistContent(ids) {
  ids = [28999, 28998, 28997, 28996, 28995, 28994, 28993, 28991];
  console.log(ids, "ids");
  if (ids.length === 0) {
    console.log(
      "No IDs provided. Use --ids 1,2,3 or modify the ids array in the script."
    );
    return;
  }

  console.log(`Unlisting ${ids.length} items with IDs: ${ids.join(", ")}`);

  try {
    // Update files
    const filesUpdated = await prisma.file.updateMany({
      where: {
        id: { in: ids },
        removed: false, // Only update if not already removed
      },
      data: {
        removed: true,
      },
    });

    // Update albums
    const albumsUpdated = await prisma.album.updateMany({
      where: {
        id: { in: ids },
        removed: false, // Only update if not already removed
      },
      data: {
        removed: true,
      },
    });

    // Update timelines
    const timelinesUpdated = await prisma.timeline.updateMany({
      where: {
        id: { in: ids },
        removed: false, // Only update if not already removed
      },
      data: {
        removed: true,
      },
    });

    console.log("Update results:");
    console.log(`- Files unlisted: ${filesUpdated.count}`);
    console.log(`- Albums unlisted: ${albumsUpdated.count}`);
    console.log(`- Timelines unlisted: ${timelinesUpdated.count}`);

    const totalUpdated =
      filesUpdated.count + albumsUpdated.count + timelinesUpdated.count;
    console.log(`Total items unlisted: ${totalUpdated}`);
  } catch (error) {
    console.error("Error unlisting content:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const ids = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ids" && args[i + 1]) {
      const idsString = args[i + 1];
      const parsedIds = idsString.split(",").map((id) => {
        const num = parseInt(id.trim());
        if (isNaN(num)) {
          console.error(`Invalid ID: ${id}`);
          process.exit(1);
        }
        return num;
      });
      ids.push(...parsedIds);
      break;
    }
  }

  return ids;
}

// Main execution
if (require.main === module) {
  const ids = parseArgs();

  // If no IDs provided via command line, you can add them here
  // const ids = [1, 2, 3, 4, 5]; // Example IDs to unlist

  unlistContent(ids).catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

module.exports = { unlistContent };
