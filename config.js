// Configuration file for ELIX
// Static configuration with fallback values

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: window?.ENV?.VITE_SUPABASE_URL ||
                  'https://hakljxesjfvqwyjcshef.supabase.co',
                  
    SUPABASE_ANON_KEY: window?.ENV?.VITE_SUPABASE_ANON_KEY ||
                       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhha2xqeGVzamZ2cXd5amNzaGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjI4NTIsImV4cCI6MjA2OTAzODg1Mn0.lorVx51L7LzeRsJNTlKWBnhgDLfcPscx2b3JpqG8ewg',
    
    // Stripe Configuration
    STRIPE_PUBLISHABLE_KEY: window?.ENV?.VITE_STRIPE_PUBLISHABLE_KEY ||
                           'pk_test_51RoqCVD84Dop7c0GcolWXCjaKJTTUopKf6vwGW9K0OGicXot71MpM6pAUNQs60tfqzrS7Fhr93hIWRvXLW5QBwcL000mmyXQYZ',
                           
    STRIPE_PRICE_ID: window?.ENV?.VITE_STRIPE_PRICE_ID ||
                     'price_1RpEH8D84Dop7c0GhaSu7b7U',
    
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
