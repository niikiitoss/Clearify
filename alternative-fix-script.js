// Alternative Fix: Modify user_profiles table to include usage limits
// Run this SQL in Supabase if you prefer to use only user_profiles table

/*
-- Add columns to user_profiles table to include usage tracking
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS free_rewrites_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_reset ON user_profiles(last_reset);
*/

// Then update the JavaScript code to use only user_profiles table:

// Replace the loadUserProfile function with this simplified version:
async function loadUserProfile() {
    if (!currentUser || !supabase) return;
    
    try {
        console.log('Loading user profile for user:', currentUser.id);
        
        // Check if user profile exists using user_id column
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id);
            
        if (profileError) {
            console.error('Error checking user profile:', profileError);
            throw profileError;
        }
        
        // If no profile exists, create one with usage limits included
        if (!profileData || profileData.length === 0) {
            console.log('No profile found, creating new profile for user:', currentUser.id);
            
            const { data: newProfile, error: createProfileError } = await supabase
                .from('user_profiles')
                .insert([{ 
                    user_id: currentUser.id, 
                    email: currentUser.email,
                    free_rewrites_today: 0,
                    last_reset: new Date().toISOString().split('T')[0],
                    is_pro: false
                }])
                .select()
                .single();
                
            if (createProfileError) {
                console.error('Error creating user profile:', createProfileError);
                throw createProfileError;
            }
            
            userProfile = newProfile;
            userLimits = newProfile; // Use same object for limits
            console.log('✅ Created new user profile with limits:', userProfile);
            showNotification('Welcome to Clearify! You get 5 free rewrites a day.', 'success');
        } else {
            userProfile = profileData[0];
            userLimits = profileData[0]; // Use same object for limits
            console.log('✅ Loaded existing user profile:', userProfile);
            
            // Reset daily count if it's a new day
            const today = new Date().toISOString().split('T')[0];
            if (userProfile.last_reset !== today && !userProfile.is_pro) {
                console.log('Resetting daily count for new day');
                
                const { error: resetError } = await supabase
                    .from('user_profiles')
                    .update({
                        free_rewrites_today: 0,
                        last_reset: today
                    })
                    .eq('user_id', currentUser.id);
                    
                if (!resetError) {
                    userProfile.free_rewrites_today = 0;
                    userProfile.last_reset = today;
                    userLimits = userProfile;
                    console.log('✅ Reset daily count for new day');
                }
            }
        }
        
        updateUI();
    } catch (error) {
        console.error('Failed to load user data:', error);
        showNotification('Failed to load user data', 'error');
    }
}

// Also update the updateUsageCount function:
async function updateUsageCount() {
    if (!userProfile || userProfile.is_pro || !supabase) return;
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const newCount = userProfile.last_reset === today ? userProfile.free_rewrites_today + 1 : 1;
        
        const { error } = await supabase
            .from('user_profiles')
            .update({
                free_rewrites_today: newCount,
                last_reset: today
            })
            .eq('user_id', currentUser.id);
            
        if (error) throw error;
        
        userProfile.free_rewrites_today = newCount;
        userProfile.last_reset = today;
        userLimits = userProfile; // Keep them in sync
        updateUI();
    } catch (error) {
        console.error('Failed to update usage count:', error);
    }
}

// Update handleStripeSuccess function:
async function handleStripeSuccess() {
    if (!currentUser || !supabase) {
        showNotification('You\'re now a Clearify Pro! Unlimited rewrites unlocked.', 'success');
        return;
    }
    
    try {
        // Update user to Pro status in user_profiles table
        const { error } = await supabase
            .from('user_profiles')
            .update({ is_pro: true })
            .eq('user_id', currentUser.id);
            
        if (error) throw error;
        
        // Update local profile
        if (userProfile) {
            userProfile.is_pro = true;
            userLimits = userProfile; // Keep them in sync
            updateUI();
        }
        
        showNotification('🎉 Welcome to Clearify Pro! You now have unlimited rewrites!', 'success');
    } catch (error) {
        console.error('Failed to update Pro status:', error);
        showNotification('Payment successful! Please refresh the page to see your Pro features.', 'success');
    }
}
