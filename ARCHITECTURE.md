# Dalma (Smaksly) — Architecture & Feature Reference

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), TypeScript |
| Database | MongoDB + Mongoose |
| Queue | BullMQ + Redis (IORedis) |
| Cache | Upstash Redis (REST API) |
| AI | Claude Opus 4.6 / Sonnet (Anthropic), GPT-4o / GPT-4o-mini (OpenAI) |
| Search | Meilisearch |
| Payments | Stripe + Stripe Connect |
| Email | Resend |
| CDN/Media | Cloudinary |
| Hosting (App) | GCP Cloud Run (Docker, Alpine Node 20) |
| Hosting (Sites) | Vercel + GitHub |
| SEO Data | Google Search Console, DataForSEO |
| UI | Tailwind CSS, Recharts, Lucide Icons |

---

## Project Structure

```
dalma/
├── app/                    # Next.js App Router
│   ├── admin/              # Admin dashboard pages (25+)
│   │   ├── builder/        # AI Website Builder (projects, editor, media)
│   │   ├── seo/            # SEO platform (overview, search console, analytics, fixer)
│   │   ├── keywords/       # Keyword research (master, groups, rankings)
│   │   ├── ai-blog-writer/ # AI blog content generator
│   │   ├── domain/         # Domain management
│   │   ├── portfolio/      # Website management
│   │   ├── projects/       # Content projects
│   │   ├── settings/       # App settings
│   │   └── dashboard/      # Main dashboard
│   ├── api/                # API routes (95+ endpoints)
│   │   ├── auth/           # Login, signup
│   │   ├── builder/        # Projects, pages, components, media, publish
│   │   ├── seo/            # Fixer, tracker, metrics, keywords, pages, indexing
│   │   ├── keywords/       # Master, groups, history, research, cluster
│   │   ├── websites/       # CRUD, stats, bulk
│   │   ├── content/        # Content CRUD, AI generation
│   │   ├── guest-posts/    # Guest post CRUD, messaging
│   │   ├── partner/        # Auth, marketplace, orders, profile
│   │   ├── uptime/         # Stats, logs, ping
│   │   ├── stripe/         # Payment webhooks
│   │   ├── commissions/    # Commission management
│   │   └── cron/           # Scheduled job triggers
│   ├── partner/            # Partner portal pages
│   ├── login/              # Auth pages
│   └── signup/
├── models/                 # Mongoose schemas (27 models)
├── services/               # Business logic services
├── lib/                    # Core utilities
│   ├── ai/                 # AI services (site-generator, builder-service, prompts)
│   ├── db.ts               # MongoDB connection
│   ├── queue.ts            # BullMQ queue setup
│   ├── redis.ts            # Upstash Redis client
│   ├── dataforseo.ts       # DataForSEO integration
│   └── meilisearch.ts      # Search indexing
├── jobs/                   # BullMQ workers
│   └── workers/            # Background job processors
├── components/             # Reusable React components
├── public/                 # Static assets
├── Dockerfile              # Multi-stage Docker build
├── cloudbuild.yaml         # GCP Cloud Build CI/CD
└── next.config.ts          # Next.js configuration
```

---

## Database Models (27 Total)

### Authentication & Users
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **User** | email, password, name, role (admin/editor/partner) | App users |
| **Partner** | companyName, tier, stripeAccountId, commissionRate, stats | Guest post marketplace partners |

### Website & Builder
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Website** | domain, niche, categoryId, DA/DR/traffic, gscConnected, themeConfig, country/language | Multi-tenant website hub |
| **BuilderProject** | websiteId, settings (colors, fonts, seoConfig), blogConfig, gitRepoUrl, vercelProjectId | AI website builder project |
| **BuilderPage** | projectId, path, type, code, metaTitle/metaDescription, versions[], aiConversation[] | Generated page with versioning |
| **BuilderComponent** | projectId, name, code, type, scope (global/project) | Reusable React components |
| **BuilderAsset** | projectId, url, name, alt, type (image/video/font) | Media assets (Cloudinary) |
| **Domain** | websiteId, domain, dnsRecords[], sslStatus, vercelDomainId, redirects[] | Custom domain management |

