# Feednana Setup Guide

This guide will help you set up and run the Feednana application.

## Current Implementation Status

### ✅ Completed Components

**Core Infrastructure:**

- ✅ Next.js 14 with App Router and TypeScript
- ✅ Tailwind CSS with dark theme
- ✅ Prisma ORM with PostgreSQL schema
- ✅ Apollo Server GraphQL API with full schema
- ✅ Apollo Client with WebSocket support for subscriptions
- ✅ Session-based authentication with express-session
- ✅ S3/Storj integration for file storage
- ✅ Thumbnail generation utilities (Sharp, Jimp, gif-resize, FFmpeg)
- ✅ reCAPTCHA v3 integration

**UI Components (shadcn/ui):**

- ✅ Button, Input, Label, Textarea
- ✅ Card, Dialog, Dropdown Menu
- ✅ Checkbox, Progress, Avatar
- ✅ Toast/Toaster, Tabs, Select

**Pages:**

- ✅ Upload page (/) - Full drag/drop, paste, file management, progress tracking
- ✅ Browse page (/browse) - Grid view with filtering and sorting
- ✅ Login page (/login)
- ✅ Register page (/register) - With avatar validation
- ✅ Forgot Password page (/forgot-password)
- ✅ Set Password page (/set-password/[id])

**GraphQL API:**

- ✅ Complete schema with Queries, Mutations, and Subscriptions
- ✅ Full resolvers implementation
- ✅ Authentication and authorization logic
- ✅ File upload flow
- ✅ Comment system mutations
- ✅ Voting system
- ✅ Moderation mutations

### ⏳ Remaining Implementation

**Pages to Create:**

1. File viewing page (`/file/[id]`)

   - Display file with embed support
   - File details and metadata
   - Cope (comment) section
   - Prev/Next navigation
   - Download button
   - Voting UI

2. Album page (`/album/[id]`)

   - File grid with thumbnails
   - Modal for file viewing
   - Album comments
   - Voting UI

3. User profile page (`/u/[username]`)

   - User info, avatar, bio
   - Post/cope history with filters
   - User-specific comment section

4. Dashboard page (`/dashboard`)

   - User Info panel
   - Content management panel
   - Users panel (janny/admincel only)
   - Reports panel (janny/admincel only)
   - Mod Logs panel (admincel only)

5. Info page (`/info`)

   - Rules and guidelines
   - Shortcuts documentation
   - Contact information

6. Special pages:

   - `/fatrick` - Redirect to `/file/4506`
   - `/jackiesingh` - GNAA/2600 IRC search interface
   - `/timeline` - Placeholder page

7. Redirect routes:
   - `/files/[id]` → `/file/[id]`
   - `/user/[username]` → `/u/[username]`
   - `/n/[id]` → `/u/[username]`
   - `/series/[id]` → `/album/[id]`
   - `/cope/[id]`, `/comment/[id]`, `/comments/[id]` → Navigate to comment location

**Components to Complete:**

- Fix CopeSection component GraphQL query
- Create file embed component
- Create voting component
- Create moderation components

**Integration Work:**

- Complete WebSocket server setup for subscriptions
- Integrate thumbnail generation into upload flow
- Set up email sending for password resets
- Implement real-time updates subscriptions

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Install System Dependencies

FFmpeg is required for video thumbnail generation:

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### 3. Database Setup

Create a PostgreSQL database and update your `.env` file:

```bash
# Create database
createdb feednana

# Or using psql
psql -U postgres
CREATE DATABASE feednana;
\q
```

Update `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/feednana"
```

### 4. Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Configure Environment

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random secure string for sessions
- `STORJ_ENDPOINT` - Storj gateway URL
- `STORJ_SECRET_ACCESS_ID` - Storj access key
- `STORJ_SECRET_ACCESS_KEY` - Storj secret key
- `STORJ_BUCKET` - Storj bucket name

Optional:

- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - reCAPTCHA v3 site key
- `RECAPTCHA_API_KEY` - reCAPTCHA v3 secret key

### 6. Seed Database (Optional)

If you want to create an initial admin user, you can run a seed script:

```bash
npx ts-node prisma/seed.ts
```

After seeding the database, reset the auto-increment sequences to prevent ID conflicts:

```bash
npm run db:reset-sequences
```

This ensures that new records created by the application won't conflict with IDs used in seeded data.

### 7. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Production Deployment

### Build the Application

```bash
npm run build
npm start
```

### Environment Configuration

Ensure all environment variables are set in production:

- Set `NODE_ENV=production`
- Use a secure `SESSION_SECRET`
- Configure proper database connection
- Set up Storj/S3 bucket with appropriate permissions
- Enable reCAPTCHA if desired

### Database Migrations

```bash
npx prisma migrate deploy
```

### Reverse Proxy Setup (Nginx example)

```nginx
server {
    listen 80;
    server_name feednana.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for GraphQL subscriptions
    location /api/graphql {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
npx prisma studio

# Reset database (WARNING: destroys all data)
npx prisma migrate reset
```

### Module Not Found Errors

```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### TypeScript Errors

```bash
# Regenerate Prisma client
npx prisma generate

# Check for type errors
npx tsc --noEmit
```

## Next Steps for Development

1. **Create remaining pages** - Start with file viewing and album pages
2. **Fix CopeSection** - Update the GraphQL query to properly fetch comments
3. **Implement WebSocket server** - Set up proper WebSocket handling for subscriptions
4. **Add thumbnail generation** - Integrate thumbnail creation into upload flow
5. **Create dashboard panels** - Build out user dashboard with all panels
6. **Test end-to-end flow** - Upload → View → Comment → Vote workflow
7. **Add moderation features** - Reports, mod logs, user management
8. **Implement remaining redirects** - All the alternate URL formats

## API Documentation

### GraphQL Endpoint

`POST /api/graphql`

#### Example Query

```graphql
query GetFile {
  file(id: 1) {
    id
    name
    fileUrl
    thumbnailUrl
    karma
    commentCount
    user {
      username
    }
  }
}
```

#### Example Mutation

```graphql
mutation CreateComment {
  createComment(flavor: "file", contentId: 1, text: "Great file!") {
    id
    karma
  }
}
```

#### Example Subscription

```graphql
subscription FileCountUpdated {
  fileCountUpdated
}
```

## Contributing

When adding new features:

1. Update the Prisma schema if database changes are needed
2. Run migrations: `npx prisma migrate dev`
3. Update GraphQL schema and resolvers
4. Create/update React components
5. Test thoroughly before committing

## Support

For issues or questions, contact: b@bernardmurphy.net
