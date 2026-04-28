# Lumiis

> **AI Growth Copilot for Creators** — Transform your content strategy with intelligent planning, AI-powered ideas, and real-time analytics.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 🚀 Overview

Lumiis is a comprehensive platform designed for modern creators who want to scale their content presence without the chaos. Whether you're managing YouTube, Instagram, or TikTok, Lumiis combines **AI-powered content ideation**, **intelligent analytics**, and **strategic planning** tools to help you grow faster and smarter.

Stop guessing what works. Start building what resonates.

### Key Benefits
- ⚡ **AI-Powered Ideas** — Generate on-brand content ideas backed by platform analytics and trending topics
- 📊 **Real-Time Analytics** — Track performance across YouTube, Instagram, and more from a unified dashboard
- 📅 **Content Planner** — Organize your posting strategy with an intuitive calendar and scheduling system
- 🤖 **Intelligent Assistant** — Get proactive suggestions on what to post next based on your audience
- 🔗 **Multi-Platform** — Seamlessly connect and manage multiple social media accounts
- 🎯 **Growth Insights** — Understand your audience, identify trending content, and optimize engagement

---

## ✨ Features

![Login](./img/login.jpeg)

### 📸 Dashboard
Your at-a-glance hub for all things creator. See your latest analytics, upcoming posts, and AI recommendations all in one place.

![Dashboard](./img/dashboard.jpeg)

### 💡 AI Chat Assistant
Get real-time suggestions and brainstorm content ideas with an AI assistant trained on your channel data and platform trends.

![AI Chat](./img/chat.jpeg)
![AI Chat](./img/chat1.jpeg)

### 📋 Content Planner
Plan your week (or month) with an intuitive drag-and-drop calendar. Organize ideas, schedule posts, and track your content pipeline.

![Workspace](./img/workspace.jpeg)
![Workspace](./img/workspace1.jpeg)
![Workspace](./img/workspace2.jpeg)

### Profile & Settings
![Profile](./img/profile.jpeg)

---

## 🎯 How It Works

```
1. CONNECT → Link your YouTube, Instagram, or TikTok account
                 ↓
2. ANALYZE → Lumiis pulls your analytics and learns your audience
                 ↓
3. IDEATE → AI generates personalized content ideas and suggestions
                 ↓
4. PLAN → Use the content planner to organize and schedule posts
                 ↓
5. GROW → Track performance in real-time and iterate on what works
```

**The Flow:**
- **Onboarding**: Sign up, connect your first social account via OAuth, and let Lumiis sync your historical data
- **Daily Use**: Check your dashboard, review AI suggestions, plan posts in the calendar, and monitor live analytics
- **Growth**: Use insights to refine your strategy, post consistently, and watch your audience grow

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** — Modern React framework with App Router
- **React 18** — UI library with Server Components
- **TypeScript** — Type-safe development
- **TailwindCSS** — Utility-first styling
- **shadcn/ui** — High-quality component library
- **TanStack Query** — Server state management
- **Zod** — Schema validation

### Backend
- **Next.js API Routes** — Serverless API endpoints
- **NextAuth.js** — Authentication & OAuth management
- **Drizzle ORM** — Type-safe database queries
- **PostgreSQL** — Relational database
- **Redis** — Caching & rate limiting
- **BullMQ** — Background job processing

### Infrastructure & DevOps
- **Docker** — Containerization
- **pnpm** — Fast monorepo package manager
- **Turbo** — Monorepo task orchestration
- **Vitest** — Unit testing framework

### External APIs
- **Google APIs** — YouTube Data API, YouTube Analytics API
- **Instagram Graph API** — Instagram insights & data
- **OpenAI** — AI-powered content generation
- **OAuth 2.0** — Secure authentication

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and **pnpm** 9+
- **Docker** (for PostgreSQL and Redis)
- **Git**

### Local Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lumiis.git
   cd lumiis
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start services** (Docker required)
   ```bash
   docker-compose up -d
   ```

4. **Setup database**
   ```bash
   pnpm run db:migrate
   ```

5. **Start development server**
   ```bash
   pnpm run dev
   ```

6. **Open browser**
   ```
   http://localhost:3000
   ```

### Available Commands

```bash
# Development
pnpm run dev              # Start all services in dev mode
pnpm run dev:web         # Start web app only
pnpm run dev:worker      # Start background worker only

# Building
pnpm run build           # Build all packages
pnpm build:web           # Build web app for production

# Database
pnpm run db:migrate      # Run pending migrations
pnpm run db:seed         # Seed database with test data
pnpm run db:studio       # Open Drizzle Studio

# Testing
pnpm run test            # Run all tests
pnpm run test:unit       # Run unit tests
pnpm run test:integration # Run integration tests
pnpm run test:coverage   # Generate coverage report

# Type Checking
pnpm run type:check      # Run TypeScript type checking

# Linting
pnpm run lint            # Lint all files
pnpm run format          # Format code with Prettier
```

---

## 🔧 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lumiis

# Redis
REDIS_URL=redis://localhost:6379

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl

# OAuth - Google (YouTube)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth - Meta (Instagram)
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret

# AI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-turbo

# Analytics
ANALYTICS_ENABLED=true

# Background Jobs
WORKER_DISABLED=false