### Content & Guest Posts
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Content** | websiteId, title, slug, body, status, focusKeyword, metaTitle, analytics | Blog posts & pages |
| **GuestPost** | orderId, websiteId, partnerId, targetUrl, anchorText, status, messages[] | Guest post workflow |
| **Category** | name, slug | Content categorization |

### Keywords & SEO
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **KeywordMaster** | keyword, country, volume, kd, cpc, trend, provider | Global keyword dedup (unique: keyword+country) |
| **KeywordHistory** | keywordMasterId, websiteId, date, rank, clicks, impressions | Append-only daily rankings (unique: keyword+website+date) |
| **KeywordGroup** | name, keywordMasterIds[], priorityScore, status, aiSuggestions | AI-clustered keyword groups |
| **SEOMetric** | websiteId, period, gsc{}, ga{}, coreWebVitals{}, backlinks{}, alerts[] | Comprehensive SEO metrics |
| **AIFixReport** | websiteId, healthScore (0-100), issues[], quickWins[], longTermImprovements[] | AI health analysis |
| **UptimeLog** | websiteId, statusCode, latencyMs, isUp, status | Uptime pings (TTL: 90 days) |
| **HealthReport** | websiteId, issues, scores | Technical health checks |
| **Issue** | websiteId, severity, category, problem | SEO issue tracking |

### Commerce
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Order** | partnerId, items[], total, stripeSessionId, status | Guest post orders |
| **Commission** | partnerId, orderId, amount, status | Partner payouts |

---

## API Routes (95+ Endpoints)

### Authentication
```
POST /api/auth/signup          — Register (bcrypt, rate-limited 5/5min)
POST /api/auth/login           — Login (rate-limited 10/5min)
```

### Website Builder
```
GET/POST   /api/builder/projects                         — List / Create projects
GET/PUT    /api/builder/projects/[projectId]              — Project CRUD
POST       /api/builder/projects/[projectId]/generate-site — Full AI site generation (10min timeout)
POST       /api/builder/projects/[projectId]/publish      — Deploy to GitHub + Vercel
GET/POST   /api/builder/projects/[projectId]/domain       — Custom domain management
GET/PUT    /api/builder/projects/[projectId]/branding     — Logo, favicon, SEO metadata
GET/PUT    /api/builder/projects/[projectId]/languages    — Multi-language config
GET/POST   /api/builder/pages                             — Page CRUD
POST       /api/builder/pages/[pageId]/generate           — AI page generation
POST       /api/builder/pages/[pageId]/edit               — AI code editing
GET/POST   /api/builder/components                        — Component CRUD
POST       /api/builder/components/[id]/generate          — AI component generation
GET/POST   /api/builder/media                             — Media upload (Cloudinary)
GET        /api/builder/blogs                             — Blog listing per project
GET        /api/builder/pages/sitemap                     — XML sitemap generation
POST       /api/builder/preview                           — Live preview
```

### SEO Platform
```
GET/POST   /api/seo/fixer                                — AI health reports (all sites)
GET/POST   /api/seo/fixer/[websiteId]                    — Per-site AI analysis
GET        /api/seo/tracker/[websiteId]/trends            — 7/14/30/60/90d trend comparison
GET        /api/seo/tracker/[websiteId]/keywords          — Keyword rankings (latest or trend)
GET        /api/seo/metrics                               — GSC/GA aggregated metrics
GET        /api/seo/pages                                 — Page-level performance
GET        /api/seo/indexing                              — GSC indexing status
GET        /api/seo/keywords                              — Keyword summary stats
```

### Keyword Research
```
GET/POST/DELETE  /api/keywords/master                     — Global keyword library
GET/POST         /api/keywords/groups                     — AI clustering / manual groups
GET/PUT/DELETE   /api/keywords/groups/[groupId]            — Group detail
POST/GET         /api/keywords/groups/[groupId]/assign     — Assign to website
POST             /api/keywords/groups/[groupId]/suggest    — AI blog suggestions (gpt-4o-mini)
POST/PATCH       /api/keywords/groups/[groupId]/blog       — Create/update blog from group
GET              /api/keywords/history                     — Daily ranking history
GET              /api/keywords/research                    — DataForSEO keyword data
```

