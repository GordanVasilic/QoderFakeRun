// Script to enable heart rate option in the browser console

// Function to enable heart rate toggle
function enableHeartRateOption() {
    console.log('🔍 Looking for heart rate checkbox...');
    
    // Try to find the checkbox by different selectors
    let checkbox = document.querySelector('input[type="checkbox"]');
    
    if (!checkbox) {
        // Try more specific selectors
        checkbox = document.querySelector('input[id*="heart"]');
    }
    
    if (!checkbox) {
        checkbox = document.querySelector('input[name*="heart"]');
    }
    
    if (!checkbox) {
        // Look for any checkbox in the settings area
        const settingsDiv = document.querySelector('[class*="settings"], [class*="Settings"]');
        if (settingsDiv) {
            checkbox = settingsDiv.querySelector('input[type="checkbox"]');
        }
    }
    
    if (checkbox) {
        console.log('✅ Found checkbox:', checkbox);
        if (!checkbox.checked) {
            checkbox.click();
            console.log('✅ Heart rate option enabled!');
            
            // Trigger change event
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Check localStorage after enabling
            setTimeout(() => {
                const settings = JSON.parse(localStorage.getItem('paceHeartRateSettings') || '{}');
                console.log('📊 Updated settings:', settings);
            }, 100);
            
            return true;
        } else {
            console.log('ℹ️ Heart rate option is already enabled');
            return true;
        }
    } else {
        console.log('❌ Heart rate checkbox not found');
        
        // Force enable in localStorage as fallback
        console.log('🔧 Forcing enable in localStorage...');
        const currentSettings = JSON.parse(localStorage.getItem('paceHeartRateSettings') || '{}');
        const newSettings = {
            ...currentSettings,
            includeHeartRate: true,
            averageHeartRate: currentSettings.averageHeartRate || 150,
            heartRateVariability: currentSettings.heartRateVariability || 10
        };
        
        localStorage.setItem('paceHeartRateSettings', JSON.stringify(newSettings));
        
        // Dispatch storage event
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'paceHeartRateSettings',
            newValue: JSON.stringify(newSettings),
            oldValue: JSON.stringify(currentSettings)
        }));
        
        console.log('✅ Heart rate enabled in localStorage:', newSettings);
        return true;
    }
}

// Function to check current status
function checkHeartRateStatus() {
    const settings = JSON.parse(localStorage.getItem('paceHeartRateSettings') || '{}');
    console.log('📊 Current heart rate settings:', settings);
    
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (checkbox) {
        console.log('🎛️ Checkbox state:', checkbox.checked);
    }
    
    return settings;
}

// Auto-run when script is loaded
console.log('🚀 Heart rate enabler script loaded!');
console.log('📋 Available functions:');
console.log('  - enableHeartRateOption(): Enable heart rate option');
console.log('  - checkHeartRateStatus(): Check current status');

// Run the enabler function
enableHeartRateOption();