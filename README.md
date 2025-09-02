# FakeRun Pro - Advanced Running Route Generator

🏃‍♂️ A professional-grade web application for creating, editing, and exporting custom running routes with interactive charts and advanced features.

## ✨ Features

### 🗺️ Interactive Mapping
- **Mapbox GL JS** integration with high-performance rendering
- **Draggable waypoints** - Click and drag to reposition route points
- **Point management** - Add, delete, and modify route points
- **Predefined shapes** - Generate heart and circle routes automatically
- **Real-time visualization** - Live route updates and statistics

### 📊 Interactive Charts
- **Pace editing** - Click and drag to modify pace data
- **Heart rate editing** - Interactive HR chart modifications
- **Elevation profiles** - Detailed elevation visualization
- **Real-time updates** - Charts update as you modify the route

### 📁 Professional File Export
- **GPX format** - Compatible with all GPS devices
- **TCX format** - Training Center XML with advanced data
- **Both formats** - Complete export package
- **Route summaries** - Detailed statistics and metadata
- **Heart rate data** - Include HR data in exports

### 🛡️ Security & Performance
- **Rate limiting** - API protection with configurable limits
- **Input validation** - Zod schemas for all data
- **Code obfuscation** - Production code protection
- **Bundle optimization** - Minimal bundle sizes
- **Security headers** - Comprehensive security hardening

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL with PostGIS (for full features)
- Redis (for rate limiting)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fakerun-pro.git
   cd fakerun-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

#### Required
```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
DATABASE_URL=postgresql://username:password@localhost:5432/fakerun
```

#### Optional
```env
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### Mapbox Setup
1. Create account at [Mapbox](https://www.mapbox.com/)
2. Get your access token
3. Add to `.env.local`

## 🏗️ Architecture

### Frontend
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Mapbox GL JS** for mapping
- **Recharts** for interactive charts
- **Zustand** for state management

### Backend
- **Next.js API Routes** for serverless functions
- **PostgreSQL + PostGIS** for geospatial data
- **Redis** for rate limiting and caching
- **Zod** for validation
- **Rate limiting** with LRU cache

### Security
- **Code obfuscation** in production
- **Input validation** on all endpoints
- **Rate limiting** per IP
- **Security headers** (CSP, HSTS, etc.)
- **No source maps** in production

## 📦 Build & Deployment

### Development
```bash
npm run dev          # Start development server
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
```

### Production Build
```bash
npm run build:prod   # Production build with optimizations
npm run start        # Start production server
```

### Bundle Analysis
```bash
npm run build:analyze  # Analyze bundle size
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual container
docker build -t fakerun-pro .
docker run -p 3000:3000 fakerun-pro
```

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

## 🔌 API Documentation

### File Generation
```http
POST /api/files/generate
Content-Type: application/json

{
  \"routeData\": { /* route data */ },
  \"options\": { /* export options */ },
  \"format\": \"gpx\" | \"tcx\" | \"both\"
}
```

### Elevation Data
```http
POST /api/elevation
Content-Type: application/json

{
  \"points\": [
    { \"lat\": 46.05, \"lng\": 14.5 }
  ]
}
```

### Rate Limits
- **File Generation**: 10 requests/minute
- **General API**: 100 requests/minute
- **Route Creation**: 50 requests/minute

## 🧪 Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 📊 Performance

### Optimization Features
- **Code splitting** for optimal loading
- **Image optimization** with WebP/AVIF
- **Bundle compression** with gzip
- **Tree shaking** for unused code removal
- **Service worker** for offline caching

### Bundle Sizes (gzipped)
- **Initial JS**: ~150KB
- **Main CSS**: ~25KB
- **Mapbox**: ~450KB (lazy loaded)
- **Charts**: ~85KB (lazy loaded)

## 🛠️ Development

### Project Structure
```
src/
├── app/                 # Next.js 13+ app directory
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
├── lib/               # Utilities and configurations
├── types/             # TypeScript definitions
├── utils/             # Helper functions
└── store/             # State management
```

### Key Components
- `MapComponent` - Interactive mapping with Mapbox
- `InteractiveDataVisualization` - Editable charts
- `RouteStats` - Real-time statistics
- `RunDetails` - Export functionality

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Mapbox** for excellent mapping services
- **Recharts** for powerful charting capabilities
- **Next.js** team for the amazing framework
- **Vercel** for hosting and deployment platform

## 📞 Support

For support, email support@yourcompany.com or join our Discord server.

---

**Built with ❤️ by FakeRun Pro Team**