### Content
```
GET/POST/DELETE  /api/content                             — Content CRUD
GET/POST         /api/content/generate                    — AI content generation
POST             /api/ai-blog-writer/generate             — AI blog writer
```

### Websites
```
GET/POST         /api/websites                            — List / Create
GET/PUT/DELETE   /api/websites/[id]                       — Website CRUD
GET              /api/websites/stats                      — Statistics
POST             /api/websites/bulk                       — Bulk operations
```

### Guest Posts & Marketplace
```
GET/POST         /api/guest-posts                         — List / Create
GET/PUT/DELETE   /api/guest-posts/[id]                    — Guest post CRUD
POST             /api/guest-posts/[id]/messages           — Messaging
GET              /api/guest-posts/stats                   — Analytics
```

### Partner Portal
```
POST  /api/partner/auth/register      — Partner registration
POST  /api/partner/auth/login         — Partner login
GET   /api/partner/auth/me            — Current partner
GET   /api/partner/marketplace        — Browse websites
POST  /api/partner/marketplace/[id]   — Purchase guest post
GET   /api/partner/orders             — View orders
POST  /api/partner/orders/[id]/submit-content — Submit content
```

### Uptime & Payments
```
GET   /api/uptime/[websiteId]         — Stats / logs / hourly (mode param)
POST  /api/uptime/ping                — Manual ping
POST  /api/stripe/webhook             — Payment webhook
GET   /api/commissions                — Commission management
```

---

## Admin Pages

| URL | Page | Description |
|-----|------|-------------|
| `/admin/dashboard` | Dashboard | Main overview |
| `/admin/builder` | Projects List | All builder projects with status |
| `/admin/builder/new` | Create Project | New project with SEO config, colors, fonts |
| `/admin/builder/[projectId]` | Editor Workspace | Code editor + preview + AI edit panel |
| `/admin/builder/[projectId]/media` | Media Library | Upload/manage images (Cloudinary) |
| `/admin/seo` | SEO Overview | Network health, per-site cards, attention alerts |
| `/admin/seo/search-console` | Search Console | GSC connection setup, status per website |
| `/admin/seo/analytics` | Analytics | Per-website deep analytics (keywords, pages, trends) |
| `/admin/seo/fixer` | AI Fixer Overview | Health scores, SVG gauges, all sites |
| `/admin/seo/fixer/[websiteId]` | AI Fixer Detail | Issues, quick wins, long-term improvements |
| `/admin/keywords` | Keyword Research | Master library, filters, AI research modal |
| `/admin/keywords/groups` | Keyword Groups | AI clusters, priority scores, assign to websites |
| `/admin/keywords/groups/[groupId]` | Group Detail | Keywords, blog suggestions, assignment |
| `/admin/keywords/rankings` | Rankings | Split view: keyword sidebar + trend chart |
| `/admin/ai-blog-writer` | AI Blog Writer | Generate SEO articles with AI |
| `/admin/portfolio` | Websites | Website CRUD, guest post settings |
| `/admin/domain` | Domains | Custom domains, DNS, SSL |
| `/admin/integrations` | Integrations | GSC, GA, Vercel, GitHub connections |
| `/admin/settings` | Settings | App configuration |

---

## Background Workers (BullMQ)

| Worker | Queue | Schedule | Concurrency | What It Does |
|--------|-------|----------|-------------|-------------|
| keywordHistoryWorker | KEYWORD_HISTORY_SYNC | Daily 6 AM UTC | 1 | Appends GSC keyword rankings to KeywordHistory |
| websiteFixerWorker | WEBSITE_FIXER | Mon 4 AM UTC | 1 | Runs gpt-4o analysis for all active websites |
| uptimePingerWorker | UPTIME_PING | Every 5 min | 5 | Pings all active sites, logs status/latency |
| keywordWorker | KEYWORD_RESEARCH | Daily 2 AM | 5 | Fetches keyword data from DataForSEO |
| contentWorker | CONTENT_GENERATION | On-demand | 3 | AI content generation |
| deployWorker | DEPLOY | On-demand | 2 | GitHub/Vercel deployments |

**Queue Config:** Retry 3x with exponential backoff. Retention: 1000 completed (24h), 5000 failed (7d).

---

