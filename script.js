// ELIX - Explain Like I'm X
// Full authentication version with Supabase and Stripe

// Initialize Supabase and Stripe
let supabase;
let stripe;

// DOM Elements
const textInput = document.getElementById('textInput');
const personaSelect = document.getElementById('personaSelect');
const customPersonaDiv = document.getElementById('customPersonaDiv');
const customPersona = document.getElementById('customPersona');
const difficultyModeBtn = document.getElementById('difficultyModeBtn');
const characterModeBtn = document.getElementById('characterModeBtn');
const difficultyMode = document.getElementById('difficultyMode');
const characterMode = document.getElementById('characterMode');
const difficultySlider = document.getElementById('difficultySlider');
const difficultyLabel = document.getElementById('difficultyLabel');
const rewriteBtn = document.getElementById('rewriteBtn');
const btnText = document.getElementById('btnText');
const btnLoading = document.getElementById('btnLoading');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const originalText = document.getElementById('originalText');
const originalContent = document.getElementById('originalContent');
const toggleOriginal = document.getElementById('toggleOriginal');
const copyResult = document.getElementById('copyResult');
const copySuccess = document.getElementById('copySuccess');
const themeToggle = document.getElementById('themeToggle');
const wordCount = document.getElementById('wordCount');

// Auth Elements
const authButtons = document.getElementById('authButtons');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const userMenu = document.getElementById('userMenu');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const userName = document.getElementById('userName');
const userInitial = document.getElementById('userInitial');
const proBadge = document.getElementById('proBadge');
const usageCounter = document.getElementById('usageCounter');
const usageText = document.getElementById('usageText');
const loginRequired = document.getElementById('loginRequired');
const loginRequiredBtn = document.getElementById('loginRequiredBtn');
const usageLimitReached = document.getElementById('usageLimitReached');
const upgradeBtn = document.getElementById('upgradeBtn');
const upgradeToProBtn = document.getElementById('upgradeToProBtn');
const manageBillingBtn = document.getElementById('manageBillingBtn');
const signOutBtn = document.getElementById('signOutBtn');

// State
let currentUser = null;
let userProfile = null;
let userLimits = null;
let isOriginalVisible = false;
let pendingAction = null; // Store the last action that was blocked by login requirement

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize services
        await initializeServices();
        
        // Initialize theme
        initializeTheme();
        
        // Setup event listeners
        setupEventListeners();
        
        // Check authentication state
        await checkAuthState();
        
        console.log('ELIX initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showNotification('Failed to initialize application. Please refresh the page.', 'error');
    }
});

// Initialize Supabase and Stripe
async function initializeServices() {
    if (typeof window.CONFIG === 'undefined' || !window.CONFIG.SUPABASE_URL || window.CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
        console.warn('Supabase not configured. Please update config.js with your Supabase credentials.');
        showLoginRequired();
        return;
    }
    
    try {
        supabase = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
        
        if (window.CONFIG.STRIPE_PUBLISHABLE_KEY && window.CONFIG.STRIPE_PUBLISHABLE_KEY !== 'YOUR_STRIPE_PUBLISHABLE_KEY_HERE') {
            stripe = Stripe(window.CONFIG.STRIPE_PUBLISHABLE_KEY);
        }
        
        console.log('Services initialized successfully');
    } catch (error) {
        console.error('Failed to initialize services:', error);
        showLoginRequired();
    }
}

// Check authentication state
async function checkAuthState() {
    console.log('Checking authentication state...');
    
    if (!supabase) {
        console.log('Supabase not initialized');
        showLoginRequired();
        return;
    }
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session data:', session);
        
        if (session) {
            console.log('User is authenticated:', session.user);
            currentUser = session.user;
            await loadUserProfile();
            showAuthenticatedState();
        } else {
            console.log('No active session found');
            showLoginRequired();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginRequired();
    }
}

// Load user profile and limits
async function loadUserProfile() {
    if (!currentUser || !supabase) return;
    
    try {
        // Load user profile
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
            
        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }
        
        if (!profileData) {
            // Create new profile
            const { data: newProfile, error: createProfileError } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: currentUser.id,
                    email: currentUser.email
                })
                .select()
                .single();
                
            if (createProfileError) throw createProfileError;
            userProfile = newProfile;
        } else {
            userProfile = profileData;
        }
        
        // Load user limits
        const { data: limitsData, error: limitsError } = await supabase
            .from('user_limits')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
            
        if (limitsError && limitsError.code !== 'PGRST116') {
            throw limitsError;
        }
        
        if (!limitsData) {
            // Create new limits record
            const { data: newLimits, error: createLimitsError } = await supabase
                .from('user_limits')
                .insert({
                    user_id: currentUser.id,
                    free_rewrites_today: 0,
                    last_reset: new Date().toISOString().split('T')[0],
                    is_pro: false
                })
                .select()
                .single();
                
            if (createLimitsError) throw createLimitsError;
            userLimits = newLimits;
            
            showNotification('Welcome to ELIX! You get 5 free rewrites a day.', 'success');
        } else {
            userLimits = limitsData;
            
            // Reset daily count if it's a new day
            const today = new Date().toISOString().split('T')[0];
            if (userLimits.last_reset !== today && !userLimits.is_pro) {
                const { error: resetError } = await supabase
                    .from('user_limits')
                    .update({
                        free_rewrites_today: 0,
                        last_reset: today
                    })
                    .eq('user_id', currentUser.id);
                    
                if (!resetError) {
                    userLimits.free_rewrites_today = 0;
                    userLimits.last_reset = today;
                }
            }
        }
        
        updateUI();
    } catch (error) {
        console.error('Failed to load user data:', error);
        showNotification('Failed to load user data', 'error');
    }
}

