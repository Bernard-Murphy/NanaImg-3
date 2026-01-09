import { gql } from 'graphql-tag'

export const typeDefs = gql`
  scalar DateTime

  type User {
    id: Int!
    username: String!
    displayName: String!
    timestamp: DateTime!
    email: String
    defaultTheme: String!
    avatar: Int
    avatarFile: File
    bio: String!
    banned: Boolean!
    role: String!
    posts: [File!]!
    albums: [Album!]!
    comments: [Comment!]!
    karma: Int!
  }

  type File {
    id: Int!
    name: String
    manifesto: String!
    timestamp: DateTime!
    removed: Boolean!
    userId: Int
    user: User
    anonId: String!
    anonTextColor: String!
    anonTextBackground: String!
    views: Int!
    fileName: String!
    fileSize: Int!
    mimeType: String!
    hashedFileName: String!
    fileUrl: String!
    thumbnailUrl: String
    albumId: Int
    album: Album
    comments: [Comment!]!
    commentCount: Int!
    karma: Int!
    userVote: Int
  }

  type Album {
    id: Int!
    name: String
    timestamp: DateTime!
    userId: Int
    user: User
    anonId: String!
    anonTextColor: String!
    anonTextBackground: String!
    views: Int!
    removed: Boolean!
    manifesto: String!
    files: [File!]!
    comments: [Comment!]!
    commentCount: Int!
    karma: Int!
    userVote: Int
  }

  type Timeline {
    id: Int!
    name: String
    timestamp: DateTime!
    userId: Int
    user: User
    anonId: String!
    anonTextColor: String!
    anonTextBackground: String!
    views: Int!
    removed: Boolean!
    manifesto: String!
    items: [TimelineItem!]!
    comments: [Comment!]!
    commentCount: Int!
    karma: Int!
    userVote: Int
  }

  type TimelineItem {
    id: Int!
    timelineId: Int!
    timestamp: DateTime!
    positionStart: Int
    positionEnd: Int
  }

  type Comment {
    id: Int!
    timestamp: DateTime!
    flavor: String!
    repliesTo: Int
    replyToComment: Comment
    contentId: Int!
    userId: Int
    user: User
    anonId: String!
    anonTextColor: String!
    anonTextBackground: String!
    text: String!
    removed: Boolean!
    replies: [Comment!]!
    replyCount: Int!
    karma: Int!
    userVote: Int
  }

  type Vote {
    id: Int!
    flavor: String!
    vote: Int!
    userId: Int!
    contentId: Int!
    timestamp: DateTime!
  }

  type Report {
    id: Int!
    timestamp: DateTime!
    flavor: String!
    contentId: Int!
    userId: Int
    user: User
    anonId: String!
    dismissed: Boolean!
    reason: String!
  }

  type ModLog {
    id: Int!
    timestamp: DateTime!
    userId: Int!
    user: User!
    flavor: String!
    contentFlavor: String!
    contentId: Int!
    details: String!
  }

  type Gnaa {
    id: Int!
    timestamp: DateTime!
    message: String!
    user: String!
  }

  type Session {
    userId: Int
    anonId: String!
    anonTextColor: String!
    anonTextBackground: String!
  }

  type AuthPayload {
    success: Boolean!
    message: String
    user: User
    token: String
  }

  type UploadUrls {
    uploadId: String!
    urls: [String!]!
    key: String!
  }

  type FileUploadResult {
    file: File!
    album: Album
  }

  type BrowseResult {
    items: [BrowseItem!]!
    total: Int!
    hasMore: Boolean!
  }

  union BrowseItem = File | Album | Timeline

  type SearchResult {
    files: [File!]!
    albums: [Album!]!
    timelines: [Timeline!]!
    users: [User!]!
    total: Int!
  }

  type GnaaSearchResult {
    results: [Gnaa!]!
    total: Int!
    hasMore: Boolean!
  }

  input FileInput {
    name: String
    fileName: String!
    fileSize: Int!
    mimeType: String!
  }

  input RegisterInput {
    username: String!
    displayName: String!
    email: String!
    password: String!
    bio: String
    avatar: Int
  }

  type Query {
    me: User
    user(username: String, id: Int): User
    file(id: Int!): File
    album(id: Int!): Album
    timeline(id: Int!): Timeline
    comment(id: Int!): Comment
    browse(
      page: Int
      limit: Int
      sort: String
      filter: String
      search: String
    ): BrowseResult!
    search(query: String!, filter: String): SearchResult!
    gnaaSearch(
      query: String!
      authors: [String!]
      page: Int
      limit: Int
      sortBy: String
      recaptchaToken: String
    ): GnaaSearchResult!
    reports(page: Int, limit: Int): [Report!]!
    modLogs(page: Int, limit: Int): [ModLog!]!
    users(search: String, page: Int, limit: Int): [User!]!
    userContent(userId: Int!, type: String, page: Int, limit: Int): BrowseResult!
    checkImageFile(fileId: Int!): Boolean!
    totalFileCount: Int!
  }

  type Mutation {
    register(input: RegisterInput!, recaptchaToken: String): AuthPayload!
    login(username: String!, password: String!, recaptchaToken: String): AuthPayload!
    logout: Boolean!
    updateProfile(
      displayName: String
      bio: String
      avatar: Int
      defaultTheme: String
    ): User!
    requestPasswordReset(email: String!, username: String!, recaptchaToken: String): Boolean!
    resetPassword(resetId: String!, password: String!, recaptchaToken: String): AuthPayload!
    
    initiateUpload(files: [FileInput!]!, recaptchaToken: String): [UploadUrls!]!
    completeUpload(
      uploads: [CompleteUploadInput!]!
      name: String
      manifesto: String
      disableComments: Boolean
      unlisted: Boolean
      anonymous: Boolean
      recaptchaToken: String
    ): FileUploadResult!
    
    createComment(
      flavor: String!
      contentId: Int!
      text: String!
      repliesTo: Int
      recaptchaToken: String
    ): Comment!
    deleteComment(id: Int!): Boolean!
    
    vote(flavor: String!, contentId: Int!, vote: Int!): Boolean!
    
    createReport(
      flavor: String!
      contentId: Int!
      reason: String!
    ): Report!
    dismissReport(id: Int!): Boolean!
    
    deleteContent(flavor: String!, contentId: Int!): Boolean!
    restoreContent(flavor: String!, contentId: Int!): Boolean!
    banUser(userId: Int!): Boolean!
    unbanUser(userId: Int!): Boolean!
    changeUserRole(userId: Int!, role: String!): Boolean!
    
    updateFile(id: Int!, name: String, manifesto: String): File!
    updateAlbum(id: Int!, name: String, manifesto: String): Album!
    deleteFile(id: Int!): Boolean!
    deleteAlbum(id: Int!): Boolean!
  }

  input CompleteUploadInput {
    key: String!
    uploadId: String!
    fileName: String!
    fileSize: Int!
    mimeType: String!
    name: String
    parts: [UploadPartInput!]!
  }

  input UploadPartInput {
    PartNumber: Int!
    ETag: String!
  }

  type Subscription {
    fileCountUpdated: Int!
    browseItemsUpdated(filter: String, sort: String): BrowseItem!
    fileUpdated(id: Int!): File!
    albumUpdated(id: Int!): Album!
    commentsUpdated(flavor: String!, contentId: Int!): Comment!
  }
`

