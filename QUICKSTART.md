# Feednana - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running
- (Optional) Storj account for file storage

### Step 1: Install Dependencies

```bash
cd /home/bernard/Documents/Feednana
npm install
```

This will install all required packages (~50 dependencies including Next.js, Apollo, Prisma, etc.)

### Step 2: Set Up Database

```bash
# Create database
createdb feednana

# Or using psql:
# psql -U postgres
# CREATE DATABASE feednana;
# \q
```

### Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Minimum required for development:
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/feednana"
SESSION_SECRET="any-random-string-for-development"

# For file uploads (can use any S3-compatible service):
REGION="us-east-1"
STORJ_ENDPOINT="https://gateway.storjshare.io"
STORJ_SECRET_ACCESS_ID="your-access-key"
STORJ_SECRET_ACCESS_KEY="your-secret-key"
STORJ_BUCKET="feednana"

# Base URLs:
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_FILE_CDN_URL="https://f.feednana.com"

# Optional reCAPTCHA (leave empty to disable):
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=""
RECAPTCHA_API_KEY=""
```

### Step 4: Run Database Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Step 5: Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## ✅ What Works Right Now

Once running, you can:

1. **Register** a new account at `/register`
2. **Login** at `/login`
3. **Upload files** at `/` (home page)
4. **Browse files** at `/browse`
5. **Search** files and users
6. **Reset password** via `/forgot-password`
7. **Search GNAA logs** at `/jackiesingh`
8. **View rules** at `/info`

## ⚠️ What Doesn't Work Yet

These pages need to be created:

- `/file/[id]` - View individual files
- `/album/[id]` - View albums
- `/u/[username]` - User profiles
- `/dashboard` - User dashboard

## 🛠️ Development Tips

### View Database

```bash
npx prisma studio
```

This opens a GUI to browse your database at http://localhost:5555

### Reset Database

```bash
npx prisma migrate reset
```

### Check for Errors

```bash
npx tsc --noEmit  # Type checking
npm run lint       # Linting
```

### Add FFmpeg (for video thumbnails)

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg
```

## 📂 Key Files to Know

- `/src/app/page.tsx` - Upload page
- `/src/app/browse/page.tsx` - Browse page
- `/src/lib/graphql/schema.ts` - GraphQL schema
- `/src/lib/graphql/resolvers.ts` - GraphQL resolvers
- `/prisma/schema.prisma` - Database schema
- `/src/components/navbar.tsx` - Navigation bar

## 🎯 Next Steps

1. **Run the app** and test existing features
2. **Create `/file/[id]` page** to view files
3. **Create `/album/[id]` page** to view albums
4. **Fix CopeSection** component for comments
5. \*\*Create `/u/[username]` for user profiles
6. **Create `/dashboard`** for user management

## 📚 Documentation

- `README.md` - Project overview
- `SETUP.md` - Detailed setup guide
- `PROJECT_STATUS.md` - What's done and what's not
- `COMPLETION_SUMMARY.md` - Full implementation details

## 🐛 Troubleshooting

### "Database does not exist"

```bash
createdb feednana
npx prisma migrate dev
```

### "Module not found"

```bash
rm -rf node_modules .next
npm install
```

### "Port 3000 already in use"

```bash
lsof -ti:3000 | xargs kill
# or use different port:
PORT=3001 npm run dev
```

### Prisma errors

```bash
npx prisma generate
npx prisma migrate dev
```

## 💡 Pro Tips

1. **Use Prisma Studio** to quickly view/edit database during development
2. **Check browser console** for GraphQL errors
3. **Use Apollo DevTools** browser extension for debugging GraphQL
4. **Dark theme is default** - all UI components are styled for dark mode
5. **Test with multiple users** by using incognito windows

## 📞 Help

If you get stuck, check:

1. All environment variables are set
2. Database is running and accessible
3. Node modules are installed
4. No port conflicts
5. FFmpeg installed (if working with video uploads)

## 🎉 You're Ready!

The application should now be running at http://localhost:3000

Start by:

1. Creating an account
2. Uploading a file
3. Browsing your uploads

Happy coding! 🚀