// Show authenticated state
function showAuthenticatedState() {
    authButtons.classList.add('hidden');
    userMenu.classList.remove('hidden');
    usageCounter.classList.remove('hidden');
    loginRequired.classList.add('hidden');
    
    rewriteBtn.disabled = false;
}

// Show login required state
function showLoginRequired() {
    authButtons.classList.remove('hidden');
    userMenu.classList.add('hidden');
    usageCounter.classList.add('hidden');
    loginRequired.classList.remove('hidden');
    usageLimitReached.classList.add('hidden');
    
    // Keep button enabled so it can trigger the login modal
    rewriteBtn.disabled = false;
    rewriteBtn.classList.remove('opacity-50', 'cursor-not-allowed');
}

// Update UI with user data
function updateUI() {
    if (!userProfile || !userLimits) return;
    
    // Update user name and initial
    const name = userProfile.email.split('@')[0];
    userName.textContent = name;
    userInitial.textContent = name.charAt(0).toUpperCase();
    
    // Show/hide pro badge and update UI styling
    if (userLimits.is_pro) {
        // Pro user styling
        proBadge.classList.remove('hidden');
        proBadge.style.background = 'linear-gradient(90deg, #FFD700, #FFB300)';
        proBadge.style.animation = 'proGlow 2s ease-in-out infinite alternate';
        
        usageText.textContent = 'Unlimited ✨';
        usageText.style.background = 'linear-gradient(90deg, #FFD700, #FFB300)';
        usageText.style.webkitBackgroundClip = 'text';
        usageText.style.webkitTextFillColor = 'transparent';
        usageText.style.fontWeight = '600';
        
        usageLimitReached.classList.add('hidden');
        
        // Add pro glow to buttons
        if (rewriteBtn) {
            rewriteBtn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3)';
        }
    } else {
        // Free user styling
        proBadge.classList.add('hidden');
        
        const remaining = Math.max(0, window.CONFIG.FREE_DAILY_LIMIT - userLimits.free_rewrites_today);
        usageText.textContent = `${remaining}/${window.CONFIG.FREE_DAILY_LIMIT} free today`;
        usageText.style.background = 'none';
        usageText.style.webkitTextFillColor = 'inherit';
        usageText.style.fontWeight = 'normal';
        
        if (remaining === 0) {
            showUsageLimitReached();
        } else {
            usageLimitReached.classList.add('hidden');
        }
        
        // Remove pro glow from buttons
        if (rewriteBtn) {
            rewriteBtn.style.boxShadow = '';
        }
    }
    
    // Add pro glow animation CSS if not exists
    if (!document.getElementById('pro-styles')) {
        const style = document.createElement('style');
        style.id = 'pro-styles';
        style.textContent = `
            @keyframes proGlow {
                0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
                100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
            }
            .pro-button {
                background: linear-gradient(90deg, #FFD700, #FFB300) !important;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.3) !important;
                animation: proGlow 2s ease-in-out infinite alternate !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Show usage limit reached
function showUsageLimitReached() {
    usageLimitReached.classList.remove('hidden');
    rewriteBtn.disabled = true;
}

// Authentication functions
async function signUp() {
    showAuthModal('signup');
}

async function signIn() {
    showAuthModal('login');
}


async function signInWithGoogle() {
    if (!supabase) return;
    
    try {
        console.log('Starting Google OAuth...');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        
        hideAuthModal();
        console.log('Google OAuth initiated successfully');
    } catch (error) {
        console.error('Google auth failed:', error);
        showNotification(error.message, 'error');
    }
}

async function signOut() {
    if (!supabase) return;
    
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        userProfile = null;
        showLoginRequired();
        showNotification('Signed out successfully', 'success');
    } catch (error) {
        console.error('Signout failed:', error);
        showNotification(error.message, 'error');
    }
}

// Stripe checkout - Direct client-side integration
async function upgradeToProStripe() {
    if (!currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }
    
    if (!userProfile) {
        showNotification('User profile not loaded', 'error');
        return;
    }
    
    if (!stripe) {
        showNotification('Stripe not configured', 'error');
        return;
    }
    
    try {
        showNotification('Redirecting to checkout...', 'info');
        
        // Direct Stripe checkout redirect
        const { error } = await stripe.redirectToCheckout({
            lineItems: [{
                price: window.CONFIG.STRIPE_PRICE_ID,
                quantity: 1,
            }],
            mode: 'subscription',
            successUrl: `${window.location.origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/?canceled=true`,
            customerEmail: currentUser.email,
            clientReferenceId: currentUser.id
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
    } catch (error) {
        console.error('Stripe checkout failed:', error);
        showNotification(error.message || 'Failed to start checkout process', 'error');
    }
}

// Manage billing
async function manageBilling() {
    if (!stripe || !userProfile?.stripe_customer_id) {
        showNotification('No billing information found', 'error');
        return;
    }
    
    try {
        // In a real implementation, you'd call your backend to create a portal session
        showNotification('Billing management coming soon!', 'info');
    } catch (error) {
        console.error('Billing management failed:', error);
        showNotification(error.message, 'error');
    }
}

// Main rewrite function
async function handleRewrite() {
    console.log('handleRewrite called');
    
    if (!currentUser) {
        // Store the pending action for retry after login
        pendingAction = {
            type: 'rewrite',
            text: textInput.value.trim(),
            persona: getSelectedPersona()
        };
        showLoginRequiredModal();
        return;
    }
    
    if (!userLimits.is_pro && userLimits.free_rewrites_today >= window.CONFIG.FREE_DAILY_LIMIT) {
        showUsageLimitReached();
        showNotification('Daily limit reached! Upgrade to Pro for unlimited access.', 'error');
        return;
    }
    
    const text = textInput.value.trim();
    
    // Validation
    if (!text) {
        showNotification('Please enter some text to rewrite', 'error');
        textInput.focus();
        return;
    }
    
    // Check word limit
    const wordCount = countWords(text);
    if (wordCount > window.CONFIG.WORD_LIMIT) {
        showNotification(`Text is too long (${wordCount} words). Please keep it under ${window.CONFIG.WORD_LIMIT} words.`, 'error');
        textInput.focus();
        return;
    }
    
    // Get persona using the helper function
    const persona = getSelectedPersona();
    console.log('Selected persona:', persona);
    
    // Validate persona selection for character mode
    if (difficultyMode.classList.contains('hidden')) {
        // Character mode - check if a persona is selected
        const selectedCard = document.querySelector('.persona-card.selected');
        if (!selectedCard) {
            showNotification('Please select a persona first', 'error');
            return;
        }
        
        // If custom persona, validate custom input
        if (selectedCard.dataset.persona === 'custom') {
            const customValue = customPersona.value.trim();
            if (!customValue) {
                showNotification('Please enter a custom persona', 'error');
                customPersona.focus();
                return;
            }
        }
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        const result = await callOpenAI(text, persona);
        await updateUsageCount();
        // Don't call displayResult since streaming already handles the display
        showNotification('Text rewritten successfully!', 'success');
    } catch (error) {
        console.error('Rewrite error:', error);
        showNotification(error.message || 'Something went wrong. Please try again.', 'error');
        // Hide result section on error
        resultSection.classList.add('hidden');
    } finally {
        setLoadingState(false);
    }
}

// Update usage count
async function updateUsageCount() {
    if (!userLimits || userLimits.is_pro || !supabase) return;
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const newCount = userLimits.last_reset === today ? userLimits.free_rewrites_today + 1 : 1;
        
        const { error } = await supabase
            .from('user_limits')
            .update({
                free_rewrites_today: newCount,
                last_reset: today
            })
            .eq('user_id', currentUser.id);
            
        if (error) throw error;
        
        userLimits.free_rewrites_today = newCount;
        userLimits.last_reset = today;
        updateUI();
    } catch (error) {
        console.error('Failed to update usage count:', error);
    }
}

// OpenAI API Call - Now uses secure serverless function
async function callOpenAI(text, persona) {
    console.log('Starting secure OpenAI API call via serverless function...');
    
    try {
        const startTime = performance.now();
        console.log('Making request to serverless function...');
        
        // Call our secure serverless function instead of OpenAI directly
        const response = await fetch('/api/openai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                persona: persona
            })
        });
        
        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Serverless function error:', errorData);
            
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again in a moment.');
            } else if (response.status === 400) {
                throw new Error(errorData.error || 'Bad request. Please check your input text.');
            } else {
                throw new Error(errorData.error || `Server Error: ${response.status}`);
            }
        }

        const data = await response.json();
        const result = data.result;

        if (!result) {
            throw new Error('No response received from AI service');
        }

        // Show result section immediately
        originalContent.textContent = text;
        resultContent.textContent = result;
        resultSection.classList.add('result-appear');
        resultSection.classList.remove('hidden');
        
        // Reset original text visibility
        isOriginalVisible = false;
        originalText.classList.add('hidden');
        toggleOriginal.textContent = '👁️ Show Original';
        
        // Scroll to result
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        console.log('OpenAI request completed in', performance.now() - startTime, 'ms');
        return result;
        
    } catch (error) {
        console.error('OpenAI API call failed:', error);
        throw error;
    }
}

// Event Listeners
function setupEventListeners() {
    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Auth buttons
    if (loginBtn) loginBtn.addEventListener('click', signIn);
    if (signupBtn) signupBtn.addEventListener('click', signUp);
    if (loginRequiredBtn) loginRequiredBtn.addEventListener('click', signUp);
    if (upgradeBtn) upgradeBtn.addEventListener('click', upgradeToProStripe);
    if (upgradeToProBtn) upgradeToProBtn.addEventListener('click', upgradeToProStripe);
    if (manageBillingBtn) manageBillingBtn.addEventListener('click', manageBilling);
    if (signOutBtn) signOutBtn.addEventListener('click', signOut);
    
    // User menu dropdown
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        if (userDropdown) {
            userDropdown.classList.add('hidden');
        }
    });
    
    // Mode switching
    if (difficultyModeBtn) {
        difficultyModeBtn.addEventListener('click', function() {
            difficultyMode.classList.remove('hidden');
            characterMode.classList.add('hidden');
            difficultyModeBtn.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-700', 'dark:text-blue-300');
            difficultyModeBtn.classList.remove('border-gray-300', 'dark:border-gray-600', 'bg-gray-50', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
            characterModeBtn.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-700', 'dark:text-blue-300');
            characterModeBtn.classList.add('border-gray-300', 'dark:border-gray-600', 'bg-gray-50', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
        });
    }
    
    if (characterModeBtn) {
        characterModeBtn.addEventListener('click', function() {
            characterMode.classList.remove('hidden');
            difficultyMode.classList.add('hidden');
            characterModeBtn.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-700', 'dark:text-blue-300');
            characterModeBtn.classList.remove('border-gray-300', 'dark:border-gray-600', 'bg-gray-50', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
            difficultyModeBtn.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-700', 'dark:text-blue-300');
            difficultyModeBtn.classList.add('border-gray-300', 'dark:border-gray-600', 'bg-gray-50', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
        });
    }
    
    // Difficulty slider with smooth animations
    if (difficultySlider) {
        const movingLabel = document.getElementById('movingLabel');
        const difficultyText = document.getElementById('difficultyText');
        
        function updateSlider() {
            const value = difficultySlider.value;
            // Position thumb to align with the tick marks:
            // Tick marks are positioned at: 10%, 30%, 50%, 70%, 90%
            // We need to ensure the slider thumb centers perfectly on these marks
            const tickPositions = [10, 30, 50, 70, 90];
            const percentage = tickPositions[value - 1];
            
            // Update moving label position to match slider thumb exactly
            if (movingLabel) {
                movingLabel.style.left = `${percentage}%`;
                movingLabel.style.transform = 'translateX(-50%)';
            }
            
            // Update label text with smooth transition
            const labels = [
                { text: 'Very Simple', color: 'from-green-500 to-green-600' },
                { text: 'Simple', color: 'from-yellow-500 to-yellow-600' },
                { text: 'Medium Detail', color: 'from-blue-500 to-purple-500' },
                { text: 'Detailed', color: 'from-orange-500 to-red-500' },
                { text: 'Very Detailed', color: 'from-red-500 to-red-600' }
            ];
            
            const currentLabel = labels[value - 1];
            
            if (difficultyText) {
                // Smooth text transition
                difficultyText.style.opacity = '0';
                setTimeout(() => {
                    difficultyText.textContent = currentLabel.text;
                    difficultyText.style.opacity = '1';
                }, 150);
            }
            
            // Update label background gradient and slider thumb color
            if (movingLabel) {
                const labelDiv = movingLabel.querySelector('div');
                if (labelDiv) {
                    labelDiv.className = `bg-gradient-to-r ${currentLabel.color} text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg`;
                }
            }
            
            // Update slider thumb color to match label
            const colorBorderMap = {
                'from-green-500 to-green-600': '#10b981',
                'from-yellow-500 to-yellow-600': '#f59e0b',
                'from-blue-500 to-purple-500': '#3b82f6',
                'from-orange-500 to-red-500': '#f97316',
                'from-red-500 to-red-600': '#ef4444'
            };
            
            const thumbColor = colorBorderMap[currentLabel.color];
            if (thumbColor) {
                const style = document.createElement('style');
                style.textContent = `
                    .slider-custom::-webkit-slider-thumb {
                        border-color: ${thumbColor} !important;
                    }
                    .slider-custom::-moz-range-thumb {
                        border-color: ${thumbColor} !important;
                    }
                `;
                // Remove previous style if exists
                const existingStyle = document.getElementById('dynamic-slider-style');
                if (existingStyle) {
                    existingStyle.remove();
                }
                style.id = 'dynamic-slider-style';
                document.head.appendChild(style);
            }
        }
        
        difficultySlider.addEventListener('input', updateSlider);
        
        // Subtle hover effect - slight scale on moving label
        difficultySlider.addEventListener('mouseenter', function() {
            if (movingLabel) {
                movingLabel.style.transform = 'translateX(-50%) scale(1.05)';
            }
        });
        difficultySlider.addEventListener('mouseleave', function() {
            if (movingLabel) {
                movingLabel.style.transform = 'translateX(-50%) scale(1)';
            }
        });
        
        // Initialize slider position
        updateSlider();
    }
    
    // Enhanced Persona card selection with mobile tap-to-expand
    function setupPersonaCards() {
        const characterMode = document.getElementById('characterMode');
        
        if (characterMode) {
            // Use event delegation for reliable click handling
            characterMode.addEventListener('click', function(e) {
                const clickedCard = e.target.closest('.persona-card');
                if (!clickedCard) return;
                
                console.log('🎭 Persona card clicked:', clickedCard.dataset.persona);
                
                // Check if we're on mobile (screen width <= 768px)
                const isMobile = window.innerWidth <= 768;
                
                if (isMobile) {
                    // Mobile: Handle tap-to-expand functionality
                    const isExpanded = clickedCard.classList.contains('mobile-expanded');
                    
                    if (isExpanded) {
                        // If already expanded, collapse and select
                        clickedCard.classList.remove('mobile-expanded');
                        
                        // Remove selected from all cards
                        const allCards = characterMode.querySelectorAll('.persona-card');
                        allCards.forEach(card => {
                            card.classList.remove('selected');
                        });
                        
                        // Add selected to clicked card
                        clickedCard.classList.add('selected');
                        console.log('📱 Mobile: Collapsed and selected:', clickedCard.dataset.persona);
                    } else {
                        // If not expanded, expand it (don't select yet)
                        // First collapse all other cards
                        const allCards = characterMode.querySelectorAll('.persona-card');
                        allCards.forEach(card => {
                            card.classList.remove('mobile-expanded');
                        });
                        
                        // Expand clicked card
                        clickedCard.classList.add('mobile-expanded');
                        console.log('📱 Mobile: Expanded card:', clickedCard.dataset.persona);
                        return; // Don't proceed with selection logic
                    }
                } else {
                    // Desktop: Normal selection behavior
                    // Remove selected class from all cards
                    const allCards = characterMode.querySelectorAll('.persona-card');
                    allCards.forEach(card => {
                        card.classList.remove('selected');
                        card.classList.remove('mobile-expanded'); // Clean up mobile classes
                    });
                    
                    // Add selected class to clicked card
                    clickedCard.classList.add('selected');
                    console.log('🖥️ Desktop: Selected:', clickedCard.dataset.persona);
                }
                
                // Get the persona value
                const selectedPersona = clickedCard.dataset.persona;
                
                // Handle custom persona input visibility
                if (selectedPersona === 'custom') {
                    customPersonaDiv.classList.remove('hidden');
                    if (customPersona) {
                        customPersona.focus();
                        console.log('🔍 Custom persona input focused');
                    }
                } else {
                    customPersonaDiv.classList.add('hidden');
                    console.log('🙈 Custom persona input hidden');
                }
                
                console.log('🎯 Final selected persona:', selectedPersona);
                
                // Update button state if text is present
                updateButtonState();
            });
            
            // Handle window resize to clean up mobile classes on desktop
            window.addEventListener('resize', function() {
                const isMobile = window.innerWidth <= 768;
                if (!isMobile) {
                    // Clean up mobile-specific classes when switching to desktop
                    const allCards = characterMode.querySelectorAll('.persona-card');
                    allCards.forEach(card => {
                        card.classList.remove('mobile-expanded');
                    });
                }
            });
            
            console.log('✅ Persona card event listeners setup complete');
        } else {
            console.error('❌ Character mode element not found');
        }
    }
    
    // Helper function to update button state
    function updateButtonState() {
        const text = textInput.value.trim();
        const words = countWords(text);
        const isOverLimit = words > window.CONFIG.WORD_LIMIT;
        
        if (text.length > 0 && !isOverLimit) {
            rewriteBtn.classList.add('explain-btn-active');
            console.log('🔥 Button activated - text present and valid');
        } else {
            rewriteBtn.classList.remove('explain-btn-active');
            console.log('💤 Button deactivated - no text or over limit');
        }
    }
    
    // Call the setup function
    setupPersonaCards();
    
    // Legacy persona selector (if still exists)
    if (personaSelect) {
        personaSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customPersonaDiv.classList.remove('hidden');
                customPersona.focus();
            } else {
                customPersonaDiv.classList.add('hidden');
            }
        });
    }
    
    // Main rewrite button
    if (rewriteBtn) {
        rewriteBtn.addEventListener('click', handleRewrite);
    }
    
    // Result actions
    if (toggleOriginal) {
        toggleOriginal.addEventListener('click', toggleOriginalText);
    }
    if (copyResult) {
        copyResult.addEventListener('click', copyToClipboard);
    }
    
    // Word counting and auto-resize
    if (textInput) {
        textInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 300) + 'px';
            updateWordCount();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (currentUser) {
                handleRewrite();
            }
        }
    });
    
    // Auth state changes
    if (supabase) {
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session);
            if (event === 'SIGNED_IN' || (event === 'TOKEN_REFRESHED' && session)) {
                console.log('User signed in:', session.user);
                currentUser = session.user;
                await loadUserProfile();
                showAuthenticatedState();
                showNotification('Signed in successfully!', 'success');
                hideAuthModal(); // Hide modal if open
                hideLoginRequiredModal(); // Hide login required modal if open
                
                // Execute any pending action after successful login
                await executePendingAction();
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                currentUser = null;
                userProfile = null;
                pendingAction = null; // Clear any pending actions on logout
                showLoginRequired();
            }
        });
    }
    
    // Check for Stripe success/cancel
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
        handleStripeSuccess();
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('canceled') === 'true') {
        showNotification('Upgrade canceled. You can upgrade anytime!', 'info');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Enhanced Theme Management with Light Theme Support
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default to dark theme (current design)
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.documentElement.classList.remove('dark');
    } else if (savedTheme === 'dark' || !savedTheme) {
        document.body.classList.remove('light-theme');
        document.documentElement.classList.add('dark');
    }
    
    updateThemeIcon();
}

function toggleTheme() {
    const isLightTheme = document.body.classList.contains('light-theme');
    
    if (isLightTheme) {
        // Switch to dark theme
        document.body.classList.remove('light-theme');
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        // Switch to light theme
        document.body.classList.add('light-theme');
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
    
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeToggle = document.getElementById('themeToggle');
    const isLightTheme = document.body.classList.contains('light-theme');
    
    if (themeToggle) {
        const moonIcon = themeToggle.querySelector('.fa-moon');
        const sunIcon = themeToggle.querySelector('.fa-sun');
        
        if (isLightTheme) {
            // Show moon icon (switch to dark)
            if (moonIcon) moonIcon.classList.remove('hidden');
            if (sunIcon) sunIcon.classList.add('hidden');
        } else {
            // Show sun icon (switch to light)
            if (moonIcon) moonIcon.classList.add('hidden');
            if (sunIcon) sunIcon.classList.remove('hidden');
        }
    }
}

// Helper function to get the currently selected persona
function getSelectedPersona() {
    if (difficultyMode.classList.contains('hidden')) {
        // Character mode - check for selected card
        const selectedCard = document.querySelector('.persona-card.selected');
        if (selectedCard) {
            const selectedPersona = selectedCard.dataset.persona;
            if (selectedPersona === 'custom') {
                return customPersona.value.trim();
            }
            return selectedPersona;
        }
        
        // Fallback to dropdown if no card selected (legacy support)
        if (personaSelect) {
            const selectedPersona = personaSelect.value;
            if (selectedPersona === 'custom') {
                return customPersona.value.trim();
            }
            return selectedPersona;
        }
        
        // Default fallback
        return "I'm 5 years old";
    } else {
        // Difficulty mode
        const difficultyLevel = difficultySlider.value;
        const difficultyMap = {
            '1': 'using very simple words and short sentences',
            '2': 'using simple language that is easy to understand',
            '3': 'with a balanced level of detail and clarity',
            '4': 'with detailed explanations and examples',
            '5': 'with comprehensive detail and technical depth'
        };
        return difficultyMap[difficultyLevel];
    }
}

// Execute pending action after successful login
async function executePendingAction() {
    if (!pendingAction || !currentUser) {
        pendingAction = null;
        return;
    }
    
    console.log('Executing pending action:', pendingAction);
    
    try {
        if (pendingAction.type === 'rewrite') {
            // Restore the text input if it's different
            if (textInput.value.trim() !== pendingAction.text) {
                textInput.value = pendingAction.text;
                updateWordCount();
            }
            
            // Show loading state
            setLoadingState(true);
            
            // Execute the rewrite with the stored parameters
            const result = await callOpenAI(pendingAction.text, pendingAction.persona);
            await updateUsageCount();
            showNotification('Text rewritten successfully!', 'success');
        }
    } catch (error) {
        console.error('Failed to execute pending action:', error);
        showNotification(error.message || 'Something went wrong. Please try again.', 'error');
        resultSection.classList.add('hidden');
    } finally {
        setLoadingState(false);
        pendingAction = null; // Clear the pending action
    }
}

// Word counting and validation
function countWords(text) {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
}

function updateWordCount() {
    const text = textInput.value;
    const words = countWords(text);
    const isOverLimit = words > window.CONFIG.WORD_LIMIT;
    
    // Update counter display
    if (wordCount) {
        wordCount.textContent = `${words} / ${window.CONFIG.WORD_LIMIT} words`;
        
        // Change color based on limit
        if (isOverLimit) {
            wordCount.className = 'text-sm text-red-500 dark:text-red-400 font-medium';
            textInput.classList.add('border-red-500', 'focus:ring-red-500');
            textInput.classList.remove('border-gray-300', 'dark:border-gray-600', 'focus:ring-blue-500');
        } else if (words > window.CONFIG.WORD_LIMIT * 0.8) {
            wordCount.className = 'text-sm text-yellow-500 dark:text-yellow-400 font-medium';
            textInput.classList.remove('border-red-500', 'focus:ring-red-500', 'border-gray-300', 'dark:border-gray-600', 'focus:ring-blue-500');
            textInput.classList.add('border-yellow-500', 'focus:ring-yellow-500');
        } else {
            wordCount.className = 'text-sm text-gray-500 dark:text-gray-400';
            textInput.classList.remove('border-red-500', 'focus:ring-red-500', 'border-yellow-500', 'focus:ring-yellow-500');
            textInput.classList.add('border-gray-300', 'dark:border-gray-600', 'focus:ring-blue-500');
        }
        
        // Update button active state based on text content
        if (text.trim().length > 0 && !isOverLimit) {
            rewriteBtn.classList.add('explain-btn-active');
        } else {
            rewriteBtn.classList.remove('explain-btn-active');
        }
        
        // Disable/enable button based on word limit and auth state
        if (isOverLimit) {
            rewriteBtn.disabled = true;
            rewriteBtn.classList.add('opacity-50', 'cursor-not-allowed');
            rewriteBtn.classList.remove('explain-btn-active');
        } else if (userProfile && (!userProfile.is_pro && userProfile.free_rewrites_today >= window.CONFIG.FREE_DAILY_LIMIT)) {
            rewriteBtn.disabled = true;
            rewriteBtn.classList.add('opacity-50', 'cursor-not-allowed');
            rewriteBtn.classList.remove('explain-btn-active');
        } else {
            rewriteBtn.disabled = false;
            rewriteBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

// UI Helper Functions
function setLoadingState(loading) {
    console.log('Setting loading state:', loading);
    
    if (loading) {
        // Show loading state
        rewriteBtn.disabled = true;
        rewriteBtn.classList.add('opacity-50', 'cursor-not-allowed');
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
    } else {
        // Reset to normal state
        rewriteBtn.disabled = false;
        rewriteBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        
        // Restore button styling based on current state
        const text = textInput.value.trim();
        const words = countWords(text);
        const isOverLimit = words > window.CONFIG.WORD_LIMIT;
        
        if (text.length > 0 && !isOverLimit) {
            rewriteBtn.classList.add('explain-btn-active');
        } else {
            rewriteBtn.classList.remove('explain-btn-active');
        }
        
        // Check usage limits for authenticated users
        if (userProfile && !userProfile.pro_user && userProfile.rewrite_count >= window.CONFIG.FREE_DAILY_LIMIT) {
            rewriteBtn.disabled = true;
            rewriteBtn.classList.add('opacity-50', 'cursor-not-allowed');
            rewriteBtn.classList.remove('explain-btn-active');
        }
    }
}

function displayResult(originalTextContent, result) {
    // Set content
    originalContent.textContent = originalTextContent;
    resultContent.textContent = result;
    
    // Add result animation class
    resultSection.classList.add('result-appear');
    
    // Show result section
    resultSection.classList.remove('hidden');
    
    // Reset original text visibility
    isOriginalVisible = false;
    originalText.classList.add('hidden');
    toggleOriginal.textContent = '👁️ Show Original';
    
    // Scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Remove animation class after animation completes
    setTimeout(() => {
        resultSection.classList.remove('result-appear');
    }, 800);
}

function toggleOriginalText() {
    isOriginalVisible = !isOriginalVisible;
    
    if (isOriginalVisible) {
        originalText.classList.remove('hidden');
        toggleOriginal.textContent = '🙈 Hide Original';
    } else {
        originalText.classList.add('hidden');
        toggleOriginal.textContent = '👁️ Show Original';
    }
}

async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(resultContent.textContent);
        showCopySuccess();
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = resultContent.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopySuccess();
    }
}

function showCopySuccess() {
    copySuccess.classList.remove('translate-y-full', 'opacity-0');
    copySuccess.classList.add('translate-y-0', 'opacity-100');
    
    setTimeout(() => {
        copySuccess.classList.add('translate-y-full', 'opacity-0');
        copySuccess.classList.remove('translate-y-0', 'opacity-100');
    }, 2000);
}

// Auth Modal Functions
function showAuthModal(type) {
    const modalId = 'authModal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        modal = createAuthModal();
        document.body.appendChild(modal);
    }
    
    const title = modal.querySelector('#authModalTitle');
    const subtitle = modal.querySelector('#authModalSubtitle');
    
    if (type === 'signup') {
        title.textContent = 'Create your account';
        subtitle.textContent = 'Start with 5 free rewrites per day';
    } else {
        title.textContent = 'Welcome back';
        subtitle.textContent = 'Sign in to continue rewriting';
    }
    
    // Show modal
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.transform').classList.remove('scale-95');
        modal.querySelector('.transform').classList.add('scale-100');
    }, 10);
}

function hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    modal.querySelector('.transform').classList.remove('scale-100');
    modal.querySelector('.transform').classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function createAuthModal() {
    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 hidden opacity-0 transition-opacity duration-200';
    
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8 transform scale-95 transition-transform duration-200">
            <div class="text-center mb-6">
                <h2 id="authModalTitle" class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h2>
                <p id="authModalSubtitle" class="text-gray-600 dark:text-gray-400">Sign in to continue rewriting</p>
            </div>
            
            <div class="space-y-4">
                <!-- Google Sign In -->
                <button id="authGoogleBtn" class="w-full flex items-center justify-center px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span class="text-gray-700 dark:text-gray-300 font-medium">Continue with Google</span>
                </button>
            </div>
            
            <div class="mt-6 text-center">
                <button id="authModalClose" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const googleBtn = modal.querySelector('#authGoogleBtn');
    const closeBtn = modal.querySelector('#authModalClose');
    
    googleBtn.addEventListener('click', signInWithGoogle);
    closeBtn.addEventListener('click', hideAuthModal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideAuthModal();
        }
    });
    
    return modal;
}

// Simple, Reliable Login Modal System
function showLoginRequiredModal() {
    console.log('🚀 SHOWING LOGIN MODAL - Simple Version');
    
    // Remove any existing modal first
    const existingModal = document.getElementById('simpleLoginModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal with inline styles for maximum reliability
    const modal = document.createElement('div');
    modal.id = 'simpleLoginModal';
    
    // Use inline styles to ensure they work
    modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: rgba(0, 0, 0, 0.7) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 999999 !important;
        padding: 20px !important;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 24px;
            padding: 40px;
            max-width: 450px;
            width: 100%;
            box-shadow: 0 25px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05);
            text-align: center;
            position: relative;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.2);
            transform: scale(0.95);
            animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        ">
            <!-- Animated Brain Icon -->
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 28px auto;
                font-size: 32px;
                box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
                animation: brainPulse 2s ease-in-out infinite;
                position: relative;
            ">
                <div style="
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                    opacity: 0.3;
                    animation: brainGlow 3s ease-in-out infinite;
                "></div>
                🧠
            </div>
            
            <!-- Title with Gradient -->
            <h2 style="
                font-size: 28px;
                font-weight: 800;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 12px;
                font-family: 'Sora', sans-serif;
                letter-spacing: -0.5px;
            ">Login Required</h2>
            
            <!-- Description with Better Typography -->
            <p style="
                color: #4b5563;
                margin-bottom: 8px;
                font-size: 17px;
                font-weight: 500;
                line-height: 1.5;
            ">You must log in to use the AI text rewriter!</p>
            
            <p style="
                color: #6b7280;
                margin-bottom: 36px;
                font-size: 15px;
                line-height: 1.6;
                max-width: 320px;
                margin-left: auto;
                margin-right: auto;
            ">Sign in to unlock 5 free rewrites a day or upgrade to Pro for unlimited access.</p>
            
            <!-- Enhanced Google Button -->
            <button id="simpleGoogleBtn" style="
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 18px 24px;
                background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
                border: 2px solid #e5e7eb;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 600;
                color: #374151;
                cursor: pointer;
                margin-bottom: 28px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                position: relative;
                overflow: hidden;
            " onmouseover="
                this.style.transform='translateY(-2px)';
                this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)';
                this.style.borderColor='#d1d5db';
            " onmouseout="
                this.style.transform='translateY(0)';
                this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)';
                this.style.borderColor='#e5e7eb';
            ">
                <svg style="width: 22px; height: 22px; margin-right: 12px;" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
            </button>
            
            <!-- Enhanced Links -->
            <div style="display: flex; justify-content: center; gap: 32px; font-size: 15px;">
                <button id="simpleCreateAccount" style="
                    color: #667eea;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.2s;
                " onmouseover="this.style.color='#5a67d8'" onmouseout="this.style.color='#667eea'">Create Account</button>
                <a href="#pricing" style="
                    color: #6b7280; 
                    text-decoration: none;
                    font-weight: 500;
                    transition: all 0.2s;
                " onmouseover="this.style.color='#4b5563'" onmouseout="this.style.color='#6b7280'">Pricing</a>
            </div>
            
            <!-- Enhanced Close Button -->
            <button id="simpleCloseBtn" style="
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(107, 114, 128, 0.1);
                border: none;
                font-size: 20px;
                color: #6b7280;
                cursor: pointer;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s;
            " onmouseover="
                this.style.backgroundColor='rgba(107, 114, 128, 0.2)';
                this.style.color='#374151';
                this.style.transform='scale(1.1)';
            " onmouseout="
                this.style.backgroundColor='rgba(107, 114, 128, 0.1)';
                this.style.color='#6b7280';
                this.style.transform='scale(1)';
            ">×</button>
        </div>
        
        <style>
            @keyframes modalSlideIn {
                0% {
                    opacity: 0;
                    transform: scale(0.8) translateY(20px);
                }
                100% {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            @keyframes brainPulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.05);
                }
            }
            
            @keyframes brainGlow {
                0%, 100% {
                    transform: scale(1);
                    opacity: 0.3;
                }
                50% {
                    transform: scale(1.2);
                    opacity: 0.1;
                }
            }
        </style>
    `;
    
    // Add to body
    document.body.appendChild(modal);
    console.log('✅ Modal added to DOM');
    
    // Add event listeners
    const googleBtn = modal.querySelector('#simpleGoogleBtn');
    const createBtn = modal.querySelector('#simpleCreateAccount');
    const closeBtn = modal.querySelector('#simpleCloseBtn');
    
    googleBtn.addEventListener('click', () => {
        console.log('Google button clicked');
        hideLoginRequiredModal();
        signInWithGoogle();
    });
    
    createBtn.addEventListener('click', () => {
        console.log('Create account clicked');
        hideLoginRequiredModal();
        showAuthModal('signup');
    });
    
    closeBtn.addEventListener('click', () => {
        console.log('Close button clicked');
        hideLoginRequiredModal();
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('Backdrop clicked');
            hideLoginRequiredModal();
        }
    });
    
    console.log('🎉 Modal should now be visible!');
}