## AI Usage Map

| Feature | Model | Why |
|---------|-------|-----|
| Full site generation (plan) | Claude Sonnet 4.6 | Structured JSON site plan |
| Page/component code gen | Claude Sonnet 4.6 | TSX code generation |
| Code editing | Claude Sonnet 4.6 | Targeted code modifications |
| Website health analysis | GPT-4o | Deep technical SEO analysis |
| Keyword clustering | GPT-4o-mini | Cost-efficient semantic grouping |
| Blog suggestions | GPT-4o-mini | Title, outline, audience generation |
| Blog writing | GPT-4o | Full SEO article generation |
| Code quality analysis | GPT-4o | Accessibility/performance scoring |

**Cost Controls:**
- GPT-4o-mini for cheap tasks (clustering, suggestions)
- GPT-4o only for high-value analysis (fixer, blog writing)
- 7-day Redis cache for fixer results (prevents re-runs)
- Aggregated stats sent to AI (never raw arrays)
- Sequential processing to avoid rate limits

---

## External Integrations

| Service | Purpose | Auth |
|---------|---------|------|
| Google Search Console | Rankings, clicks, impressions, indexing | Service account JWT |
| DataForSEO | Keyword volume, KD, CPC, trends | Basic auth |
| Vercel | Deploy built sites, domains, SSL | Bearer token |
| GitHub | Code repos for built websites | Personal access token |
| Cloudinary | Image upload & CDN | API key/secret |
| Stripe | Payments + partner payouts (Connect) | Secret key + webhook |
| Meilisearch | Full-text search (websites, keywords, content) | API key |
| Upstash Redis | Caching, rate limiting, sessions | REST token |
| Resend | Transactional emails | API key |

---

## Key Architectural Decisions

### Multi-Tenancy
All data scoped by `websiteId`. KeywordMaster is the only global collection (unique on keyword+country).

### Append-Only History
KeywordHistory and UptimeLog never overwrite existing records — provides full audit trail.

### Priority Scoring Formula
```
priorityScore = volume * 0.4 + (100 - kd) * 0.3 + trafficGap * 0.3
trafficGap = max(0, 100 - min(100, websiteTraffic / 1000))
```

### Code Safety
Generated code passes through sanitizer that:
- Blocks dangerous patterns (eval, Function, innerHTML)
- Blocks server-side imports (fs, path, child_process)
- Validates JSX structure and balanced braces
- Only allows whitelisted imports (react, next/*, lucide-react)

### Database Indexing
- Compound indexes for common queries (websiteId+status, niche+DA)
- Text indexes for search (name, domain, description, tags)
- TTL index on UptimeLog (90-day auto-expiry)
- Unique constraints: KeywordMaster (keyword+country), KeywordHistory (keyword+website+date)

### SEO in Website Builder
- SEO config stored per BuilderProject (niche, country, region, targetKeywords, schemaType)
- AI prompts receive SEO context to generate keyword-optimized pages
- Per-page metaTitle + metaDescription generated during site plan
- JSON-LD schema markup (Organization, LocalBusiness, etc.) injected in layout
- Sitemap.xml + robots.txt auto-generated during publish

---

## Deployment

### GCP Cloud Run
- **Image:** Multi-stage Alpine Node 20 Docker
- **Resources:** 1 CPU, 1Gi memory, min 1 / max 10 instances
- **Timeout:** 60 seconds
- **Port:** 8080

### CI/CD (Cloud Build)
- **Trigger:** Push to main branch
- **Steps:** Docker build → Artifact Registry → Cloud Run deploy
- **Machine:** E2_HIGHMEM_8
- **Timeout:** 20 minutes

### Environment Variables
```
MONGODB_URI, JWT_SECRET                    # Core
OPENAI_API_KEY, ANTHROPIC_API_KEY          # AI
GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY    # GSC
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET   # Payments
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN  # Cache
REDIS_URL                                  # BullMQ
VERCEL_TOKEN, GITHUB_TOKEN, GITHUB_USERNAME # Deployment
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY  # Media
MEILISEARCH_HOST, MEILISEARCH_API_KEY      # Search
RESEND_API_KEY                             # Email
CRON_SECRET                                # Cron auth
```
