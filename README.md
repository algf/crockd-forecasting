# Crockd Forecasting

A comprehensive Xero budgeting and forecasting application with AI-powered insights.

## Features

- **Xero Integration**: Connect to your Xero account and sync 24 months of financial history
- **Scenario Forecasting**: Create multiple forecast scenarios (Base/Upside/Downside) with different assumptions
- **Rolling 12-Month 3-Way Model**: P&L, Balance Sheet, and Cashflow statements with balance checks
- **13-Week Cash View**: Weekly cash position based on AR/AP due dates and scheduled payments
- **Variance Analysis**: Compare actuals vs forecast with supplier-level drilldowns
- **AI Assistant**: Ask natural language questions about your spending patterns

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with design tokens, Radix UI, shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Background Jobs**: BullMQ with Redis
- **AI**: OpenAI GPT-4 with function calling
- **Xero Integration**: xero-node SDK

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis (for background jobs)
- Xero Developer Account
- OpenAI API Key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crockd-forecasting
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/crockd_forecasting"

# Redis
REDIS_URL="redis://localhost:6379"

# Xero OAuth2 (get from https://developer.xero.com/app/manage)
XERO_CLIENT_ID="your-client-id"
XERO_CLIENT_SECRET="your-client-secret"
XERO_REDIRECT_URI="http://localhost:3000/api/xero/callback"

# OpenAI
OPENAI_API_KEY="your-openai-key"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Xero Setup

1. Create a Xero app at [developer.xero.com](https://developer.xero.com/app/manage)
2. Set the OAuth 2.0 redirect URI to `http://localhost:3000/api/xero/callback`
3. Copy the Client ID and Client Secret to your `.env.local`
4. In the app, go to Settings > Xero Connection and click "Connect"
5. Authorize the app in Xero
6. Run an initial sync to import your data

## Project Structure

```
crockd-forecasting/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── actuals/           # Actuals data viewer
│   │   ├── assistant/         # AI chat interface
│   │   ├── cash/              # 13-week cash view
│   │   ├── forecasts/         # Scenarios & statements
│   │   ├── settings/          # App settings & Xero connection
│   │   └── variance/          # Variance analysis
│   ├── components/
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── layout/            # App shell, sidebar, header
│   │   └── ui/                # Reusable UI components
│   ├── lib/
│   │   ├── ai/                # AI tools & chat logic
│   │   ├── db/                # Prisma client
│   │   ├── forecast/          # Forecast engine
│   │   ├── reporting/         # Variance & analytics
│   │   ├── xero/              # Xero client & sync
│   │   └── utils.ts           # Helper functions
│   └── styles/
│       └── tokens.css         # Design tokens
├── prisma/
│   └── schema.prisma          # Database schema
└── docs/
    └── BUG_SOLUTIONS.md       # Common issues & fixes
```

## Key Features

### Xero Sync
- OAuth2 connection with automatic token refresh
- Initial import: 24 months of history
- Incremental sync for updates
- Syncs: Accounts, Contacts, Bank Transactions, Invoices, Bills, Payments

### Forecasting
- Multiple active scenarios (Base/Upside/Downside)
- Per-account assumption methods:
  - Flat amount
  - Month-over-month growth
  - Year-over-year growth
  - Seasonality profiles
  - Manual overrides
- 3-way model: P&L → Balance Sheet → Cashflow
- Balance equation checks

### Cash Management
- 13-week rolling cash forecast
- Invoice-level AR/AP timing (strict due dates)
- Payroll and tax payment scheduling
- Low cash point alerts

### AI Assistant
- Natural language questions about financial data
- Tool-calling for accurate data queries
- Transaction-level citations
- Questions like:
  - "What are my top 10 SaaS suppliers?"
  - "How has AWS spending trended over 6 months?"
  - "What's my spend by category this month?"

## Design Tokens

The app uses CSS custom properties for consistent styling. Edit `src/styles/tokens.css` to customize:

- Color palette (primary, accent, neutral, semantic)
- Typography (font families, sizes, weights)
- Spacing scale
- Border radius
- Shadows
- Transitions

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
# Build
docker build -t crockd-forecasting .

# Run
docker run -p 3000:3000 --env-file .env crockd-forecasting
```

## License

Private - All rights reserved
