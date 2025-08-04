# 🚀 Static Deployment Guide

This guide shows how to deploy ELIX as a static website on Netlify or Vercel with Supabase and Stripe integration.

## ✅ Prerequisites

- Supabase account and project
- Stripe account with products configured
- OpenAI API key
- Netlify or Vercel account

## 🔧 Configuration Steps

### 1. Environment Variables Setup

**Option A: Using Environment Variables (Recommended)**

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your actual API keys:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-supabase-anon-key

# Stripe Configuration  
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-actual-stripe-key
VITE_STRIPE_PRICE_ID=price_your-actual-price-id

# OpenAI Configuration (Server-side only)
OPENAI_API_KEY=sk-your-actual-openai-key
```

**Option B: Direct config.js Update (Less Secure)**

If not using environment variables, update `config.js` directly:
```javascript
// Replace the placeholder values in config.js
SUPABASE_URL: 'https://your-project.supabase.co',
SUPABASE_ANON_KEY: 'your-supabase-anon-key',
STRIPE_PUBLISHABLE_KEY: 'pk_test_your-stripe-key',
STRIPE_PRICE_ID: 'price_your-price-id',
// Note: OpenAI API key is now handled securely by serverless function
```

### 2. Supabase Setup

#### Database Schema
Run this SQL in your Supabase SQL Editor:

```sql
-- Create user_profiles table
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    is_pro BOOLEAN DEFAULT FALSE,
    free_rewrites_today INTEGER DEFAULT 0,
    last_reset DATE DEFAULT CURRENT_DATE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);
```

#### Google OAuth Setup
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add your domain to redirect URLs:
   - `https://yourdomain.com` (production)
   - `http://localhost:3000` (development)

### 3. Stripe Setup

#### Create Products
1. Go to Stripe Dashboard → Products
2. Create "ELIX Pro" product
3. Add price: $3.00/month recurring
4. Copy the Price ID (starts with `price_`)

#### Configure Webhooks (Optional)
For production, set up webhooks to handle subscription events:
- Endpoint: `https://yourdomain.com/webhook` (if using serverless functions)
- Events: `customer.subscription.*`, `invoice.payment_*`

### 4. Deploy to Netlify

#### Option A: Git Integration
1. Push your code to GitHub/GitLab
2. Connect repository to Netlify
3. Build settings:
   - Build command: (leave empty)
   - Publish directory: `/`

#### Option B: Manual Deploy
1. Zip your project files (exclude Python files)
2. Drag and drop to Netlify dashboard

#### Environment Variables Setup
Set these environment variables in Netlify dashboard:

**Go to Site Settings → Environment Variables:**
```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-supabase-anon-key
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_your-stripe-key
VITE_STRIPE_PRICE_ID = price_your-price-id
OPENAI_API_KEY = sk-your-openai-key
```

**Build Settings:**
- Build command: `echo "Static site - no build needed"`
- Publish directory: `/`
- Functions directory: `api` (for serverless functions)

### 5. Deploy to Vercel

#### Option A: Git Integration
1. Push your code to GitHub/GitLab
2. Import project to Vercel
3. Build settings:
   - Framework: Other
   - Build command: (leave empty)
   - Output directory: `/`

#### Environment Variables Setup
Set these environment variables in Vercel dashboard:

**Go to Project Settings → Environment Variables:**
```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-supabase-anon-key
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_your-stripe-key
VITE_STRIPE_PRICE_ID = price_your-price-id
OPENAI_API_KEY = sk-your-openai-key
```

**Build Settings:**
- Framework Preset: Other
- Build Command: (leave empty)
- Output Directory: `/`
- Install Command: (leave empty)

#### Option B: Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

**Set environment variables via CLI:**
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_STRIPE_PUBLISHABLE_KEY
vercel env add VITE_STRIPE_PRICE_ID
vercel env add OPENAI_API_KEY
```

## 🔒 Security Considerations

### Client-Side API Keys
Since this is a static site, API keys are exposed to clients. For production:

1. **OpenAI API Key**: Consider moving to serverless functions
2. **Supabase**: Use Row Level Security (already configured)
3. **Stripe**: Publishable key is safe for client-side use

### Recommended Architecture for Production
```
Frontend (Static) → Supabase (Auth/DB) → Serverless Functions (OpenAI)
                 ↘ Stripe (Payments)
```

## 📁 Files to Deploy

Include these files in your deployment:
```
├── index.html
├── script.js
├── config.js
├── database-setup.sql (for reference)
└── DEPLOY.md (this file)
```

Exclude these Python files:
```
├── server.py (not needed)
├── requirements.txt (not needed)
├── setup_stripe.py (not needed)
├── test_stripe.py (not needed)
├── debug_stripe.py (not needed)
├── stripe_config.py (not needed)
```

## 🧪 Testing

### Local Testing
1. Use a local server: `python -m http.server 8000`
2. Or use Live Server extension in VS Code
3. Test all functionality before deploying

### Production Testing
1. Test Google OAuth with your domain
2. Test Stripe checkout with test cards
3. Verify Supabase database operations
4. Check all API integrations

## 🔧 Troubleshooting

### Common Issues

**Google OAuth not working:**
- Check redirect URLs in Supabase
- Ensure domain matches exactly

**Stripe checkout fails:**
- Verify publishable key is correct
- Check price ID exists in your Stripe account

**Database errors:**
- Verify RLS policies are set up
- Check Supabase URL and anon key

**OpenAI API errors:**
- Verify API key is valid
- Check you have credits available

## 🚀 Going Live

### Pre-Launch Checklist
- [ ] All API keys configured
- [ ] Database schema deployed
- [ ] Google OAuth configured for production domain
- [ ] Stripe products and prices created
- [ ] Test all user flows end-to-end
- [ ] Set up monitoring and error tracking

### Post-Launch
- Monitor API usage and costs
- Set up alerts for errors
- Consider implementing rate limiting
- Plan for scaling if needed

---

Your ELIX website is now ready for static deployment! 🎉
