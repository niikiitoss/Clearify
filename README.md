# 🎭 ELIX - Explain Like I'm X

A full-featured SaaS platform that transforms complex text into explanations tailored for specific audiences using AI. Complete with user authentication, usage tracking, subscription management, and payment processing.

## ✨ Features

### 🔐 User Authentication
- **Sign Up/Login System**: Email and password authentication via Supabase
- **User Profiles**: Personalized experience with user names and avatars
- **Session Management**: Secure authentication state management
- **Password Security**: Minimum 6-character requirements

### 💡 Free Tier
- **5 Daily Rewrites**: Perfect for trying out the service
- **Usage Tracking**: Real-time counter showing remaining rewrites
- **Daily Reset**: Fresh 5 rewrites every 24 hours
- **All Personas Available**: Access to all rewriting styles

### 💳 Pro Subscription ($3/month)
- **Unlimited Rewrites**: No daily limits
- **Pro Badge**: Visual indicator of premium status
- **Priority Support**: Enhanced customer service
- **Stripe Integration**: Secure payment processing
- **Billing Management**: Self-service subscription management

### 🎯 Core Functionality
- **Text Input**: Large textarea with 700-word limit and real-time counter
- **Persona Selection**: Choose from 8+ predefined personas or create custom ones:
  - 👶 A 5-year-old
  - 🌿 Someone high
  - 🌶️ Your zesty friend
  - 💼 A rushed CEO
  - 🎮 A gamer
  - 🎌 An anime fan
  - ➗ Someone who hates math
  - 🐱 Someone who loves cats
  - ✨ Custom persona (your choice!)
- **AI-Powered Rewriting**: Uses OpenAI's GPT-3.5-turbo with enhanced creativity
- **Smart Validation**: Word count limits, authentication checks, usage limits
- **Result Management**: Show/hide original, copy to clipboard, comparison view

### 🎨 User Experience
- **Dark/Light Mode**: Toggle between themes with system preference detection
- **Responsive Design**: Perfect on desktop, tablet, and mobile
- **Modern UI**: Clean interface with Tailwind CSS and smooth animations
- **Keyboard Shortcuts**: Ctrl/Cmd + Enter to rewrite, Escape to close modals
- **Real-time Feedback**: Loading states, notifications, error handling

## 🚀 Quick Start

### For Users
1. Visit the deployed ELIX website
2. Sign up for a free account (5 rewrites/day)
3. Start explaining anything to anyone!
4. Upgrade to Pro for unlimited access

### For Developers
1. Clone this repository
2. Install dependencies: `pip install -r requirements.txt`
3. Follow the [SETUP.md](SETUP.md) guide for complete configuration
4. Run locally: `python server.py`
5. Deploy to Vercel or Netlify

## 🛠️ Technical Architecture

### Frontend Stack
- **HTML5** - Semantic structure
- **Tailwind CSS** - Utility-first styling
- **Vanilla JavaScript** - No framework dependencies
- **Font Awesome** - Icon library
- **Inter Font** - Modern typography

### Backend Services
- **Supabase** - Authentication, database, real-time features
- **Stripe** - Payment processing and subscription management
- **OpenAI API** - AI text transformation
- **Vercel/Netlify** - Static hosting and serverless functions

