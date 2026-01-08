# Feednana

A full-featured file sharing platform built with Next.js, TypeScript, PostgreSQL, GraphQL, and Tailwind CSS.

INSTALL GIFSICLE

## Features

- **File Uploading**: Upload files up to 1.5GB with drag/drop, paste, and multipart upload support
- **Real-time Updates**: Live file count and browse page updates using GraphQL subscriptions
- **Albums**: Automatically created when multiple files are uploaded
- **Comments (Copes)**: Comment system with voting, replies, and markdown support
- **User Authentication**: Session-based auth with registration, login, and password reset
- **User Roles**: Regular users (child), moderators (janny), and admins (admincel)
- **Anonymous Posting**: Users can post anonymously with persistent anon IDs
- **Browse & Search**: Filter and search files, albums, and timelines
- **Moderation**: Report system, mod logs, and content management
- **reCAPTCHA v3**: Optional spam protection on forms

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Apollo Server, GraphQL
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: Storj (S3-compatible) for file storage
- **Image Processing**: Sharp, Jimp, gif-resize, FFmpeg for thumbnails
- **Authentication**: Express-session with connect-pg-simple
- **Real-time**: GraphQL subscriptions via WebSocket

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Storj account (or S3-compatible storage)
- Google reCAPTCHA v3 keys (optional)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

3. Configure your environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/feednana"

# Session
SESSION_SECRET="your-session-secret-here"

# Storj S3
REGION="us-east-1"
STORJ_ENDPOINT="https://gateway.storjshare.io"
STORJ_SECRET_ACCESS_ID="your-access-key-id"
STORJ_SECRET_ACCESS_KEY="your-secret-access-key"
STORJ_BUCKET="feednana"

# Google reCAPTCHA v3 (optional)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=""
RECAPTCHA_API_KEY=""

# Base URL
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_FILE_CDN_URL="https://f.feednana.com"
```

4. Initialize the database:

```bash
npx prisma migrate dev
npx prisma generate
```

5. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
/home/bernard/Documents/Feednana/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js app directory
│   │   ├── api/
│   │   │   └── graphql/       # GraphQL API endpoint
│   │   ├── browse/            # Browse page
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── forgot-password/   # Forgot password page
│   │   ├── set-password/      # Set password page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Upload page (home)
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── navbar.tsx         # Navigation bar
│   │   └── providers.tsx      # Apollo Provider
│   ├── lib/
│   │   ├── graphql/
│   │   │   ├── schema.ts      # GraphQL type definitions
│   │   │   ├── resolvers.ts   # GraphQL resolvers
│   │   │   └── apollo-server.ts # Apollo Server config
│   │   ├── apollo-client.ts   # Apollo Client config
│   │   ├── prisma.ts          # Prisma client
│   │   ├── session.ts         # Session middleware
│   │   ├── s3.ts              # S3/Storj utilities
│   │   ├── thumbnail.ts       # Thumbnail generation
│   │   ├── recaptcha.ts       # reCAPTCHA verification
│   │   └── utils.ts           # Utility functions
│   └── types/                 # TypeScript type definitions
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Database Schema

### Core Tables

- **User**: User accounts with roles (child/janny/admincel)
- **File**: Individual uploaded files
- **Album**: Collections of files
- **Timeline**: Timeline items (placeholder)
- **Comment**: Comments (copes) on files, albums, timelines, and users
- **Vote**: Upvotes/downvotes on content
- **Report**: User reports for content moderation
- **ModLog**: Moderation action logs
- **PasswordReset**: Password reset tokens
- **Session**: User session data
- **Gnaa**: Special table for Jackie Singh search feature

## Pages

### Completed

- ✅ `/` - Upload page with drag/drop, file management, and progress tracking
- ✅ `/browse` - Browse files, albums, and timelines with filtering and search
- ✅ `/login` - User login
- ✅ `/register` - User registration with avatar support
- ✅ `/forgot-password` - Request password reset
- ✅ `/set-password/:id` - Reset password with token

### To Be Implemented

- ⏳ `/file/:id` - View individual file with comments
- ⏳ `/album/:id` - View album with file grid
- ⏳ `/u/:username` - User profile
- ⏳ `/n/:id` - User profile by ID (redirects to username)
- ⏳ `/dashboard` - User dashboard with content management
- ⏳ `/info` - About page with rules and shortcuts
- ⏳ `/fatrick` - Redirects to /file/4506
- ⏳ `/jackiesingh` - GNAA/2600 IRC search
- ⏳ `/timeline` - Timeline placeholder
- ⏳ `/files/:id` - Redirects to /file/:id
- ⏳ `/user/:username` - Redirects to /u/:username
- ⏳ `/series/:id` - Redirects to /album/:id
- ⏳ `/cope/:id`, `/comment/:id`, `/comments/:id` - Navigate to comment location

## Features Implementation Status

### Core Features

- ✅ File upload with multipart support
- ✅ Real-time file counter
- ✅ Session-based authentication
- ✅ Anonymous posting with persistent IDs
- ✅ reCAPTCHA v3 integration
- ✅ Dark theme UI

### To Be Implemented

- ⏳ Comment (cope) system with voting
- ⏳ File/album/timeline viewing pages
- ⏳ User profiles and dashboards
- ⏳ Moderation interface (reports, mod logs)
- ⏳ Admin panel (user management)
- ⏳ Real-time subscriptions for comments and votes
- ⏳ Thumbnail generation on upload
- ⏳ File navigation (prev/next buttons)
- ⏳ GNAA search functionality

## Development Notes

### Known Issues

- Thumbnail generation needs to be integrated with the upload mutation
- WebSocket connection for subscriptions needs server-side setup
- Some navigation redirects need to be implemented
- Mod/admin dashboard panels need to be created

### Required Packages

All necessary packages have been added to `package.json`. Run `npm install` to install them.

### FFmpeg Requirement

For video thumbnail generation, FFmpeg must be installed on the server:

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg
```

## GraphQL API

The GraphQL API is available at `/api/graphql`. You can use the GraphQL Playground (in development) to explore the schema and test queries.

### Key Queries

- `me` - Get current user
- `file(id: Int!)` - Get file by ID
- `album(id: Int!)` - Get album by ID
- `browse(...)` - Browse content with filters
- `search(query: String!)` - Search content

### Key Mutations

- `register(input: RegisterInput!)` - Register new user
- `login(username: String!, password: String!)` - Login
- `initiateUpload(files: [FileInput!]!)` - Start file upload
- `completeUpload(...)` - Complete file upload
- `createComment(...)` - Post a comment
- `vote(...)` - Vote on content

### Subscriptions

- `fileCountUpdated` - Real-time file count updates
- `browseItemsUpdated` - Real-time browse page updates
- `commentsUpdated(flavor: String!, contentId: Int!)` - Real-time comment updates

## License

MIT

## Contact

For DMCA or legal requests, contact: b@bernardmurphy.net
