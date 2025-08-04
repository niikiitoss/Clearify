# 🎭 ELIX Setup Guide

Complete setup instructions for the ELIX (Explain Like I'm X) platform with authentication, usage tracking, and subscription management.

## 📋 Prerequisites

- Modern web browser
- Supabase account (free tier available)
- Stripe account (for payments)
- OpenAI API key

## 🚀 Quick Start

1. **Clone/Download the project**
2. **Install dependencies**: `pip install -r requirements.txt`
3. **Configure services** (see detailed steps below)
4. **Set up database** (Supabase)
5. **Run locally**: `python server.py`
6. **Deploy** (Vercel/Netlify)

## 🔧 Detailed Setup

### 1. Supabase Setup

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new account or sign in
3. Click "New Project"
4. Choose organization and fill project details
5. Wait for project to be ready (~2 minutes)

#### Get Supabase Credentials
1. Go to Project Settings → API
2. Copy your `Project URL`
3. Copy your `anon/public` key

#### Configure Google OAuth (Optional but Recommended)
1. Go to Project Settings → Authentication → Providers
2. Enable Google provider
3. Go to [Google Cloud Console](https://console.cloud.google.com/)
4. Create a new project or select existing one
5. Enable Google+ API
6. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
7. Set Application type to "Web application"
8. Add Authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/v1/callback` (for local development)
9. Copy Client ID and Client Secret
10. Back in Supabase, paste the Google Client ID and Client Secret
11. Save the configuration

#### Create Database Table
Run this SQL in the Supabase SQL Editor:

```sql
-- Create user_profiles table
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    pro_user BOOLEAN DEFAULT FALSE,
    rewrite_count INTEGER DEFAULT 0,
    last_used DATE DEFAULT CURRENT_DATE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
```

### 2. Stripe Setup

#### Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Create account or sign in
3. Complete account setup

#### Create Product and Price
1. Go to Stripe Dashboard → Products
2. Click "Add Product"
3. Name: "ELIX Pro"
4. Description: "Unlimited AI text rewrites"
5. Add Price:
   - Type: Recurring
   - Amount: $3.00
   - Billing period: Monthly
6. Save and copy the Price ID (starts with `price_`)

#### Get Stripe Keys
1. Go to Developers → API Keys
2. Copy your `Publishable key` (starts with `pk_`)
3. Copy your `Secret key` (starts with `sk_`) - Keep this secure!

#### Set up Webhooks (Optional but recommended)
1. Go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe-webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 3. Configuration

#### Update config.js
Replace the placeholder values in `config.js`:

```javascript
const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE',
    
    // Stripe Configuration
    STRIPE_PUBLISHABLE_KEY: 'YOUR_STRIPE_PUBLISHABLE_KEY_HERE',
    STRIPE_PRICE_ID: 'YOUR_STRIPE_PRICE_ID_HERE',
    
    // OpenAI Configuration
    OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY_HERE',
    
    // App Configuration
    FREE_DAILY_LIMIT: 5,
    WORD_LIMIT: 700
};
```

### 4. Local Development Server

#### Flask Server Setup
The project includes a production-ready Flask server for local development:

**Features:**
- ✅ Multi-threaded request handling
- ✅ Proper static file serving with caching
- ✅ Comprehensive error handling
- ✅ Request/response logging with timing
- ✅ Google OAuth compatibility
- ✅ API endpoints ready for expansion

**Installation:**
```bash
# Install Flask dependency
pip install -r requirements.txt

# Start the server
python server.py
```

**Server Features:**
- **Auto-browser opening**: Automatically opens http://localhost:8000
- **Request logging**: Detailed logs with timing information
- **Error handling**: Graceful error responses with proper HTTP status codes
- **Static file caching**: Optimized caching headers for CSS/JS/images
- **API endpoints**: Health check at `/api/health` and expansion-ready routes
- **CORS support**: Proper headers for API requests

**Available Endpoints:**
- `GET /` - Main application
- `GET /<filename>` - Static files (CSS, JS, images)
- `GET /api/health` - Health check endpoint
- `POST /api/explain` - Future AI processing endpoint
- `GET /login` - OAuth login compatibility
- `GET /auth/callback` - OAuth callback handling

**Logs Example:**
```
🚀 ELIX Production Server Starting...
📍 Server URL: http://localhost:8000
🔧 Environment: Development
📁 Serving files from: /path/to/project
🔑 Google OAuth: http://localhost:8000 (add to redirect URIs)
💡 Health Check: http://localhost:8000/api/health

21:21:22 - INFO - → GET / from 127.0.0.1
21:21:22 - INFO - ← ✅ 200 GET / - 65ms
```

### 5. Backend Setup (Optional - for production)

For a production deployment, you'll want to create backend endpoints:

#### Stripe Checkout Session
Create an endpoint to create Stripe checkout sessions:

```javascript
// /api/create-checkout-session
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { userId, email } = req.body;
            
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: `${req.headers.origin}/?success=true`,
                cancel_url: `${req.headers.origin}/?canceled=true`,
                customer_email: email,
                metadata: {
                    userId: userId
                }
            });
            
            res.json({ sessionId: session.id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
```

#### Stripe Webhook Handler
```javascript
// /api/stripe-webhook
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            return res.status(400).send(`Webhook signature verification failed.`);
        }

        // Handle the event
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                const subscription = event.data.object;
                await updateUserSubscription(subscription, true);
                break;
                
            case 'customer.subscription.deleted':
                const deletedSub = event.data.object;
                await updateUserSubscription(deletedSub, false);
                break;
        }

        res.json({ received: true });
    }
}