# Feature Flags
FEATURE_AI_CHAT=true
FEATURE_CONTENT_PLANNER=true
FEATURE_ADVANCED_ANALYTICS=true
```

### Generating NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

---

## 📖 Usage

### Connecting Your First Account

1. Sign up at `http://localhost:3000/register`
2. Navigate to **Profile** → **Connected Accounts**
3. Click **Connect YouTube**
4. Authorize Lumiis to access your account
5. Sync will begin automatically

### Using AI Chat

1. Go to **Dashboard** → **Chat**
2. Ask questions like:
   - "What topics should I create about this week?"
   - "Why did my last video underperform?"
   - "Suggest a posting schedule for maximum engagement"
3. Chat responds with insights powered by your analytics data

### Planning Content

1. Navigate to **Content Planner**
2. Drag ideas from the sidebar onto your calendar
3. Set publishing dates and platforms
4. Click **Schedule** to prepare posts
5. Monitor performance from the dashboard

### Viewing Analytics

1. Go to **Dashboard** → **Analytics**
2. Select date range and platform
3. Explore:
   - Watch time and engagement metrics
   - Audience demographics
   - Content performance comparison
   - Growth trends over time

---

## 🗂️ Project Structure

```
lumiis/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── src/
│   │   │   ├── app/           # Next.js 15 App Router
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── lib/           # Utilities and helpers
│   │   │   └── services/      # API service calls
│   │   └── package.json
│   └── worker/                 # Background job processor
│       ├── src/
│       │   ├── queues/        # BullMQ queue definitions
│       │   ├── workers/       # Job handlers
│       │   └── schedulers/    # Cron job tasks
│       └── package.json
├── packages/
│   ├── db/                     # Database schema & queries
│   │   ├── src/
│   │   │   ├── schema/        # Drizzle table definitions
│   │   │   └── queries/       # Query helpers
│   │   └── drizzle.config.ts
│   ├── types/                  # Shared TypeScript types
│   │   └── src/
│   │       └── index.ts
│   └── config/                 # Shared configs
├── tests/                      # Test suites
│   ├── unit/
│   ├── integration/
│   └── factories/              # Test data factories
├── docker-compose.yml          # Local dev services
├── pnpm-workspace.yaml         # pnpm monorepo config
├── turbo.json                  # Turbo build config
└── README.md
```

---

## 🧪 Testing

Lumiis uses **Vitest** for unit tests and integration tests.

### Running Tests

```bash
# All tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:coverage

# Specific file
pnpm run test -- auth-callbacks.test.ts
```

### Test Structure
- **Unit Tests**: [tests/unit/](tests/unit) — Component and function logic
- **Integration Tests**: [tests/integration/](tests/integration) — API routes, database queries, external services

---

## 🔌 API Documentation

### Authentication Endpoints
```
POST   /api/auth/signin        — Sign in user
POST   /api/auth/signout       — Sign out user
POST   /api/auth/callback      — OAuth callback handler
```

### Analytics Endpoints
```
GET    /api/analytics/snapshot — Get analytics summary
GET    /api/analytics/videos   — List videos with metrics
POST   /api/analytics/sync     — Trigger manual sync
```

### Profile Endpoints
```
GET    /api/profile            — Get current user profile
PUT    /api/profile            — Update profile
GET    /api/profile/connections — Get OAuth connections
POST   /api/profile/connections — Create new connection
```

### Chat Endpoints
```
POST   /api/chat/stream        — Chat streaming endpoint
GET    /api/chat/history       — Get chat message history
```

For detailed API documentation, see [docs/API.md](./docs/API.md) (coming soon).

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables
Set the same `.env.local` variables in Vercel Dashboard → Settings → Environment Variables.

### Database & Redis
- Use **Neon** or **AWS RDS** for PostgreSQL
- Use **Redis Cloud** or **AWS ElastiCache** for Redis

---

## 🎯 Roadmap

### Q1 2026
- [x] YouTube analytics integration
- [x] Content planner MVP
- [ ] AI chat assistant (in progress)
- [ ] Instagram sync support

### Q2 2026
- [ ] TikTok integration
- [ ] Advanced sentiment analysis
- [ ] Collaborative team workspaces
- [ ] Custom report builder

### Q3 2026
- [ ] Mobile app (React Native)
- [ ] API for third-party integrations
- [ ] Predictive analytics
- [ ] A/B testing framework

### Future
- [ ] Real-time collaboration
- [ ] Marketplace for templates
- [ ] Multi-language support
- [ ] Enterprise features

---

## 🤝 Contributing

We love contributions! Whether it's bug fixes, feature requests, or documentation improvements, your help makes Lumiis better.

### Getting Started with Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Guidelines
- Write TypeScript with strict mode enabled
- Add tests for new features
- Follow ESLint and Prettier rules: `pnpm run lint && pnpm run format`
- Keep commits atomic and descriptive

### Reporting Bugs
Please use [GitHub Issues](https://github.com/yourusername/lumiis/issues) to report bugs. Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (browser, OS, version)

---

## 📝 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) file for details.

---

## 💬 Support & Community

- **Issues**: [GitHub Issues](https://github.com/yourusername/lumiis/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/lumiis/discussions)
- **Email**: support@lumiis.com
- **Twitter**: [@lumiisai](https://twitter.com/lumiisai)

---

## 🙏 Acknowledgments

Built with passion for creators. Special thanks to the open-source community and all contributors who help make Lumiis better.

---

<div align="center">

**Made with ❤️ for creators**

[Website](https://lumiis.com) • [Twitter](https://twitter.com/lumiisai) • [Discord](https://discord.gg/lumiis)

</div>