### Database Schema
```sql
user_profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,
    pro_user BOOLEAN DEFAULT FALSE,
    rewrite_count INTEGER DEFAULT 0,
    last_used DATE DEFAULT CURRENT_DATE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### API Configuration
- **Model**: GPT-3.5-turbo (cost-effective)
- **Max Tokens**: 1000 (detailed responses)
- **Temperature**: 1.0 (high creativity)
- **Word Limit**: 700 words per request

## 🔒 Security & Privacy

### Data Protection
- **Row Level Security (RLS)**: Users can only access their own data
- **Secure Authentication**: Supabase handles password hashing and sessions
- **API Key Protection**: Server-side OpenAI API calls (in production)
- **Payment Security**: PCI-compliant Stripe integration

### Privacy
- **No Data Storage**: Text content is not permanently stored
- **Minimal Data Collection**: Only email and usage statistics
- **GDPR Compliant**: Users can delete their accounts and data
- **Transparent Processing**: Clear privacy policy and terms

## 📊 Business Model

### Freemium Strategy
- **Free Tier**: 5 rewrites/day to attract users
- **Pro Tier**: $3/month for unlimited access
- **Low Friction**: Easy upgrade path with Stripe Checkout
- **Value Proposition**: Clear benefits for power users

### Revenue Streams
- **Subscriptions**: Primary revenue from Pro users
- **Usage-Based**: Potential future enterprise tiers
- **API Costs**: Managed through usage limits and pricing

## 🚀 Deployment

### Production Setup
1. **Configure Services**: Supabase, Stripe, OpenAI
2. **Set Environment Variables**: Secure key management
3. **Deploy Frontend**: Vercel or Netlify
4. **Set Up Webhooks**: Stripe subscription events
5. **Test Everything**: Authentication, payments, functionality

### Scaling Considerations
- **Database Performance**: Indexed queries, connection pooling
- **API Rate Limits**: OpenAI usage monitoring and limits
- **CDN**: Static asset delivery optimization
- **Monitoring**: Error tracking, performance metrics

## 💡 Use Cases

### Education
- **Teachers**: Explain complex topics to different grade levels
- **Students**: Understand difficult concepts in their language
- **Tutors**: Adapt explanations to learning styles

### Business
- **Technical Writers**: Create documentation for different audiences
- **Managers**: Communicate complex ideas to various stakeholders
- **Sales Teams**: Explain products to different customer types

### Content Creation
- **Bloggers**: Adapt content for different reader demographics
- **Social Media**: Create platform-specific content
- **Marketing**: Tailor messaging for target audiences

### Personal
- **Learning**: Understand complex topics in simple terms
- **Communication**: Explain ideas to family and friends
- **Accessibility**: Make content more inclusive

## 📈 Analytics & Metrics

### User Metrics
- **Daily Active Users (DAU)**
- **Monthly Active Users (MAU)**
- **Conversion Rate** (Free to Pro)
- **Churn Rate**
- **Usage Patterns**

### Business Metrics
- **Monthly Recurring Revenue (MRR)**
- **Customer Acquisition Cost (CAC)**
- **Lifetime Value (LTV)**
- **API Costs per User**
- **Support Ticket Volume**

## 🔮 Future Roadmap

### Short Term (1-3 months)
- **Email Notifications**: Welcome emails, usage alerts
- **Usage Analytics**: Personal usage dashboards
- **More Personas**: Community-suggested personas
- **Mobile App**: React Native or PWA

### Medium Term (3-6 months)
- **Team Plans**: Collaborative features for organizations
- **API Access**: Developer API for integrations
- **Chrome Extension**: Browser-based text rewriting
- **Voice Input**: Speech-to-text integration

### Long Term (6+ months)
- **Multi-language Support**: International expansion
- **Advanced AI Models**: GPT-4, specialized models
- **Enterprise Features**: SSO, admin dashboards
- **White-label Solutions**: B2B licensing

## 📄 Documentation

- **[SETUP.md](SETUP.md)** - Complete setup and deployment guide
- **[API Documentation](docs/api.md)** - API endpoints and usage
- **[Database Schema](docs/schema.md)** - Database structure and relationships
- **[Deployment Guide](docs/deployment.md)** - Production deployment steps

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Follow SETUP.md for local development
3. Create a feature branch
4. Submit a pull request

## 📞 Support

- **Documentation**: Check SETUP.md and docs/
- **Issues**: GitHub Issues for bugs and features
- **Email**: support@elix.app (when deployed)
- **Community**: Discord server for discussions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**ELIX** - Making complex ideas accessible to everyone, one explanation at a time. 🎭✨

Built with ❤️ for better communication across all audiences.
#   C l e a r i f y  
 