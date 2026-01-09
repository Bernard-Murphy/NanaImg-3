import { PubSub } from "graphql-subscriptions";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import md5 from "md5";
import { verifyRecaptcha } from "../recaptcha";
import {
  createMultipartUpload,
  getPresignedUploadUrl,
  completeMultipartUpload,
  getFileUrl,
  downloadFile,
} from "../s3";
import { generateThumbnail } from "../thumbnail";
import { generateAnonId, generateRandomColor, signJWT } from "../session";

const pubsub = new PubSub();

const BROWSE_ITEMS_UPDATED = "BROWSE_ITEMS_UPDATED";
const FILE_COUNT_UPDATED = "FILE_COUNT_UPDATED";
const FILE_UPDATED = "FILE_UPDATED";
const ALBUM_UPDATED = "ALBUM_UPDATED";
const COMMENTS_UPDATED = "COMMENTS_UPDATED";

interface Context {
  user: any; // JWT payload with userId if authenticated
  anonData: {
    anonId: string;
    anonTextColor: string;
    anonTextBackground: string;
  };
  req: any;
}

// Helper function to get karma for content
async function getKarma(flavor: string, contentId: number): Promise<number> {
  const votes = await prisma.vote.findMany({
    where: { flavor, contentId },
  });
  return votes.reduce<number>((sum, vote) => sum + vote.vote, 0);
}

// Helper function to get user's vote
async function getUserVote(
  userId: number | undefined,
  flavor: string,
  contentId: number
): Promise<number | null> {
  if (!userId) return null;
  const vote = await prisma.vote.findFirst({
    where: { userId, flavor, contentId },
  });
  return vote ? vote.vote : null;
}

// Helper function to check if user is admin or janny
function isModOrAdmin(role: string): boolean {
  return role === "janny" || role === "admincel";
}

// Helper function to check if user is admin
function isAdmin(role: string): boolean {
  return role === "admincel";
}

// Helper function to check if reCAPTCHA is required
function isRecaptchaRequired(): boolean {
  return !!process.env.RECAPTCHA_API_KEY;
}

// Helper function to ensure anon properties exist in session
function ensureAnonProperties(session: any) {
  if (!session.anonId) {
    session.anonId = generateAnonId();
    session.anonTextColor = generateRandomColor();
    session.anonTextBackground = generateRandomColor();
  }
  return {
    anonId: session.anonId,
    anonTextColor: session.anonTextColor,
    anonTextBackground: session.anonTextBackground,
  };
}