function hideLoginRequiredModal() {
    const modal = document.getElementById('simpleLoginModal');
    if (modal) {
        modal.remove();
        console.log('✅ Modal removed');
    }
}

// Handle Stripe success callback
async function handleStripeSuccess() {
    if (!currentUser || !supabase) {
        showNotification('You\'re now an ELIX Pro! Unlimited rewrites unlocked.', 'success');
        return;
    }
    
    try {
        // Update user to Pro status in user_limits table
        const { error } = await supabase
            .from('user_limits')
            .update({ is_pro: true })
            .eq('user_id', currentUser.id);
            
        if (error) throw error;
        
        // Update local limits
        if (userLimits) {
            userLimits.is_pro = true;
            updateUI();
        }
        
        showNotification('🎉 Welcome to ELIX Pro! You now have unlimited rewrites!', 'success');
    } catch (error) {
        console.error('Failed to update Pro status:', error);
        showNotification('Payment successful! Please refresh the page to see your Pro features.', 'success');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 transform translate-x-full opacity-0 transition-all duration-300 ${
        type === 'error' ? 'bg-red-500 text-white' : 
        type === 'success' ? 'bg-green-500 text-white' : 
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
        notification.classList.add('translate-x-0', 'opacity-100');
    }, 100);
    
    // Hide notification
    setTimeout(() => {
        notification.classList.add('translate-x-full', 'opacity-0');
        notification.classList.remove('translate-x-0', 'opacity-100');
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}
