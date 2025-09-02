# PostgreSQL Database Setup for QoderFakeRun

## Quick Setup Options

### Option 1: Using Docker (Recommended)
If you have Docker Desktop installed and running:

```bash
# Start Docker Desktop first, then run:
docker-compose up -d postgres redis

# Wait for containers to start (about 30 seconds), then:
npm run db:push
npm run db:seed
```

### Option 2: Local PostgreSQL Installation

#### Step 1: Install PostgreSQL
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. During installation:
   - Set password for 'postgres' user: `password`
   - Keep default port: `5432`
   - Install Stack Builder and add PostGIS extension

#### Step 2: Create Database
Open pgAdmin or psql and run:
```sql
CREATE DATABASE fakerun;
CREATE USER fakerun WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE fakerun TO fakerun;

-- Connect to fakerun database and enable PostGIS
\c fakerun;
CREATE EXTENSION IF NOT EXISTS postgis;
```

#### Step 3: Update Environment File
Update `.env.local` with your database credentials:
```env
DATABASE_URL="postgresql://fakerun:password@localhost:5432/fakerun?schema=public"
```

### Option 3: Using Cloud Database (Easiest)
Use a cloud PostgreSQL service like:
- **Supabase** (free tier): https://supabase.com/
- **Neon** (free tier): https://neon.tech/
- **Railway** (free tier): https://railway.app/

## After Database Setup

Once your database is running, execute these commands:

```bash
# Generate Prisma client (already done)
npx prisma generate

# Push schema to database
npm run db:push

# Seed initial data (optional)
npm run db:seed

# Restart the development server
# Ctrl+C to stop current server, then:
npm run dev
```

## Verify Setup

Your application should now have full database functionality:
- User registration and authentication
- Route saving and loading
- Token management
- Admin panel access

## Default Admin User
After seeding, you can login with:
- Username: `gogo`
- Password: `gogo`
- Email: `admin@qoderfakerun.com`

## Troubleshooting

If you encounter connection issues:
1. Check if PostgreSQL service is running
2. Verify database credentials in `.env.local`
3. Ensure PostGIS extension is installed
4. Check firewall settings for port 5432