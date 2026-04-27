## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- A [Cloudflare](https://cloudflare.com) account with Browser Rendering API access (for the data pipeline)

### 1. Clone & Configure

```bash
git clone https://github.com/your-username/Summoners_Fantasy.git
cd Summoners_Fantasy
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your Supabase credentials
```

**Required environment variables** (see `backend/.env.example`):

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional — for the gol.gg pipeline
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Add your Supabase anon key and project URL
```

### 4. Database Migrations

```bash
# Apply all migrations to your Supabase project
supabase db push
```

### 5. Run Everything

```bash
# From the project root — starts both services in parallel
./scripts/dev.sh
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |