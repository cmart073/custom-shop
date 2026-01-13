# CMart073 - Custom Paint Fill & Grips

Golf club cosmetic customization service built with Astro and Cloudflare.

## Features

- **Paint Fill Services**: Iron and putter paint fill with single or multi-color options
- **Grip Installation**: Customer-supplied or supply-and-install options
- **Photo Uploads**: 2-10 images per order stored in Cloudflare R2
- **Order Management**: Admin dashboard for order tracking and updates
- **Email Notifications**: Customer confirmation and admin alerts via SendGrid
- **Spam Protection**: Cloudflare Turnstile integration

## Tech Stack

- **Framework**: Astro 5.0
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1
- **Storage**: Cloudflare R2
- **Email**: SendGrid
- **Spam Protection**: Cloudflare Turnstile
- **Admin Auth**: Cloudflare Access

## Project Structure

```
cmart073/
├── functions/
│   └── api/
│       ├── uploads.ts          # File upload endpoint
│       ├── orders.ts           # Order creation endpoint
│       ├── orders/
│       │   ├── [shortId].ts    # Order lookup by short ID
│       │   └── [id]/
│       │       └── update.ts   # Admin order updates
│       └── images/
│           └── [...path].ts    # R2 image serving
├── migrations/
│   └── 0001_init.sql           # D1 database schema
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   ├── Layout.astro        # Public site layout
│   │   └── AdminLayout.astro   # Admin dashboard layout
│   ├── lib/
│   │   ├── database.ts         # D1 query utilities
│   │   ├── email.ts            # SendGrid integration
│   │   ├── pricing.ts          # Pricing calculation logic
│   │   └── validation.ts       # Form validation utilities
│   ├── pages/
│   │   ├── customization/
│   │   │   ├── index.astro     # Landing page
│   │   │   ├── pricing.astro   # Pricing breakdown
│   │   │   ├── how-it-works.astro
│   │   │   ├── faq.astro
│   │   │   └── order/
│   │   │       ├── index.astro # Order form
│   │   │       └── success.astro
│   │   └── admin/
│   │       ├── index.astro     # Dashboard
│   │       └── orders/
│   │           ├── index.astro # Orders list
│   │           └── [id].astro  # Order detail
│   └── styles/
│       └── global.css
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── wrangler.toml
```

## Deployment

### Prerequisites

1. Cloudflare account with Pages enabled
2. SendGrid account with API key
3. Domain configured in Cloudflare (optional but recommended)

### Step 1: Create Cloudflare Resources

#### D1 Database

1. Go to Cloudflare Dashboard → Workers & Pages → D1
2. Click "Create database"
3. Name it `cmart073-db`
4. After creation, go to the database and click "Console"
5. Run the SQL from `migrations/0001_init.sql`

#### R2 Bucket

1. Go to Cloudflare Dashboard → R2 Object Storage
2. Click "Create bucket"
3. Name it `cmart073-uploads`
4. Leave default settings

#### Turnstile Widget

1. Go to Cloudflare Dashboard → Turnstile
2. Click "Add widget"
3. Add your domain (or localhost for testing)
4. Copy the **Site Key** (for frontend) and **Secret Key** (for backend)

### Step 2: Configure Secrets

In Cloudflare Dashboard → Workers & Pages → Your Pages Project → Settings → Environment variables:

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | Your SendGrid API key |
| `ADMIN_EMAIL` | Email to receive admin notifications |
| `FROM_EMAIL` | Sender email (must be verified in SendGrid) |
| `SHIP_TO_ADDRESS` | Your shipping address for customers |
| `TURNSTILE_SECRET_KEY` | Turnstile secret key |
| `SITE_URL` | Your site URL (e.g., https://cmart073.com) |

**Note**: Add these as "Encrypted" secrets for production.

### Step 3: Update Turnstile Site Key

Edit `src/pages/customization/order/index.astro` and update the Turnstile data-sitekey:

```html
<div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY_HERE"></div>
```

### Step 4: Deploy to Cloudflare Pages

#### Option A: Git Integration (Recommended)

1. Push code to GitHub/GitLab
2. Go to Cloudflare Dashboard → Workers & Pages
3. Click "Create application" → "Pages"
4. Connect your repository
5. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`

#### Option B: Direct Upload

```bash
npm install
npm run build
npx wrangler pages deploy dist
```

### Step 5: Bind D1 and R2

After deployment:

1. Go to your Pages project → Settings → Functions
2. Under "D1 database bindings":
   - Variable name: `DB`
   - Database: Select `cmart073-db`
3. Under "R2 bucket bindings":
   - Variable name: `R2`
   - Bucket: Select `cmart073-uploads`
4. Click "Save"

### Step 6: Set Up Cloudflare Access (Admin Protection)

1. Go to Cloudflare Dashboard → Zero Trust → Access → Applications
2. Click "Add an application" → "Self-hosted"
3. Configure:
   - Application name: `CMart073 Admin`
   - Subdomain: Your site subdomain
   - Path: `/admin*`
4. Create an access policy (e.g., email-based authentication)
5. Save

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Local Environment Variables

Create a `.dev.vars` file (not committed):

```
SENDGRID_API_KEY=your_sendgrid_api_key
ADMIN_EMAIL=admin@example.com
FROM_EMAIL=noreply@example.com
SHIP_TO_ADDRESS=123 Main St, City, ST 12345
TURNSTILE_SECRET_KEY=your_turnstile_secret
SITE_URL=http://localhost:4321
```

For local D1 and R2, use wrangler's local mode:

```bash
npx wrangler d1 execute cmart073-db --local --file=migrations/0001_init.sql
```

## Pricing Logic

| Service | Price |
|---------|-------|
| Iron paint fill (7-9 clubs) | $85 |
| Iron paint fill (4-6 clubs) | $65 |
| Single club touch-up | $40 |
| Putter paint fill | $55 |
| Multi-color add-on (irons) | +$20 |
| Multi-color add-on (putter) | +$15 |
| Strip old paint & redo | +$25 |
| Install customer grips | $5/grip |
| Supply & install grips | $7/grip + grip cost |
| Return shipping | ~$15-25 |

## Order Flow

1. Customer submits order form with photos
2. Files uploaded to R2, order saved to D1
3. Customer receives confirmation email with ship-to address
4. Admin receives notification email
5. Customer ships clubs to CMart073
6. Admin updates order status as work progresses
7. Completed clubs shipped back to customer

## Order Statuses

- `pending` - Order submitted, awaiting clubs
- `received` - Clubs received at shop
- `in_progress` - Work underway
- `completed` - Work finished, ready to ship
- `shipped` - Returned to customer
- `cancelled` - Order cancelled

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/uploads` | Upload photos (multipart) |
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/[shortId]` | Get order by short ID |
| POST | `/api/orders/[id]/update` | Update order (admin) |
| GET | `/api/images/[...path]` | Serve R2 images |

## Support

For issues or questions, contact the development team.

---

Built with ❤️ for golfers who care about the details.