export const resolvers = {
  DateTime: {
    __parseValue(value: any) {
      return new Date(value);
    },
    __serialize(value: any) {
      return value.toISOString();
    },
    __parseLiteral(ast: any) {
      return new Date(ast.value);
    },
  },

  BrowseItem: {
    __resolveType(obj: any) {
      if (obj.hashedFileName !== undefined) return "File";
      if (Array.isArray(obj.files)) return "Album";
      if (Array.isArray(obj.items)) return "Timeline";
      // Fallback - this shouldn't happen
      console.warn("Could not resolve BrowseItem type for:", obj);
      return "Timeline";
    },
  },

  User: {
    email: (parent: any, _: any, context: Context) => {
      // Only return email for the logged-in user
      if (context.user?.userId === parent.id) {
        return parent.email;
      }
      return null;
    },
    avatarFile: async (parent: any) => {
      if (!parent.avatar) return null;
      return prisma.file.findUnique({ where: { id: parent.avatar } });
    },
    posts: async (parent: any) => {
      return prisma.file.findMany({
        where: { userId: parent.id, removed: false },
        orderBy: { timestamp: "desc" },
      });
    },
    albums: async (parent: any) => {
      return prisma.album.findMany({
        where: { userId: parent.id, removed: false },
        orderBy: { timestamp: "desc" },
      });
    },
    comments: async (parent: any) => {
      return prisma.comment.findMany({
        where: { userId: parent.id, removed: false },
        orderBy: { timestamp: "desc" },
      });
    },
    karma: async (parent: any) => {
      // Calculate total karma from all user's files, albums, and comments
      const files = await prisma.file.findMany({
        where: { userId: parent.id },
        select: { id: true },
      });
      const albums = await prisma.album.findMany({
        where: { userId: parent.id },
        select: { id: true },
      });
      const comments = await prisma.comment.findMany({
        where: { userId: parent.id },
        select: { id: true },
      });

      let totalKarma = 0;

      for (const file of files) {
        totalKarma += await getKarma("file", file.id);
      }
      for (const album of albums) {
        totalKarma += await getKarma("album", album.id);
      }
      for (const comment of comments) {
        totalKarma += await getKarma("comment", comment.id);
      }

      return totalKarma;
    },
  },

  File: {
    user: async (parent: any) => {
      if (!parent.userId) return null;
      return prisma.user.findUnique({ where: { id: parent.userId } });
    },
    album: async (parent: any) => {
      if (!parent.albumId) return null;
      return prisma.album.findUnique({ where: { id: parent.albumId } });
    },
    comments: async (parent: any) => {
      return prisma.comment.findMany({
        where: { flavor: "file", contentId: parent.id, removed: false },
        orderBy: { timestamp: "desc" },
      });
    },
    commentCount: async (parent: any) => {
      return prisma.comment.count({
        where: { flavor: "file", contentId: parent.id, removed: false },
      });
    },
    karma: async (parent: any) => {
      return getKarma("file", parent.id);
    },
    userVote: async (parent: any, _: any, context: Context) => {
      return getUserVote(context.user?.userId || null, "file", parent.id);
    },
  },

  Album: {
    user: async (parent: any) => {
      if (!parent.userId) return null;
      return prisma.user.findUnique({ where: { id: parent.userId } });
    },
    files: async (parent: any) => {
      return prisma.file.findMany({
        where: { albumId: parent.id, removed: false },
        orderBy: { id: "asc" },
      });
    },
    comments: async (parent: any) => {
      return prisma.comment.findMany({
        where: { flavor: "album", contentId: parent.id, removed: false },
        orderBy: { timestamp: "desc" },
      });
    },
    commentCount: async (parent: any) => {
      return prisma.comment.count({
        where: { flavor: "album", contentId: parent.id, removed: false },
      });
    },
    karma: async (parent: any) => {
      return getKarma("album", parent.id);
    },
    userVote: async (parent: any, _: any, context: Context) => {
      return getUserVote(context.user?.userId || null, "album", parent.id);
    },
  },

  Timeline: {
    user: async (parent: any) => {
      if (!parent.userId) return null;
      return prisma.user.findUnique({ where: { id: parent.userId } });
    },
    items: async (parent: any) => {
      return prisma.timelineItem.findMany({
        where: { timelineId: parent.id },
        orderBy: { timestamp: "desc" },
      });
    },
    comments: async (parent: any) => {
      return prisma.comment.findMany({
        where: { flavor: "timeline", contentId: parent.id, removed: false },
        orderBy: { timestamp: "desc" },
      });
    },
    commentCount: async (parent: any) => {
      return prisma.comment.count({
        where: { flavor: "timeline", contentId: parent.id, removed: false },
      });
    },
    karma: async (parent: any) => {
      return getKarma("timeline", parent.id);
    },
    userVote: async (parent: any, _: any, context: Context) => {
      return getUserVote(context.user?.userId || null, "timeline", parent.id);
    },
  },

  Comment: {
    user: async (parent: any) => {
      if (!parent.userId) return null;
      return prisma.user.findUnique({ where: { id: parent.userId } });
    },
    replyToComment: async (parent: any) => {
      if (!parent.repliesTo) return null;
      return prisma.comment.findUnique({ where: { id: parent.repliesTo } });
    },
    replies: async (parent: any) => {
      return prisma.comment.findMany({
        where: { repliesTo: parent.id, removed: false },
        orderBy: { timestamp: "desc" },
      });
    },
    replyCount: async (parent: any) => {
      return prisma.comment.count({
        where: { repliesTo: parent.id, removed: false },
      });
    },
    karma: async (parent: any) => {
      return getKarma("comment", parent.id);
    },
    userVote: async (parent: any, _: any, context: Context) => {
      return getUserVote(context.user?.userId || null, "comment", parent.id);
    },
  },

  Report: {
    user: async (parent: any) => {
      if (!parent.userId) return null;
      return prisma.user.findUnique({ where: { id: parent.userId } });
    },
  },

  ModLog: {
    user: async (parent: any) => {
      return prisma.user.findUnique({ where: { id: parent.userId } });
    },
  },

  Query: {
    me: async (_: any, __: any, context: Context) => {
      if (!context.user?.userId) return null;
      return prisma.user.findUnique({
        where: { id: context.user.userId },
      });
    },

    user: async (_: any, args: any) => {
      if (args.id) {
        return prisma.user.findUnique({ where: { id: args.id } });
      }
      if (args.username) {
        return prisma.user.findUnique({ where: { username: args.username } });
      }
      return null;
    },

    file: async (_: any, args: any, context: Context) => {
      const file = await prisma.file.findUnique({ where: { id: args.id } });
      if (!file) return null;

      // Increment view count
      await prisma.file.update({
        where: { id: args.id },
        data: { views: { increment: 1 } },
      });

      return file;
    },

    album: async (_: any, args: any) => {
      const album = await prisma.album.findUnique({ where: { id: args.id } });
      if (!album) return null;

      // Increment view count
      await prisma.album.update({
        where: { id: args.id },
        data: { views: { increment: 1 } },
      });

      return album;
    },

    timeline: async (_: any, args: any) => {
      const timeline = await prisma.timeline.findUnique({
        where: { id: args.id },
      });
      if (!timeline) return null;

      // Increment view count
      await prisma.timeline.update({
        where: { id: args.id },
        data: { views: { increment: 1 } },
      });

      return timeline;
    },

    comment: async (_: any, args: any) => {
      return prisma.comment.findUnique({ where: { id: args.id } });
    },

    browse: async (_: any, args: any) => {
      const page = args.page || 1;
      const limit = args.limit || 49;
      const skip = (page - 1) * limit;
      const sort = args.sort || "recent";
      const filter = args.filter || "all";
      const search = args.search || "";

      let orderBy: any = { timestamp: "desc" };
      let useCommentSorting = false;

      if (sort === "recent-comment") {
        // We'll handle this with custom sorting after fetching
        useCommentSorting = true;
        orderBy = { timestamp: "desc" }; // Fallback ordering
      }

      // For comment sorting, we need to fetch items with their latest comments
      // and sort them after fetching, since we can't do this efficiently in a single query

      const where: any = { removed: false };

      let items: any[] = [];
      let total = 0;

      // Implement search functionality
      if (search) {
        // Search through files, albums, and timelines
        const searchResults: any[] = [];

        // Search files by name and comments
        if (filter === "all" || filter === "files") {
          // First, find files that match name/fileName/manifesto/users
          const nameMatchedFiles = await prisma.file.findMany({
            where: {
              ...where,
              albumId: null,
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { fileName: { contains: search, mode: "insensitive" } },
                { manifesto: { contains: search, mode: "insensitive" } },
                {
                  user: {
                    OR: [
                      { username: { contains: search, mode: "insensitive" } },
                      {
                        displayName: { contains: search, mode: "insensitive" },
                      },
                    ],
                  },
                },
              ],
            },
            orderBy,
            include: {
              user: {
                select: {
                  username: true,
                  displayName: true,
                },
              },
            },
          });

          // Then, find files that have comments containing the search term
          const commentMatchedFileIds = await prisma.comment.findMany({
            where: {
              flavor: "file",
              text: { contains: search, mode: "insensitive" },
              removed: false,
            },
            select: { contentId: true },
            distinct: ["contentId"],
          });

          const commentFileIds = commentMatchedFileIds.map((c) => c.contentId);

          if (commentFileIds.length > 0) {
            const commentMatchedFiles = await prisma.file.findMany({
              where: {
                ...where,
                albumId: null,
                id: { in: commentFileIds },
              },
              orderBy,
            });

            // Combine and deduplicate
            const allFileIds = new Set([
              ...nameMatchedFiles.map((f) => f.id),
              ...commentMatchedFiles.map((f) => f.id),
            ]);
            const combinedFiles = [
              ...nameMatchedFiles,
              ...commentMatchedFiles.filter((f) => !allFileIds.has(f.id)),
            ];

            searchResults.push(
              ...combinedFiles.map((file) => ({ ...file, __typename: "File" }))
            );
          } else {
            searchResults.push(
              ...nameMatchedFiles.map((file) => ({
                ...file,
                __typename: "File",
              }))
            );
          }
        }

        // Search albums by name and comments
        if (filter === "all" || filter === "albums") {
          // First, find albums that match name/manifesto/users
          const nameMatchedAlbums = await prisma.album.findMany({
            where: {
              ...where,
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { manifesto: { contains: search, mode: "insensitive" } },
                {
                  user: {
                    OR: [
                      { username: { contains: search, mode: "insensitive" } },
                      {
                        displayName: { contains: search, mode: "insensitive" },
                      },
                    ],
                  },
                },
              ],
            },
            orderBy,
            include: {
              files: {
                select: {
                  thumbnailUrl: true,
                  mimeType: true,
                },
                take: 1,
              },
              user: {
                select: {
                  username: true,
                  displayName: true,
                },
              },
            },
          });

          // Then, find albums that have comments containing the search term
          const commentMatchedAlbumIds = await prisma.comment.findMany({
            where: {
              flavor: "album",
              text: { contains: search, mode: "insensitive" },
              removed: false,
            },
            select: { contentId: true },
            distinct: ["contentId"],
          });

          const commentAlbumIds = commentMatchedAlbumIds.map(
            (c) => c.contentId
          );

          if (commentAlbumIds.length > 0) {
            const commentMatchedAlbums = await prisma.album.findMany({
              where: {
                ...where,
                id: { in: commentAlbumIds },
              },
              orderBy,
              include: {
                files: {
                  select: {
                    thumbnailUrl: true,
                    mimeType: true,
                  },
                  take: 1,
                },
              },
            });

            // Combine and deduplicate
            const allAlbumIds = new Set([
              ...nameMatchedAlbums.map((a) => a.id),
              ...commentMatchedAlbums.map((a) => a.id),
            ]);
            const combinedAlbums = [
              ...nameMatchedAlbums,
              ...commentMatchedAlbums.filter((a) => !allAlbumIds.has(a.id)),
            ];

            searchResults.push(
              ...combinedAlbums.map((album) => ({
                ...album,
                __typename: "Album",
              }))
            );
          } else {
            searchResults.push(
              ...nameMatchedAlbums.map((album) => ({
                ...album,
                __typename: "Album",
              }))
            );
          }
        }

        // Search timelines by name and comments
        if (filter === "all" || filter === "timelines") {
          // First, find timelines that match name/manifesto/users
          const nameMatchedTimelines = await prisma.timeline.findMany({
            where: {
              ...where,
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { manifesto: { contains: search, mode: "insensitive" } },
                {
                  user: {
                    OR: [
                      { username: { contains: search, mode: "insensitive" } },
                      {
                        displayName: { contains: search, mode: "insensitive" },
                      },
                    ],
                  },
                },
              ],
            },
            orderBy,
            include: {
              items: {
                take: 1,
              },
              user: {
                select: {
                  username: true,
                  displayName: true,
                },
              },
            },
          });

          // Then, find timelines that have comments containing the search term
          const commentMatchedTimelineIds = await prisma.comment.findMany({
            where: {
              flavor: "timeline",
              text: { contains: search, mode: "insensitive" },
              removed: false,
            },
            select: { contentId: true },
            distinct: ["contentId"],
          });

          const commentTimelineIds = commentMatchedTimelineIds.map(
            (c) => c.contentId
          );

          if (commentTimelineIds.length > 0) {
            const commentMatchedTimelines = await prisma.timeline.findMany({
              where: {
                ...where,
                id: { in: commentTimelineIds },
              },
              orderBy,
              include: {
                items: {
                  take: 1,
                },
              },
            });

            // Combine and deduplicate
            const allTimelineIds = new Set([
              ...nameMatchedTimelines.map((t) => t.id),
              ...commentMatchedTimelines.map((t) => t.id),
            ]);
            const combinedTimelines = [
              ...nameMatchedTimelines,
              ...commentMatchedTimelines.filter(
                (t) => !allTimelineIds.has(t.id)
              ),
            ];

            searchResults.push(
              ...combinedTimelines.map((timeline) => ({
                ...timeline,
                __typename: "Timeline",
              }))
            );
          } else {
            searchResults.push(
              ...nameMatchedTimelines.map((timeline) => ({
                ...timeline,
                __typename: "Timeline",
              }))
            );
          }
        }

        // Sort by timestamp and apply pagination
        searchResults.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
        const paginatedResults = searchResults.slice(skip, skip + limit);

        return {
          items: paginatedResults,
          total: searchResults.length,
          hasMore: skip + limit < searchResults.length,
        };
      }

      if (filter === "all" || filter === "files") {
        // For "all" filter, fetch more items to ensure proper pagination after sorting
        const fetchLimit =
          filter === "files" ? limit : Math.max(limit * 3, 100);
        const files = await prisma.file.findMany({
          where: { ...where, albumId: null },
          orderBy: useCommentSorting ? undefined : orderBy,
          skip: filter === "files" ? skip : 0,
          take: filter === "files" ? limit : fetchLimit,
        });
        // Add __typename for GraphQL union resolution
        items.push(...files.map((file) => ({ ...file, __typename: "File" })));
      }

      if (filter === "all" || filter === "albums") {
        // For "all" filter, fetch more items to ensure proper pagination after sorting
        const fetchLimit =
          filter === "albums" ? limit : Math.max(limit * 3, 100);
        const albums = await prisma.album.findMany({
          where,
          orderBy: useCommentSorting ? undefined : orderBy,
          skip: filter === "albums" ? skip : 0,
          take: filter === "albums" ? limit : fetchLimit,
          include: {
            files: {
              select: {
                thumbnailUrl: true,
                mimeType: true,
              },
              take: 1, // Only need one file for thumbnail
            },
          },
        });
        // Add __typename for GraphQL union resolution
        items.push(
          ...albums.map((album) => ({ ...album, __typename: "Album" }))
        );
      }

      if (filter === "all" || filter === "timelines") {
        // For "all" filter, fetch more items to ensure proper pagination after sorting
        const fetchLimit =
          filter === "timelines" ? limit : Math.max(limit * 3, 100);
        const timelines = await prisma.timeline.findMany({
          where,
          orderBy: useCommentSorting ? undefined : orderBy,
          skip: filter === "timelines" ? skip : 0,
          take: filter === "timelines" ? limit : fetchLimit,
          include: {
            items: {
              take: 1, // Just to ensure items field exists
            },
          },
        });
        // Add __typename for GraphQL union resolution
        items.push(
          ...timelines.map((timeline) => ({
            ...timeline,
            __typename: "Timeline",
          }))
        );
      }

      // For comment sorting, get items based on comments that match search/filter criteria
      if (useCommentSorting) {
        // Build where clause for comments based on search and filter
        const commentWhere: any = { removed: false };

        // Add search criteria to comments
        if (search) {
          commentWhere.text = { contains: search, mode: "insensitive" };
        }

        // Add filter criteria to comments
        if (filter === "files") {
          commentWhere.flavor = "file";
        } else if (filter === "albums") {
          commentWhere.flavor = "album";
        } else if (filter === "timelines") {
          commentWhere.flavor = "timeline";
        }
        // For "all" filter, include all comment flavors

        // Get comments sorted by timestamp descending, limited to get recent activity
        const recentComments = await prisma.comment.findMany({
          where: commentWhere,
          select: {
            contentId: true,
            flavor: true,
            timestamp: true,
          },
          orderBy: { timestamp: "desc" },
          take: 1000, // Limit to avoid excessive data, adjust as needed
        });

        // Group comments by content to get unique items with their latest comment
        const itemCommentMap = new Map();

        for (const comment of recentComments) {
          const key = `${comment.flavor}-${comment.contentId}`;
          if (!itemCommentMap.has(key)) {
            itemCommentMap.set(key, {
              contentId: comment.contentId,
              flavor: comment.flavor,
              latestCommentTime: comment.timestamp,
            });
          }
        }

        // Get the unique items from the comments
        const commentedItems = [];
        const fileIds = [];
        const albumIds = [];
        const timelineIds = [];

        for (const item of Array.from(itemCommentMap.values())) {
          if (item.flavor === "file") {
            fileIds.push(item.contentId);
          } else if (item.flavor === "album") {
            albumIds.push(item.contentId);
          } else if (item.flavor === "timeline") {
            timelineIds.push(item.contentId);
          }
        }

        // Fetch the actual items
        if (fileIds.length > 0) {
          const files = await prisma.file.findMany({
            where: {
              ...where,
              albumId: null,
              id: { in: fileIds },
            },
          });
          commentedItems.push(
            ...files.map((file) => ({ ...file, __typename: "File" }))
          );
        }

        if (albumIds.length > 0) {
          const albums = await prisma.album.findMany({
            where: {
              ...where,
              id: { in: albumIds },
            },
            include: {
              files: {
                select: {
                  thumbnailUrl: true,
                  mimeType: true,
                },
                take: 1,
              },
            },
          });
          commentedItems.push(
            ...albums.map((album) => ({ ...album, __typename: "Album" }))
          );
        }

        if (timelineIds.length > 0) {
          const timelines = await prisma.timeline.findMany({
            where: {
              ...where,
              id: { in: timelineIds },
            },
            include: {
              items: {
                take: 1,
              },
            },
          });
          commentedItems.push(
            ...timelines.map((timeline) => ({
              ...timeline,
              __typename: "Timeline",
            }))
          );
        }

        // Sort items by their latest comment timestamp
        commentedItems.sort((a, b) => {
          const aKey = `${a.__typename.toLowerCase()}-${a.id}`;
          const bKey = `${b.__typename.toLowerCase()}-${b.id}`;
          const aCommentTime =
            itemCommentMap.get(aKey)?.latestCommentTime?.getTime() || 0;
          const bCommentTime =
            itemCommentMap.get(bKey)?.latestCommentTime?.getTime() || 0;
          return bCommentTime - aCommentTime;
        });

        // Apply pagination to commented items
        const paginatedItems = commentedItems.slice(skip, skip + limit);
        const total = commentedItems.length;

        return {
          items: paginatedItems,
          total,
          hasMore: skip + limit < total,
        };
      } else {
        items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Apply pagination after sorting
        const paginatedItems = items.slice(skip, skip + limit);
        total = items.length;

        return {
          items: paginatedItems,
          total,
          hasMore: skip + limit < total,
        };
      }
    },

    search: async (_: any, args: any) => {
      const query = args.query;
      const filter = args.filter || "all";

      // TODO: Implement proper search with OR conditions
      // For now, search by name only to avoid TypeScript errors
      const where = {
        name: { contains: query, mode: "insensitive" as const },
        removed: false,
      };

      const files =
        filter === "all" || filter === "files"
          ? await prisma.file.findMany({
              where: { ...where, removed: false },
              take: 20,
            })
          : [];

      const albums =
        filter === "all" || filter === "albums"
          ? await prisma.album.findMany({
              where: { ...where, removed: false },
              take: 20,
            })
          : [];

      const timelines =
        filter === "all" || filter === "timelines"
          ? await prisma.timeline.findMany({
              where: { ...where, removed: false },
              take: 20,
            })
          : [];

      const users =
        filter === "all" || filter === "users"
          ? await prisma.user.findMany({
              where: {
                OR: [
                  { username: { contains: query, mode: "insensitive" } },
                  { displayName: { contains: query, mode: "insensitive" } },
                ],
              },
              take: 20,
            })
          : [];

      return {
        files,
        albums,
        timelines,
        users,
        total: files.length + albums.length + timelines.length + users.length,
      };
    },

    gnaaSearch: async (_: any, args: any) => {
      // Verify reCAPTCHA
      if (isRecaptchaRequired()) {
        if (!args.recaptchaToken) {
          throw new Error("reCAPTCHA validation failed");
        }
        const isValid = await verifyRecaptcha(args.recaptchaToken);
        if (!isValid) {
          throw new Error("reCAPTCHA validation failed");
        }
      }

      const query = args.query || "";
      const authors = args.authors || [];
      const page = args.page || 1;
      const limit = args.limit || 50;
      const sortBy = args.sortBy || "date";
      const skip = (page - 1) * limit;

      const where: any = {};

      if (query) {
        where.message = { contains: query, mode: "insensitive" };
      }

      if (authors.length > 0) {
        where.user = { in: authors };
      }

      const orderBy =
        sortBy === "date"
          ? { timestamp: "desc" as const }
          : { timestamp: "desc" as const };

      const results = await prisma.gnaa.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      });

      const total = await prisma.gnaa.count({ where });

      return {
        results,
        total,
        hasMore: skip + results.length < total,
      };
    },

    reports: async (_: any, args: any, context: Context) => {
      const user = await prisma.user.findUnique({
        where: { id: context.user?.userId },
      });

      if (!user || !isModOrAdmin(user.role)) {
        throw new Error("Unauthorized");
      }

      const page = args.page || 1;
      const limit = args.limit || 50;
      const skip = (page - 1) * limit;

      return prisma.report.findMany({
        where: { dismissed: false },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      });
    },

    modLogs: async (_: any, args: any, context: Context) => {
      const user = await prisma.user.findUnique({
        where: { id: context.user?.userId },
      });

      if (!user || !isAdmin(user.role)) {
        throw new Error("Unauthorized");
      }

      const page = args.page || 1;
      const limit = args.limit || 50;
      const skip = (page - 1) * limit;

      return prisma.modLog.findMany({
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      });
    },

    users: async (_: any, args: any, context: Context) => {
      const user = await prisma.user.findUnique({
        where: { id: context.user?.userId },
      });

      if (!user || !isModOrAdmin(user.role)) {
        throw new Error("Unauthorized");
      }

      const page = args.page || 1;
      const limit = args.limit || 50;
      const skip = (page - 1) * limit;
      const search = args.search || "";

      const where: any = {};

      if (search) {
        where.OR = [
          { username: { contains: search, mode: "insensitive" } },
          { displayName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      // Jannies can only see regular users
      if (user.role === "janny") {
        where.role = "child";
      }

      return prisma.user.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      });
    },

    userContent: async (_: any, args: any) => {
      const userId = args.userId;
      const type = args.type || "all";
      const page = args.page || 1;
      const limit = args.limit || 49;
      const skip = (page - 1) * limit;

      let items: any[] = [];

      if (type === "all" || type === "files") {
        const files = await prisma.file.findMany({
          where: { userId, removed: false, albumId: null },
          orderBy: { timestamp: "desc" },
          skip: type === "files" ? skip : 0,
          take: limit,
        });
        items.push(...files);
      }

      if (type === "all" || type === "albums") {
        const albums = await prisma.album.findMany({
          where: { userId, removed: false },
          orderBy: { timestamp: "desc" },
          skip: type === "albums" ? skip : 0,
          take: limit,
        });
        items.push(...albums);
      }

      if (type === "all" || type === "comments") {
        const comments = await prisma.comment.findMany({
          where: { userId, removed: false },
          orderBy: { timestamp: "desc" },
          skip: type === "comments" ? skip : 0,
          take: limit,
        });
        items.push(...comments);
      }

      items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      items = items.slice(0, limit);

      return {
        items,
        total: items.length,
        hasMore: items.length >= limit,
      };
    },

    checkImageFile: async (_: any, args: any) => {
      const file = await prisma.file.findUnique({ where: { id: args.fileId } });
      return file ? file.mimeType.startsWith("image/") : false;
    },

    totalFileCount: async () => {
      return prisma.file.count({ where: { removed: false } });
    },
  },

  Mutation: {
    register: async (_: any, args: any, context: Context) => {
      // Verify reCAPTCHA
      if (isRecaptchaRequired()) {
        if (!args.recaptchaToken) {
          return { success: false, message: "reCAPTCHA validation failed" };
        }
        const isValid = await verifyRecaptcha(args.recaptchaToken);
        if (!isValid) {
          return { success: false, message: "reCAPTCHA validation failed" };
        }
      }

      const { username, displayName, email, password, bio, avatar } =
        args.input;

      // Validate inputs
      if (username.length < 3 || username.length > 20) {
        return {
          success: false,
          message: "Username must be between 3 and 20 characters",
        };
      }

      if (password.length < 4) {
        return {
          success: false,
          message: "Password must be at least 4 characters",
        };
      }

      // Check if username or email already exists (case insensitive)
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: username, mode: "insensitive" } },
            { email: { equals: email, mode: "insensitive" } },
          ],
        },
      });

      if (existingUser) {
        return {
          success: false,
          message:
            existingUser.username === username
              ? "Username already taken"
              : "Email already registered",
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          displayName,
          email,
          passwordHash,
          bio: bio || "",
          avatar,
          role: "child",
          defaultTheme: "dark",
        },
      });

      // Generate JWT token
      const token = signJWT({ userId: user.id });

      return { success: true, user, token };
    },

    login: async (_: any, args: any, context: Context) => {
      // Verify reCAPTCHA
      if (isRecaptchaRequired()) {
        if (!args.recaptchaToken) {
          return { success: false, message: "reCAPTCHA validation failed" };
        }
        const isValid = await verifyRecaptcha(args.recaptchaToken);
        if (!isValid) {
          return { success: false, message: "reCAPTCHA validation failed" };
        }
      }

      const { username, password } = args;

      const user = await prisma.user.findFirst({
        where: { username: { equals: username, mode: "insensitive" } },
      });

      if (!user) {
        return { success: false, message: "Invalid username or password" };
      }

      if (user.banned) {
        return { success: false, message: "This account has been banned" };
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        return { success: false, message: "Invalid username or password" };
      }

      // Generate JWT token
      const token = signJWT({ userId: user.id });

      return { success: true, user, token };
    },

    logout: async (_: any, __: any, context: Context) => {
      // JWT logout is handled client-side by clearing the cookie
      return true;
    },

    updateProfile: async (_: any, args: any, context: Context) => {
      if (!context.user?.userId) {
        throw new Error("Not authenticated");
      }

      const updates: any = {};
      if (args.displayName) updates.displayName = args.displayName;
      if (args.bio !== undefined) updates.bio = args.bio;
      if (args.avatar !== undefined) updates.avatar = args.avatar;
      if (args.defaultTheme) updates.defaultTheme = args.defaultTheme;

      return prisma.user.update({
        where: { id: context.user.userId },
        data: updates,
      });
    },

    requestPasswordReset: async (_: any, args: any, context: Context) => {
      // Verify reCAPTCHA
      if (isRecaptchaRequired()) {
        if (!args.recaptchaToken) {
          throw new Error("reCAPTCHA validation failed");
        }
        const isValid = await verifyRecaptcha(args.recaptchaToken);
        if (!isValid) {
          throw new Error("reCAPTCHA validation failed");
        }
      }

      const { email, username } = args;

      const user = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          username: { equals: username, mode: "insensitive" },
        },
      });

      if (!user) {
        // Don't reveal if user exists
        return true;
      }

      // Check if user has already requested 2 resets today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const resetCount = await prisma.passwordReset.count({
        where: {
          userId: user.id,
          createdAt: { gte: today },
        },
      });

      if (resetCount >= 2) {
        throw new Error("Password reset limit reached for today");
      }

      // Create password reset
      const resetId = uuidv4();
      await prisma.passwordReset.create({
        data: {
          uuid: resetId,
          userId: user.id,
          email: user.email,
          valid: true,
        },
      });

      // In production, send email here

      return true;
    },

    resetPassword: async (_: any, args: any, context: Context) => {
      // Verify reCAPTCHA
      if (isRecaptchaRequired()) {
        if (!args.recaptchaToken) {
          return { success: false, message: "reCAPTCHA validation failed" };
        }
        const isValid = await verifyRecaptcha(args.recaptchaToken);
        if (!isValid) {
          return { success: false, message: "reCAPTCHA validation failed" };
        }
      }

      const { resetId, password } = args;

      const reset = await prisma.passwordReset.findUnique({
        where: { uuid: resetId },
      });

      if (!reset || !reset.valid) {
        return { success: false, message: "Invalid or expired reset link" };
      }

      // Check if reset is less than 24 hours old
      const hoursSinceCreated =
        (Date.now() - reset.createdAt.getTime()) / 1000 / 60 / 60;

      if (hoursSinceCreated > 24) {
        return { success: false, message: "Reset link has expired" };
      }

      if (password.length < 4) {
        return {
          success: false,
          message: "Password must be at least 4 characters",
        };
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user password
      const user = await prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      });

      // Invalidate reset
      await prisma.passwordReset.update({
        where: { uuid: resetId },
        data: { valid: false },
      });

      // Generate JWT token
      const token = signJWT({ userId: user.id });

      return { success: true, user, token };
    },

    initiateUpload: async (_: any, args: any) => {
      const { files, recaptchaToken } = args;

      // Verify reCAPTCHA before creating any upload URLs
      if (isRecaptchaRequired()) {
        if (!recaptchaToken) {
          throw new Error("reCAPTCHA validation failed");
        }
        const isValid = await verifyRecaptcha(recaptchaToken);
        if (!isValid) {
          throw new Error("reCAPTCHA validation failed");
        }
      }

      const uploadUrls = [];

      for (const file of files) {
        const hash = md5(file.fileName + Date.now());
        const ext = file.fileName.split(".").pop();
        const key = `files/${hash}.${ext}`;

        // Create multipart upload first
        const uploadId = await createMultipartUpload(key, file.mimeType);
        if (!uploadId) {
          throw new Error("Failed to create multipart upload");
        }

        // Calculate number of parts (5MB per part)
        const partSize = 5 * 1024 * 1024;
        const numParts = Math.ceil(file.fileSize / partSize);

        const urls = [];
        for (let i = 1; i <= numParts; i++) {
          const url = await getPresignedUploadUrl(key, uploadId!, i);
          urls.push(url);
        }

        uploadUrls.push({
          uploadId,
          urls,
          key,
        });
      }
      return uploadUrls;
    },

    completeUpload: async (_: any, args: any, context: Context) => {
      const { uploads, name, manifesto, disableComments, unlisted, anonymous } =
        args;

      const defaultName = name;

      const userId = anonymous ? null : context.user?.userId || null;
      const { anonId, anonTextColor, anonTextBackground } = context.anonData;

      let album = null;

      // Create album if multiple files
      if (uploads.length > 1) {
        album = await prisma.album.create({
          data: {
            name: defaultName,
            manifesto: manifesto || "",
            userId,
            anonId,
            anonTextColor,
            anonTextBackground,
          },
        });
      }

      const files = [];

      for (const upload of uploads) {
        // Complete multipart upload
        await completeMultipartUpload(
          upload.key,
          upload.uploadId,
          upload.parts
        );

        const fileUrl = getFileUrl(upload.key);
        const hashedFileName = upload.key.split("/").pop()!;

        // Generate thumbnail if applicable
        let thumbnailUrl = null;
        if (
          upload.mimeType.startsWith("image/") ||
          upload.mimeType.startsWith("video/")
        ) {
          try {
            // Download the uploaded file to generate thumbnail
            const fileBuffer = await downloadFile(upload.key);
            thumbnailUrl = await generateThumbnail(
              fileBuffer,
              upload.mimeType,
              hashedFileName
            );
            if (thumbnailUrl) thumbnailUrl = getFileUrl(thumbnailUrl);
          } catch (error) {
            console.error(
              "Error generating thumbnail for file:",
              upload.key,
              error
            );
            // Continue without thumbnail if generation fails
          }
        }

        const file = await prisma.file.create({
          data: {
            name: defaultName,
            manifesto: manifesto || "",
            fileName: upload.fileName,
            fileSize: upload.fileSize,
            mimeType: upload.mimeType,
            hashedFileName,
            fileUrl,
            thumbnailUrl,
            userId,
            anonId,
            anonTextColor,
            anonTextBackground,
            albumId: album?.id,
          },
        });

        files.push(file);
      }

      // Publish file count update
      const totalFiles = await prisma.file.count({ where: { removed: false } });
      pubsub.publish(FILE_COUNT_UPDATED, { fileCountUpdated: totalFiles });

      // Publish browse update
      if (files.length === 1) {
        pubsub.publish(BROWSE_ITEMS_UPDATED, { browseItemsUpdated: files[0] });
      } else if (album) {
        pubsub.publish(BROWSE_ITEMS_UPDATED, { browseItemsUpdated: album });
      }

      return {
        file: files[0],
        album,
      };
    },

    createComment: async (_: any, args: any, context: Context) => {
      // Verify reCAPTCHA
      if (isRecaptchaRequired()) {
        if (!args.recaptchaToken) {
          throw new Error("reCAPTCHA validation failed");
        }
        const isValid = await verifyRecaptcha(args.recaptchaToken);
        if (!isValid) {
          throw new Error("reCAPTCHA validation failed");
        }
      }

      const { flavor, contentId, text, repliesTo } = args;

      if (text.length > 1000) {
        throw new Error("Comment must be 1000 characters or less");
      }

      // Validate flavor and that the content exists
      if (!["album", "file", "timeline", "user"].includes(flavor)) {
        throw new Error(`Invalid comment flavor: ${flavor}`);
      }

      // Check that the content exists for the specified flavor
      let contentExists = false;
      if (flavor === "album") {
        const album = await prisma.album.findUnique({
          where: { id: contentId },
          select: { id: true },
        });
        contentExists = !!album;
        if (!contentExists) {
          throw new Error("Album not found");
        }
      } else if (flavor === "file") {
        const file = await prisma.file.findUnique({
          where: { id: contentId },
          select: { id: true },
        });
        contentExists = !!file;
        if (!contentExists) {
          throw new Error("File not found");
        }
      } else if (flavor === "timeline") {
        const timeline = await prisma.timeline.findUnique({
          where: { id: contentId },
          select: { id: true },
        });
        contentExists = !!timeline;
        if (!contentExists) {
          throw new Error("Timeline not found");
        }
      } else if (flavor === "user") {
        const user = await prisma.user.findUnique({
          where: { id: contentId },
          select: { id: true },
        });
        contentExists = !!user;
        if (!contentExists) {
          throw new Error("User not found");
        }
      }

      const userId = context.user?.userId || null;
      const { anonId, anonTextColor, anonTextBackground } = context.anonData;

      // Create comment within a transaction to ensure atomicity
      const comment = await prisma.$transaction(async (tx) => {
        // Double-check content exists right before creation (in case of race conditions)
        if (flavor === "album") {
          const album = await tx.album.findUnique({
            where: { id: contentId },
            select: { id: true },
          });
          if (!album) {
            throw new Error("Album not found");
          }
        } else if (flavor === "file") {
          const file = await tx.file.findUnique({
            where: { id: contentId },
            select: { id: true },
          });
          if (!file) {
            throw new Error("File not found");
          }
        } else if (flavor === "timeline") {
          const timeline = await tx.timeline.findUnique({
            where: { id: contentId },
            select: { id: true },
          });
          if (!timeline) {
            throw new Error("Timeline not found");
          }
        } else if (flavor === "user") {
          const user = await tx.user.findUnique({
            where: { id: contentId },
            select: { id: true },
          });
          if (!user) {
            throw new Error("User not found");
          }
        }
        const result = await tx.comment.create({
          data: {
            flavor,
            contentId,
            text,
            repliesTo,
            userId,
            anonId,
            anonTextColor,
            anonTextBackground,
          },
        });
        return result;
      });

      // Publish comment update
      pubsub.publish(COMMENTS_UPDATED, {
        commentsUpdated: comment,
      });

      return comment;
    },

    deleteComment: async (_: any, args: any, context: Context) => {
      if (!context.user?.userId) {
        throw new Error("Not authenticated");
      }

      const comment = await prisma.comment.findUnique({
        where: { id: args.id },
      });

      if (!comment) {
        throw new Error("Comment not found");
      }

      const user = await prisma.user.findUnique({
        where: { id: context.user?.userId },
      });

      // User can delete their own comment, or mods can delete any comment
      if (
        comment.userId !== context.user?.userId &&
        !isModOrAdmin(user!.role)
      ) {
        throw new Error("Unauthorized");
      }

      await prisma.comment.update({
        where: { id: args.id },
        data: { removed: true },
      });

      return true;
    },

    vote: async (_: any, args: any, context: Context) => {
      if (!context.user?.userId) {
        throw new Error("Must be logged in to vote");
      }

      const { flavor, contentId, vote } = args;

      if (vote !== 1 && vote !== -1 && vote !== 0) {
        throw new Error("Vote must be 1, -1, or 0");
      }

      // Check if vote already exists
      const existingVote = await prisma.vote.findFirst({
        where: {
          userId: context.user?.userId || null,
          flavor,
          contentId,
        },
      });

      if (vote === 0) {
        // Remove vote
        if (existingVote) {
          await prisma.vote.delete({ where: { id: existingVote.id } });
        }
      } else if (existingVote) {
        // Update vote
        await prisma.vote.update({
          where: { id: existingVote.id },
          data: { vote },
        });
      } else {
        // Create new vote
        await prisma.vote.create({
          data: {
            userId: context.user?.userId || null,
            flavor,
            contentId,
            vote,
          },
        });
      }

      // Publish update based on flavor
      if (flavor === "file") {
        const file = await prisma.file.findUnique({ where: { id: contentId } });
        pubsub.publish(FILE_UPDATED, { fileUpdated: file });
      } else if (flavor === "album") {
        const album = await prisma.album.findUnique({
          where: { id: contentId },
        });
        pubsub.publish(ALBUM_UPDATED, { albumUpdated: album });
      }

      return true;
    },

    createReport: async (_: any, args: any, context: Context) => {
      const { flavor, contentId, reason } = args;
      const userId = context.user?.userId || null;
      const { anonId } = context.anonData;

      await prisma.report.create({
        data: {
          flavor,
          contentId,
          reason,
          userId,
          anonId,
        },
      });

      return true;
    },

    dismissReport: async (_: any, args: any, context: Context) => {
      const user = await prisma.user.findUnique({
        where: { id: context.user?.userId },
      });

      if (!user || !isModOrAdmin(user.role)) {
        throw new Error("Unauthorized");
      }

      const report = await prisma.report.findUnique({ where: { id: args.id } });

      if (!report) {
        throw new Error("Report not found");
      }

      // Dismiss all reports for this content
      await prisma.report.updateMany({
        where: {
          flavor: report.flavor,
          contentId: report.contentId,
        },
        data: { dismissed: true },
      });

      // Log action
      await prisma.modLog.create({
        data: {
          userId: context.user?.userId || null,
          flavor: "dismissed",
          contentFlavor: report.flavor,
          contentId: report.contentId,
        },
      });

      return true;
    },

    deleteContent: async (_: any, args: any, context: Context) => {
      const user = await prisma.user.findUnique({
        where: { id: context.user?.userId },
      });

      if (!user || !isModOrAdmin(user.role)) {
        throw new Error("Unauthorized");
      }

      const { flavor, contentId } = args;

      if (flavor === "file") {
        await prisma.file.update({
          where: { id: contentId },
          data: { removed: true },
        });
      } else if (flavor === "album") {
        await prisma.album.update({
          where: { id: contentId },
          data: { removed: true },
        });
      } else if (flavor === "timeline") {
        await prisma.timeline.update({
          where: { id: contentId },
          data: { removed: true },
        });
      } else if (flavor === "comment") {
        await prisma.comment.update({
          where: { id: contentId },
          data: { removed: true },
        });
      }

      // Log action
      await prisma.modLog.create({
        data: {
          userId: context.user?.userId || null,
          flavor: "removed",
          contentFlavor: flavor,
          contentId,
        },
      });

      return true;
    },

    restoreContent: async (_: any, args: any, context: Context) => {
      const user = await prisma.user.findUnique({
        where: { id: context.user?.userId },
      });

      if (!user || !isModOrAdmin(user.role)) {
        throw new Error("Unauthorized");
      }

      const { flavor, contentId } = args;

      if (flavor === "file") {
        await prisma.file.update({
          where: { id: contentId },
          data: { removed: false },
        });
      } else if (flavor === "album") {
        await prisma.album.update({
          where: { id: contentId },
          data: { removed: false },
        });
      } else if (flavor === "timeline") {
        await prisma.timeline.update({
          where: { id: contentId },
          data: { removed: false },
        });
      } else if (flavor === "comment") {
        await prisma.comment.update({
          where: { id: contentId },
          data: { removed: false },
        });
      }

      // Log action
      await prisma.modLog.create({
        data: {
          userId: context.user?.userId || null,
          flavor: "restored",
          contentFlavor: flavor,
          contentId,
        },
      });

      return true;
    },

    banUser: async (_: any, args: any, context: Context) => {
      const user = await prisma.user.findUnique({
        where: { id: context.user?.userId },
      });

      if (!user || !isModOrAdmin(user.role)) {
        throw new Error("Unauthorized");
      }

      await prisma.user.update({
        where: { id: args.userId },
        data: { banned: true },
      });

      // Log action
      await prisma.modLog.create({
        data: {
          userId: context.user?.userId || null,
          flavor: "banned",
          contentFlavor: "user",
          contentId: args.userId,
        },
      });

      return true;
    },

    unbanUser: async (_: any, args: any, context: Context) => {
      const user = await prisma.user.findUnique({
        where: { id: context.user?.userId },
      });

      if (!user || !isModOrAdmin(user.role)) {
        throw new Error("Unauthorized");
      }

      await prisma.user.update({
        where: { id: args.userId },
        data: { banned: false },
      });

      return true;
    },

    changeUserRole: async (_: any, args: any, context: Context) => {
      const user = await prisma.user.findUnique({
        where: { id: context.user?.userId },
      });

      if (!user || !isAdmin(user.role)) {
        throw new Error("Unauthorized");
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: args.userId },
      });

      const oldRole = targetUser!.role;

      await prisma.user.update({
        where: { id: args.userId },
        data: { role: args.role },
      });

      // Log action
      let flavor = "demoted to child";
      if (args.role === "janny" && oldRole !== "janny") {
        flavor = "promoted to janny";
      } else if (args.role === "admincel" && oldRole !== "admincel") {
        flavor = "promoted to admincel";
      } else if (args.role === "child" && oldRole === "janny") {
        flavor = "demoted to janny";
      }

      await prisma.modLog.create({
        data: {
          userId: context.user?.userId || null,
          flavor,
          contentFlavor: "user",
          contentId: args.userId,
        },
      });

      return true;
    },

    updateFile: async (_: any, args: any, context: Context) => {
      if (!context.user?.userId) {
        throw new Error("Not authenticated");
      }

      const file = await prisma.file.findUnique({ where: { id: args.id } });

      if (!file || file.userId !== context.user?.userId) {
        throw new Error("Unauthorized");
      }

      const updates: any = {};
      if (args.name) updates.name = args.name;
      if (args.manifesto !== undefined) updates.manifesto = args.manifesto;

      return prisma.file.update({
        where: { id: args.id },
        data: updates,
      });
    },

    updateAlbum: async (_: any, args: any, context: Context) => {
      if (!context.user?.userId) {
        throw new Error("Not authenticated");
      }

      const album = await prisma.album.findUnique({ where: { id: args.id } });

      if (!album || album.userId !== context.user?.userId) {
        throw new Error("Unauthorized");
      }

      const updates: any = {};
      if (args.name) updates.name = args.name;
      if (args.manifesto !== undefined) updates.manifesto = args.manifesto;

      return prisma.album.update({
        where: { id: args.id },
        data: updates,
      });
    },

    deleteFile: async (_: any, args: any, context: Context) => {
      if (!context.user?.userId) {
        throw new Error("Not authenticated");
      }

      const file = await prisma.file.findUnique({ where: { id: args.id } });

      if (!file || file.userId !== context.user?.userId) {
        throw new Error("Unauthorized");
      }

      await prisma.file.update({
        where: { id: args.id },
        data: { removed: true },
      });

      return true;
    },

    deleteAlbum: async (_: any, args: any, context: Context) => {
      if (!context.user?.userId) {
        throw new Error("Not authenticated");
      }

      const album = await prisma.album.findUnique({ where: { id: args.id } });

      if (!album || album.userId !== context.user?.userId) {
        throw new Error("Unauthorized");
      }

      await prisma.album.update({
        where: { id: args.id },
        data: { removed: true },
      });

      // Also remove all files in the album
      await prisma.file.updateMany({
        where: { albumId: args.id },
        data: { removed: true },
      });

      return true;
    },
  },

  Subscription: {
    fileCountUpdated: {
      subscribe: () => pubsub.asyncIterator([FILE_COUNT_UPDATED]),
    },
    browseItemsUpdated: {
      subscribe: () => pubsub.asyncIterator([BROWSE_ITEMS_UPDATED]),
    },
    fileUpdated: {
      subscribe: (_: any, args: any) =>
        pubsub.asyncIterator([`${FILE_UPDATED}_${args.id}`]),
    },
    albumUpdated: {
      subscribe: (_: any, args: any) =>
        pubsub.asyncIterator([`${ALBUM_UPDATED}_${args.id}`]),
    },
    commentsUpdated: {
      subscribe: (_: any, args: any) =>
        pubsub.asyncIterator([
          `${COMMENTS_UPDATED}_${args.flavor}_${args.contentId}`,
        ]),
    },
  },
};
