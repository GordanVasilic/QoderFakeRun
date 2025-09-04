// Script to enable heart rate toggle in the UI

function enableHeartRateInUI() {
    console.log('🔄 Attempting to enable heart rate toggle in UI...');
    
    // Look for the heart rate toggle element
    const toggleElements = [
        // Look for the toggle div with onClick handler
        document.querySelector('div[class*="inline-flex"][class*="cursor-pointer"]'),
        // Look for elements containing "Include Heart Rate Data" text
        ...Array.from(document.querySelectorAll('label')).filter(label => 
            label.textContent && label.textContent.includes('Include Heart Rate Data')
        ).map(label => label.parentElement?.querySelector('div[class*="cursor-pointer"]')),
        // Look for toggle switches
        ...Array.from(document.querySelectorAll('div[class*="bg-gray-300"], div[class*="bg-orange-500"]')).filter(el => 
            el.classList.contains('cursor-pointer')
        )
    ].filter(Boolean);
    
    console.log(`Found ${toggleElements.length} potential toggle elements:`, toggleElements);
    
    // Check current state in localStorage
    const currentSettings = JSON.parse(localStorage.getItem('paceHeartRateSettings') || '{}');
    console.log('Current localStorage settings:', currentSettings);
    
    if (currentSettings.includeHeartRate) {
        console.log('✅ Heart rate is already enabled in localStorage');
        return true;
    }
    
    // Try to click the toggle
    for (let i = 0; i < toggleElements.length; i++) {
        const toggle = toggleElements[i];
        console.log(`Attempting to click toggle ${i + 1}:`, toggle);
        
        try {
            // Check if this toggle is currently disabled (gray background)
            const isDisabled = toggle.classList.contains('bg-gray-300') || 
                              toggle.style.backgroundColor === 'rgb(209, 213, 219)';
            
            if (isDisabled) {
                console.log('Found disabled toggle, clicking...');
                toggle.click();
                
                // Wait a bit and check if it worked
                setTimeout(() => {
                    const updatedSettings = JSON.parse(localStorage.getItem('paceHeartRateSettings') || '{}');
                    if (updatedSettings.includeHeartRate) {
                        console.log('✅ Successfully enabled heart rate toggle!');
                        return true;
                    }
                }, 100);
            }
        } catch (error) {
            console.log(`Error clicking toggle ${i + 1}:`, error);
        }
    }
    
    // If clicking didn't work, force enable in localStorage
    console.log('⚠️ UI click failed, forcing enable in localStorage...');
    const newSettings = {
        ...currentSettings,
        includeHeartRate: true,
        averageHeartRate: currentSettings.averageHeartRate || 150,
        heartRateVariability: currentSettings.heartRateVariability || 15
    };
    
    localStorage.setItem('paceHeartRateSettings', JSON.stringify(newSettings));
    console.log('✅ Forced heart rate enable in localStorage:', newSettings);
    
    // Trigger a storage event to notify components
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'paceHeartRateSettings',
        newValue: JSON.stringify(newSettings),
        oldValue: JSON.stringify(currentSettings)
    }));
    
    return true;
}

// Run the function
enableHeartRateInUI();

// Also provide a way to check current status
function checkHeartRateStatus() {
    const settings = JSON.parse(localStorage.getItem('paceHeartRateSettings') || '{}');
    console.log('💾 Current heart rate settings:', {
        includeHeartRate: settings.includeHeartRate,
        averageHeartRate: settings.averageHeartRate,
        heartRateVariability: settings.heartRateVariability
    });
    return settings.includeHeartRate;
}

// Export functions for console use
window.enableHeartRateInUI = enableHeartRateInUI;
window.checkHeartRateStatus = checkHeartRateStatus;

console.log('🚀 Heart rate enabler script loaded. Use enableHeartRateInUI() or checkHeartRateStatus() in console.');