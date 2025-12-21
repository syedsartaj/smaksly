# Smaksly - SEO Website Network & Guest Post Marketplace Platform

A comprehensive platform for managing SEO website networks, guest post marketplaces, keyword tracking, and content management. Built with Next.js 15, MongoDB, and modern web technologies.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Default Credentials](#default-credentials)

## Features

### Admin Panel (`/admin`)
- **Dashboard** - Overview of all metrics and quick actions
- **Website Management** - Manage 1000+ websites with DA/DR/Traffic metrics
- **Keyword Tracking** - Track keyword rankings and search volume
- **Content Management** - AI-powered content generation and scheduling
- **Guest Post System** - Manage guest post submissions and approvals
- **Commission Tracking** - Track partner commissions and payouts
- **SEO Control** - Search Console integration, indexing, analytics
- **Templates** - Pre-built blog templates for quick deployment
- **Page Builder** - Drag-and-drop page builder

### Partner Portal (`/partner`)
- **Marketplace** - Browse and purchase guest post opportunities
- **Order Management** - Track guest post orders
- **Profile & Settings** - Manage partner account

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose
- **Styling:** Tailwind CSS
- **Authentication:** Custom JWT-based auth
- **AI:** OpenAI API for content generation
- **Email:** Resend
- **Payments:** Stripe
- **Search:** Meilisearch
- **Caching:** Redis (Upstash)
- **Deployment:** GCP Cloud Run / Vercel

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **MongoDB** - [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended) or local installation

## Installation

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/smaksly.git

# Navigate to the project directory
cd smaksly
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
npm install

# If you encounter peer dependency issues, use:
npm install --legacy-peer-deps
```

### Step 3: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local
```

Now edit `.env.local` with your actual values (see [Environment Variables](#environment-variables) section).

### Step 4: Set Up MongoDB

#### Option A: MongoDB Atlas (Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Click "Connect" > "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Add to `.env.local`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smaksly?retryWrites=true&w=majority
   ```

#### Option B: Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service
3. Add to `.env.local`:
   ```
   MONGODB_URI=mongodb://localhost:27017/smaksly
   ```

### Step 5: Create Admin User

After setting up the database, create an admin user by running:

```bash
# Start the development server first
npm run dev

# In another terminal, create admin user via API
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@smaksly.com", "password": "Admin@123456"}'
```

Then update the user role to admin in MongoDB:
```javascript
// In MongoDB shell or Atlas
db.users.updateOne(
  { email: "admin@smaksly.com" },
  { $set: { role: "admin" } }
)
```

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# ============================================
# DATABASE (Required)
# ============================================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smaksly?retryWrites=true&w=majority

# ============================================
# AUTHENTICATION (Required)
# ============================================
BETTER_AUTH_SECRET=your_32_character_secret_key_here
BETTER_AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters

# ============================================
# GITHUB (Required for deployments)
# ============================================
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_USERNAME=your_github_username

# ============================================
# VERCEL (Required for deployments)
# ============================================
VERCELTOKEN=your_vercel_api_token
VERCEL_TEAM_ID=your_team_id_optional

# ============================================
# CLOUDINARY (Required for image uploads)
# ============================================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ============================================
# OPENAI (Required for AI content)
# ============================================
OPENAI_API_KEY=sk-your_openai_api_key

# ============================================
# PEXELS (Optional - for stock images)
# ============================================
PEXELS_API_KEY=your_pexels_api_key

# ============================================
# REDIS (Optional - for caching)
# ============================================
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
REDIS_URL=redis://default:password@your-instance.upstash.io:6379

# ============================================
# MEILISEARCH (Optional - for search)
# ============================================
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_meilisearch_master_key

# ============================================
# STRIPE (Optional - for payments)
# ============================================
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# ============================================
# RESEND (Optional - for emails)
# ============================================
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Smaksly

# ============================================
# APPLICATION
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Smaksly
ADMIN_EMAIL=admin@yourdomain.com

# ============================================
# FEATURE FLAGS
# ============================================
ENABLE_AI_CONTENT=true
ENABLE_GUEST_POSTS=true
ENABLE_PARTNER_PORTAL=true
```

### Getting API Keys

| Service | How to Get |
|---------|------------|
| MongoDB | [MongoDB Atlas](https://www.mongodb.com/atlas) - Free tier available |
| OpenAI | [OpenAI Platform](https://platform.openai.com/api-keys) |
| Cloudinary | [Cloudinary Console](https://cloudinary.com/console) - Free tier available |
| GitHub Token | [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens) |
| Vercel Token | [Vercel Settings > Tokens](https://vercel.com/account/tokens) |
| Stripe | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| Resend | [Resend Dashboard](https://resend.com/api-keys) |
| Pexels | [Pexels API](https://www.pexels.com/api/) |
| Upstash Redis | [Upstash Console](https://console.upstash.com/) |

## Running Locally

### Development Mode

```bash
# Start the development server
npm run dev
```

The application will be available at:
- **Main App:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin/dashboard
- **Partner Portal:** http://localhost:3000/partner/login
- **Admin Login:** http://localhost:3000/login

### Production Build

```bash
# Create production build
npm run build

# Start production server
npm start
```

### Running with Docker

```bash
# Build the Docker image
docker build -t smaksly .

# Run the container
docker run -p 3000:8080 --env-file .env.local smaksly
```

## Project Structure

```
smaksly/
├── app/
│   ├── admin/                 # Admin panel pages
│   │   ├── dashboard/         # Admin dashboard
│   │   ├── websites/          # Website management
│   │   ├── keywords/          # Keyword tracking
│   │   ├── content/           # Content management
│   │   ├── guest-posts/       # Guest post management
│   │   ├── commissions/       # Commission tracking
│   │   ├── templates/         # Blog templates
│   │   ├── themes/            # Page builder
│   │   ├── settings/          # Admin settings
│   │   └── layout.tsx         # Admin layout with sidebar
│   ├── partner/               # Partner portal pages
│   │   ├── dashboard/         # Partner dashboard
│   │   ├── marketplace/       # Guest post marketplace
│   │   ├── orders/            # Partner orders
│   │   ├── login/             # Partner login
│   │   ├── register/          # Partner registration
│   │   └── layout.tsx         # Partner layout
│   ├── api/                   # API routes
│   │   ├── auth/              # Authentication APIs
│   │   ├── websites/          # Website CRUD APIs
│   │   ├── keywords/          # Keyword APIs
│   │   ├── content/           # Content APIs
│   │   ├── guest-posts/       # Guest post APIs
│   │   ├── commissions/       # Commission APIs
│   │   ├── partner/           # Partner APIs
│   │   └── health/            # Health check endpoint
│   ├── login/                 # Admin login page
│   ├── signup/                # Admin signup page
│   └── layout.tsx             # Root layout
├── components/                # Shared components
├── lib/                       # Utility functions
│   ├── db.ts                  # Database connection
│   ├── security.ts            # Security utilities
│   ├── stripe.ts              # Stripe integration
│   └── resend.ts              # Email integration
├── models/                    # Mongoose models
│   ├── User.ts
│   ├── Website.ts
│   ├── Keyword.ts
│   ├── Content.ts
│   ├── GuestPost.ts
│   ├── Commission.ts
│   ├── Partner.ts
│   └── Order.ts
├── stores/                    # State management
├── types/                     # TypeScript types
├── public/                    # Static assets
├── .env.example               # Environment template
├── Dockerfile                 # Docker configuration
├── cloudbuild.yaml            # GCP Cloud Build config
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS config
└── package.json               # Dependencies
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/signup` | Admin signup |
| POST | `/api/partner/auth/login` | Partner login |
| POST | `/api/partner/auth/register` | Partner registration |
| GET | `/api/partner/auth/me` | Get partner session |

### Websites
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/websites` | List all websites |
| POST | `/api/websites` | Create website |
| GET | `/api/websites/[id]` | Get website by ID |
| PUT | `/api/websites/[id]` | Update website |
| DELETE | `/api/websites/[id]` | Delete website |

### Keywords
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/keywords` | List all keywords |
| POST | `/api/keywords` | Create keyword |
| PUT | `/api/keywords/[id]` | Update keyword |
| DELETE | `/api/keywords/[id]` | Delete keyword |

### Guest Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guest-posts` | List guest posts |
| POST | `/api/guest-posts` | Create guest post |
| PUT | `/api/guest-posts/[id]` | Update guest post |
| DELETE | `/api/guest-posts/[id]` | Delete guest post |

### Commissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/commissions` | List commissions |
| POST | `/api/commissions` | Create commission |
| PUT | `/api/commissions/[id]` | Update commission |

### Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content` | List content |
| POST | `/api/content` | Create content |
| POST | `/api/content/generate` | Generate AI content |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check for deployments |

## Deployment

### GCP Cloud Run

1. Install Google Cloud SDK
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project YOUR_PROJECT_ID`
4. Deploy:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`

### Docker

```bash
# Build
docker build -t smaksly .

# Run
docker run -p 8080:8080 \
  -e MONGODB_URI=your_mongodb_uri \
  -e JWT_SECRET=your_jwt_secret \
  smaksly
```

## Default Credentials

After setup, use these credentials to login:

### Admin Panel (`/login`)
- **Email:** admin@smaksly.com
- **Password:** Admin@123456

### Partner Portal (`/partner/login`)
- Create a new account at `/partner/register`

## Troubleshooting

### Common Issues

**1. MongoDB Connection Failed**
```
Error: MongoServerSelectionError
```
- Check if MongoDB URI is correct
- Ensure IP is whitelisted in MongoDB Atlas
- Verify network connectivity

**2. Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**3. Module Not Found**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

**4. Environment Variables Not Loading**
- Ensure `.env.local` exists in root directory
- Restart the development server after changes
- Check for typos in variable names

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support, email support@smaksly.com or open an issue on GitHub.
