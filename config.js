// Configuration file for ELIX
// Uses environment variables for security

const CONFIG = {
    // Supabase Configuration - Use environment variables or fallback to placeholders
    SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL || 
                  process.env?.VITE_SUPABASE_URL || 
                  window?.ENV?.VITE_SUPABASE_URL ||
                  'YOUR_SUPABASE_URL_HERE',
                  
    SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY || 
                       process.env?.VITE_SUPABASE_ANON_KEY || 
                       window?.ENV?.VITE_SUPABASE_ANON_KEY ||
                       'YOUR_SUPABASE_ANON_KEY_HERE',
    
    // Stripe Configuration - Use environment variables or fallback to placeholders
    STRIPE_PUBLISHABLE_KEY: import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY || 
                           process.env?.VITE_STRIPE_PUBLISHABLE_KEY || 
                           window?.ENV?.VITE_STRIPE_PUBLISHABLE_KEY ||
                           'YOUR_STRIPE_PUBLISHABLE_KEY_HERE',
                           
    STRIPE_PRICE_ID: import.meta.env?.VITE_STRIPE_PRICE_ID || 
                     process.env?.VITE_STRIPE_PRICE_ID || 
                     window?.ENV?.VITE_STRIPE_PRICE_ID ||
                     'YOUR_STRIPE_PRICE_ID_HERE',
    
    // OpenAI Configuration - Now handled by serverless function
    // No API key needed on client-side for security
    
    // App Configuration
    FREE_DAILY_LIMIT: 5,
    WORD_LIMIT: 700
};

// Validate configuration
function validateConfig() {
    const requiredKeys = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY', 
        'STRIPE_PUBLISHABLE_KEY',
        'STRIPE_PRICE_ID'
    ];
    
    const missingKeys = requiredKeys.filter(key => 
        !CONFIG[key] || CONFIG[key].startsWith('YOUR_')
    );
    
    if (missingKeys.length > 0) {
        console.warn('⚠️ Missing configuration keys:', missingKeys);
        console.warn('Please set environment variables or update config.js');
        return false;
    }
    
    console.log('✅ Configuration validated successfully');
    console.log('🔒 OpenAI API key is securely handled by serverless function');
    return true;
}

// Make CONFIG available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.validateConfig = validateConfig;
    
    // Auto-validate on load
    document.addEventListener('DOMContentLoaded', () => {
        validateConfig();
    });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