async function updateUserSubscription(subscription, isActive) {
    const { error } = await supabase
        .from('user_profiles')
        .update({
            pro_user: isActive,
            stripe_customer_id: subscription.customer,
            stripe_subscription_id: subscription.id
        })
        .eq('stripe_customer_id', subscription.customer);
        
    if (error) {
        console.error('Error updating subscription:', error);
    }
}
```

### 5. Deployment

#### Vercel Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts
4. Set environment variables in Vercel dashboard:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`

#### Netlify Deployment
1. Connect your GitHub repo to Netlify
2. Set build command: (leave empty for static site)
3. Set publish directory: `/` (root)
4. Add environment variables in Netlify dashboard

### 6. Testing

#### Test Authentication
1. Open your deployed site
2. Click "Sign Up"
3. Create a test account
4. Verify you can log in/out

#### Test Usage Tracking
1. Log in with test account
2. Try rewriting text
3. Check usage counter updates
4. Test daily limit (use 5 rewrites)

#### Test Subscription (Test Mode)
1. Click "Upgrade to Pro"
2. Use Stripe test card: `4242 4242 4242 4242`
3. Complete checkout
4. Verify Pro badge appears
5. Test unlimited usage

## 🔒 Security Considerations

### Environment Variables
Never commit sensitive keys to version control:
- Use `.env.local` for local development
- Set environment variables in your deployment platform
- Use different keys for development/production

### Database Security
- Row Level Security (RLS) is enabled
- Users can only access their own data
- Use Supabase service key only in backend functions

### API Keys
- OpenAI API key should be server-side only in production
- Stripe secret key must never be exposed to frontend
- Use webhook signatures to verify Stripe events

## 📊 Monitoring

### Supabase Dashboard
- Monitor database usage
- Check authentication metrics
- View API usage

### Stripe Dashboard
- Track subscription metrics
- Monitor payment success rates
- Handle customer support

### Application Monitoring
- Set up error tracking (Sentry, LogRocket)
- Monitor API usage and costs
- Track user engagement metrics

## 🐛 Troubleshooting

### Common Issues

**"Supabase configuration missing"**
- Check config.js has correct URL and key
- Verify Supabase project is active

**"Invalid API key" (OpenAI)**
- Check OpenAI API key is valid
- Verify you have credits available

**Stripe checkout not working**
- Ensure Stripe keys are correct
- Check browser console for errors
- Verify price ID exists

**Database errors**
- Check RLS policies are set up
- Verify table exists with correct schema
- Check user permissions

### Getting Help

1. Check browser console for errors
2. Review Supabase logs
3. Check Stripe webhook logs
4. Verify all configuration values

## 🚀 Going Live

### Production Checklist

- [ ] Switch to Stripe live mode
- [ ] Update Stripe webhook endpoint
- [ ] Use production Supabase project
- [ ] Set up proper domain
- [ ] Configure SSL certificate
- [ ] Set up monitoring and alerts
- [ ] Test all functionality end-to-end
- [ ] Set up customer support system

### Scaling Considerations

- Monitor OpenAI API usage and costs
- Consider implementing rate limiting
- Set up database backups
- Plan for increased server costs
- Consider CDN for static assets

---

## 📞 Support

If you need help with setup:
1. Check this documentation first
2. Review service provider docs (Supabase, Stripe)
3. Check browser console for errors
4. Verify all configuration values

Your ELIX platform is now ready to help users explain anything to anyone! 🎉
