// Script to enable heart rate data in the UI
console.log('🔍 Heart Rate Enabler Script Started');

// Function to check current heart rate settings
function checkCurrentSettings() {
    console.log('\n📋 Checking Current Settings...');
    
    const settings = localStorage.getItem('paceHeartRateSettings');
    if (settings) {
        const parsed = JSON.parse(settings);
        console.log('Current settings:', parsed);
        console.log('Heart Rate Enabled:', parsed.includeHeartRate ? '✅ YES' : '❌ NO');
        return parsed;
    } else {
        console.log('❌ No settings found in localStorage');
        return null;
    }
}

// Function to find and enable heart rate toggle
function enableHeartRateToggle() {
    console.log('\n🔄 Attempting to Enable Heart Rate Toggle...');
    
    // Look for the heart rate toggle element
    const toggleElements = document.querySelectorAll('[class*="cursor-pointer"]');
    
    for (const element of toggleElements) {
        const parent = element.closest('div');
        const textContent = parent ? parent.textContent : '';
        
        if (textContent.includes('Include Heart Rate Data')) {
            console.log('✅ Found heart rate toggle element');
            
            // Check if it's currently enabled (orange background)
            const isEnabled = element.classList.contains('bg-orange-500');
            console.log('Current state:', isEnabled ? 'ENABLED' : 'DISABLED');
            
            if (!isEnabled) {
                console.log('🖱️ Clicking to enable heart rate...');
                element.click();
                
                // Wait a bit and check again
                setTimeout(() => {
                    const newState = element.classList.contains('bg-orange-500');
                    console.log('New state:', newState ? 'ENABLED ✅' : 'STILL DISABLED ❌');
                    
                    // Check localStorage after click
                    setTimeout(() => {
                        checkCurrentSettings();
                    }, 100);
                }, 100);
            } else {
                console.log('✅ Heart rate is already enabled');
            }
            return true;
        }
    }
    
    console.log('❌ Heart rate toggle not found');
    return false;
}

// Function to force enable heart rate in localStorage
function forceEnableHeartRate() {
    console.log('\n🔧 Force Enabling Heart Rate in localStorage...');
    
    const currentSettings = JSON.parse(localStorage.getItem('paceHeartRateSettings') || '{}');
    
    const newSettings = {
        averagePace: currentSettings.averagePace || 5.5,
        paceInconsistency: currentSettings.paceInconsistency || 30,
        includeHeartRate: true,
        averageHeartRate: currentSettings.averageHeartRate || 140,
        heartRateVariability: currentSettings.heartRateVariability || 25
    };
    
    localStorage.setItem('paceHeartRateSettings', JSON.stringify(newSettings));
    console.log('✅ Heart rate settings updated:', newSettings);
    
    // Trigger a page refresh to apply changes
    console.log('🔄 Refreshing page to apply changes...');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Main execution
function runHeartRateEnabler() {
    console.log('🚀 Running Heart Rate Enabler...');
    
    // Step 1: Check current settings
    const currentSettings = checkCurrentSettings();
    
    // Step 2: Try to enable via UI toggle
    const toggleFound = enableHeartRateToggle();
    
    // Step 3: If toggle not found or not working, force enable
    if (!toggleFound) {
        console.log('\n⚠️ Toggle not found, forcing enable via localStorage...');
        forceEnableHeartRate();
    } else {
        // Wait and check if the toggle worked
        setTimeout(() => {
            const updatedSettings = checkCurrentSettings();
            if (!updatedSettings || !updatedSettings.includeHeartRate) {
                console.log('\n⚠️ Toggle click didn\'t work, forcing enable via localStorage...');
                forceEnableHeartRate();
            }
        }, 500);
    }
}

// Run the script
runHeartRateEnabler();

// Export functions for manual use
window.checkCurrentSettings = checkCurrentSettings;
window.enableHeartRateToggle = enableHeartRateToggle;
window.forceEnableHeartRate = forceEnableHeartRate;

console.log('\n📝 Available functions:');
console.log('- checkCurrentSettings()');
console.log('- enableHeartRateToggle()');
console.log('- forceEnableHeartRate()');