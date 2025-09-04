// Simple Heart Rate Test for Browser Console
// Copy and paste this into the browser console while the app is running

console.log('🔍 Heart Rate Quick Test Started');

// Function to check current heart rate settings
function checkHeartRateSettings() {
    console.log('\n📋 Checking Heart Rate Settings...');
    
    // Check localStorage
    try {
        const settings = localStorage.getItem('paceHeartRateSettings');
        if (settings) {
            const parsed = JSON.parse(settings);
            console.log('💾 Stored Settings:', parsed);
            console.log('❤️ includeHeartRate:', parsed.includeHeartRate ? '✅ ENABLED' : '❌ DISABLED');
            return parsed.includeHeartRate;
        } else {
            console.log('❌ No settings found in localStorage');
        }
    } catch (e) {
        console.log('❌ Error reading settings:', e);
    }
    
    // Check React component state (if accessible)
    const reactRoot = document.querySelector('#__next') || document.querySelector('[data-reactroot]');
    if (reactRoot && reactRoot._reactInternalFiber) {
        console.log('⚛️ React root found, checking component state...');
    }
    
    return false;
}

// Function to find and enable heart rate toggle
function enableHeartRate() {
    console.log('\n🔄 Attempting to Enable Heart Rate...');
    
    // Look for various possible selectors for the heart rate toggle
    const selectors = [
        'input[type="checkbox"][id*="heart"]',
        'input[type="checkbox"][name*="heart"]',
        'input[type="checkbox"][data-testid*="heart"]',
        'input[type="checkbox"]', // fallback to all checkboxes
        '[role="switch"]',
        '.toggle',
        '.switch'
    ];
    
    let found = false;
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`🔍 Checking selector "${selector}": found ${elements.length} elements`);
        
        elements.forEach((element, index) => {
            const label = element.closest('label') || element.nextElementSibling || element.previousElementSibling;
            const labelText = label ? label.textContent.toLowerCase() : '';
            const elementText = element.textContent?.toLowerCase() || '';
            
            console.log(`   Element ${index + 1}:`, {
                checked: element.checked,
                labelText: labelText.substring(0, 50),
                elementText: elementText.substring(0, 50)
            });
            
            if (labelText.includes('heart') || elementText.includes('heart') || 
                labelText.includes('hr') || elementText.includes('hr')) {
                console.log(`   ❤️ Found heart rate toggle! Currently: ${element.checked ? 'ENABLED' : 'DISABLED'}`);
                
                if (!element.checked) {
                    console.log('   🖱️ Clicking to enable...');
                    element.click();
                    setTimeout(() => {
                        console.log(`   ✅ New state: ${element.checked ? 'ENABLED' : 'STILL DISABLED'}`);
                    }, 100);
                }
                found = true;
            }
        });
    }
    
    if (!found) {
        console.log('❌ Heart rate toggle not found. Please manually enable it in the UI.');
        console.log('📝 Look for "Include Heart Rate Data" or similar option in the settings.');
    }
    
    return found;
}

// Function to monitor console logs for heart rate messages
function monitorHeartRateLogs() {
    console.log('\n👂 Monitoring Console for Heart Rate Messages...');
    console.log('📝 Generate a route now and watch for these messages:');
    console.log('   - "includeHeartRate: true"');
    console.log('   - "Heart rate generation started"');
    console.log('   - "Heart rate data generated"');
    
    // Store original console methods
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalDebug = console.debug;
    
    const heartRateMessages = [];
    
    function interceptLog(method, methodName) {
        return function(...args) {
            const message = args.join(' ');
            if (message.toLowerCase().includes('heart') || 
                message.toLowerCase().includes('hr') ||
                message.includes('includeHeartRate')) {
                heartRateMessages.push(`[${methodName}] ${message}`);
                console.log(`🔍 [HR-${methodName.toUpperCase()}]:`, ...args);
            }
            return method.apply(console, args);
        };
    }
    
    console.log = interceptLog(originalLog, 'log');
    console.info = interceptLog(originalInfo, 'info');
    console.debug = interceptLog(originalDebug, 'debug');
    
    // Restore after 60 seconds
    setTimeout(() => {
        console.log = originalLog;
        console.info = originalInfo;
        console.debug = originalDebug;
        
        console.log('\n📊 Heart Rate Messages Captured:');
        if (heartRateMessages.length > 0) {
            heartRateMessages.forEach(msg => console.log('  ', msg));
        } else {
            console.log('   ❌ No heart rate messages found');
        }
    }, 60000);
}

// Function to test GPX export
function testGPXExport() {
    console.log('\n📥 Testing GPX Export...');
    
    // Look for export buttons
    const exportButtons = document.querySelectorAll('button');
    let gpxButton = null;
    
    exportButtons.forEach(button => {
        const text = button.textContent.toLowerCase();
        if (text.includes('gpx') || text.includes('export')) {
            console.log('📤 Found export button:', button.textContent);
            gpxButton = button;
        }
    });
    
    if (gpxButton) {
        console.log('🖱️ Click the export button and check the downloaded GPX file for:');
        console.log('   - <gpxtpx:hr>140</gpxtpx:hr> (heart rate tags)');
        console.log('   - xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"');
    } else {
        console.log('❌ Export button not found');
    }
}

// Main test function
function runQuickTest() {
    console.log('🚀 Running Quick Heart Rate Test\n');
    
    const isEnabled = checkHeartRateSettings();
    
    if (!isEnabled) {
        console.log('\n⚠️ Heart rate is currently DISABLED');
        enableHeartRate();
    } else {
        console.log('\n✅ Heart rate is already ENABLED');
    }
    
    monitorHeartRateLogs();
    testGPXExport();
    
    console.log('\n📝 Next Steps:');
    console.log('1. Make sure heart rate is enabled in the UI');
    console.log('2. Generate a route (add waypoints and click generate)');
    console.log('3. Watch console for heart rate debug messages');
    console.log('4. Export GPX and check for <gpxtpx:hr> tags');
    
    console.log('\n🔄 Run this again: runQuickTest()');
}

// Make functions available globally
window.runQuickTest = runQuickTest;
window.checkHeartRateSettings = checkHeartRateSettings;
window.enableHeartRate = enableHeartRate;
window.monitorHeartRateLogs = monitorHeartRateLogs;

console.log('\n🎯 Quick Test Functions Available:');
console.log('   runQuickTest() - Run complete test');
console.log('   checkHeartRateSettings() - Check current settings');
console.log('   enableHeartRate() - Try to enable heart rate');
console.log('   monitorHeartRateLogs() - Monitor console logs');

console.log('\n🚀 Ready! Run runQuickTest() to start');