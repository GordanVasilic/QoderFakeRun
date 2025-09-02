# Vercel Deployment Guide for FakeRun Pro with Supabase

## 📊 Deployment Size Analysis

### ✅ **NECESSARY FILES/FOLDERS** (Total: ~1.14 MB)

#### Core Application Files:
- **`src/` folder**: 0.59 MB
  - Contains all React components, pages, hooks, utilities
  - API routes for backend functionality
  - TypeScript definitions and business logic

- **`public/` folder**: ~0.01 MB
  - Static assets (logo.svg)
  - Excludes test HTML files (filtered by .vercelignore)

- **`prisma/` folder**: 0.02 MB
  - `schema.prisma` - Database schema definition
  - `seed.js` - Database seeding script
  - `migrations/` - Database migration files

#### Configuration Files (0.52 MB):
- `package.json` (3.11 KB) - Dependencies and scripts
- `package-lock.json` (514.85 KB) - Dependency lock file
- `next.config.js` (2.03 KB) - Next.js configuration
- `tailwind.config.js` (1.16 KB) - Tailwind CSS config
- `postcss.config.js` (0.09 KB) - PostCSS configuration
- `tsconfig.json` (1.06 KB) - TypeScript configuration
- `vercel.json` (0.06 KB) - Vercel deployment config
- `.gitignore` (0.92 KB) - Git ignore rules
- `.vercelignore` (0.41 KB) - Vercel ignore rules

### ❌ **UNNECESSARY FILES/FOLDERS** (Excluded by .vercelignore)

#### Development & Testing:
- `node_modules/` - Dependencies (installed by Vercel)
- `__tests__/` and `src/__tests__/` - Test files
- `test-*.js` files - Development test scripts
- `*.test.(ts|tsx|js|jsx)` - Unit test files
- `jest.config.js`, `jest.setup.js` - Testing configuration

#### Build Artifacts:
- `.next/` - Next.js build output
- `build/`, `dist/`, `generated/` - Build directories
- `.swc/` - SWC compiler cache

#### Development Files:
- `Dockerfile`, `docker-compose.yml` - Docker configuration
- `setup-database.md` - Development documentation
- `supabase-setup.sql` - Local database setup
- `prisma/init-db.sql` - Local database initialization
- `prisma/schema-original.prisma` - Backup schema
- `scripts/` - Development scripts
- `.github/` - GitHub workflows
- `README.md` - Documentation

#### Environment & Logs:
- `.env.local`, `.env.development.local`, etc. - Local environment files
- `.git/`, `.trae/`, `.log` - Version control and logs

## 🔧 Required Environment Variables

### Database Configuration:
```bash
# Supabase Database URL (replace with your Supabase connection string)
DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/[database]?pgbouncer=true&connection_limit=1"
```

### Authentication:
```bash
# JWT Secret for authentication (generate a strong secret)
NEXTAUTH_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

### Mapbox Integration:
```bash
# Mapbox Access Token (get from https://account.mapbox.com/access-tokens/)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGV2ZXJhY2Nlc3N0b2tlbiJ9.your-access-token"
```

### Optional (Stripe - if payment features are enabled):
```bash
# Stripe Configuration (uncomment if using payments)
# STRIPE_SECRET_KEY="sk_live_..."
# STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Application Settings:
```bash
# Node Environment
NODE_ENV="production"

# Custom Application Settings
CUSTOM_KEY="your-custom-value"
```

## 🚀 Step-by-Step Deployment Instructions

### 1. Prepare Supabase Database

#### Option A: Create New Supabase Project
1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project
3. Note down your database URL from Settings > Database
4. Enable PostGIS extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

#### Option B: Use Existing Supabase Project
1. Get your connection string from Supabase dashboard
2. Ensure PostGIS extension is enabled

### 2. Set Up Vercel Project

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via GitHub** (Recommended):
   - Push your code to GitHub repository
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js configuration

3. **Deploy via CLI**:
   ```bash
   cd d:\Projekti\Postgres\QoderFakeRun
   vercel
   ```

### 3. Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variables:

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `DATABASE_URL` | Your Supabase connection string | Production, Preview, Development |
   | `NEXTAUTH_SECRET` | Strong random secret (32+ chars) | Production, Preview, Development |
   | `JWT_SECRET` | Same as NEXTAUTH_SECRET | Production, Preview, Development |
   | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Your Mapbox token | Production, Preview, Development |
   | `NODE_ENV` | `production` | Production |

### 4. Database Migration

1. **Install Prisma CLI locally**:
   ```bash
   npm install -g prisma
   ```

2. **Run database migration**:
   ```bash
   # Set your DATABASE_URL in .env.local for migration
   echo "DATABASE_URL=your-supabase-connection-string" > .env.local
   
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npx prisma db push
   
   # Optional: Seed database
   npm run db:seed
   ```

### 5. Verify Deployment

1. **Check build logs** in Vercel dashboard
2. **Test key functionality**:
   - User registration/login
   - Route creation and saving
   - Map rendering with Mapbox
   - Database connectivity

3. **Monitor for errors** in Vercel Functions logs

## 🔍 Deployment Checklist

- [ ] Supabase project created and PostGIS enabled
- [ ] Database schema deployed via Prisma
- [ ] All environment variables configured in Vercel
- [ ] Mapbox token is valid and has necessary permissions
- [ ] JWT secrets are strong and secure
- [ ] Build completes successfully
- [ ] Application loads without errors
- [ ] Authentication works
- [ ] Map functionality works
- [ ] Database operations work
- [ ] API endpoints respond correctly

## 🛠️ Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check environment variables are set
   - Verify DATABASE_URL format
   - Ensure all dependencies are in package.json

2. **Database Connection Issues**:
   - Verify Supabase connection string
   - Check if PostGIS extension is enabled
   - Ensure connection pooling is configured

3. **Mapbox Not Loading**:
   - Verify NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is set
   - Check token permissions and usage limits
   - Ensure token is public (starts with 'pk.')

4. **Authentication Issues**:
   - Verify JWT_SECRET and NEXTAUTH_SECRET are set
   - Check token generation and verification logic
   - Ensure secrets are the same across environments

## 📈 Performance Optimization

### Vercel-Specific Optimizations:
- **Edge Functions**: API routes automatically use Vercel Edge Runtime
- **Image Optimization**: Next.js Image component optimized for Vercel
- **Static Generation**: Pages are statically generated where possible
- **Bundle Analysis**: Use `npm run build:analyze` to check bundle size

### Database Optimization:
- **Connection Pooling**: Supabase provides built-in connection pooling
- **Indexes**: Ensure proper indexes on frequently queried fields
- **Query Optimization**: Use Prisma's query optimization features

## 💰 Cost Considerations

### Vercel:
- **Hobby Plan**: Free for personal projects
- **Pro Plan**: $20/month for commercial use
- **Function Execution**: Monitor usage to avoid overages

### Supabase:
- **Free Tier**: 500MB database, 2GB bandwidth
- **Pro Plan**: $25/month for production use
- **Database Size**: Monitor PostGIS data storage

### Mapbox:
- **Free Tier**: 50,000 map loads/month
- **Pay-as-you-go**: $5 per 1,000 additional loads
- **API Calls**: Monitor elevation and routing API usage

---

**Total Deployment Size**: ~1.14 MB (excluding node_modules)
**Estimated Build Time**: 2-4 minutes
**Recommended Vercel Plan**: Pro (for production use)
**Recommended Supabase Plan**: Pro (for production use)