// Heart Rate Flow Test Script for Browser Console
// Copy and paste this entire script into the browser console

console.log('🔍 Heart Rate Flow Test Started');

// Test Configuration
const TEST_CONFIG = {
    expectedHeartRateRange: [100, 200],
    expectedVariabilityRange: [0, 50],
    gpxHeartRateTagPattern: /<gpxtpx:hr>(\d+)<\/gpxtpx:hr>/g,
    gpxNamespacePattern: /xmlns:gpxtpx="http:\/\/www\.garmin\.com\/xmlschemas\/TrackPointExtension\/v1"/
};

// Test Results
let testResults = {
    uiToggleFound: false,
    uiToggleEnabled: false,
    settingsValid: false,
    heartRateEnabled: false
};

// Function 1: Check Heart Rate Toggle
function checkHeartRateToggle() {
    console.log('\n📋 Checking Heart Rate Toggle...');
    
    // Look for toggle elements
    const possibleToggles = document.querySelectorAll('[role="switch"], .cursor-pointer, input[type="checkbox"]');
    
    for (const toggle of possibleToggles) {
        const parent = toggle.closest('div');
        const textContent = parent ? parent.textContent : toggle.textContent;
        
        if (textContent && textContent.toLowerCase().includes('heart rate')) {
            testResults.uiToggleFound = true;
            console.log('✅ Heart rate toggle found:', toggle);
            
            // Check if enabled
            const isEnabled = toggle.checked || 
                            toggle.classList.contains('bg-orange-500') ||
                            toggle.querySelector('.translate-x-6') ||
                            toggle.getAttribute('aria-checked') === 'true';
            
            testResults.uiToggleEnabled = isEnabled;
            console.log(`🔘 Toggle state: ${isEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
            
            if (!isEnabled) {
                console.log('💡 Click the toggle to enable heart rate');
                console.log('🖱️ You can click it manually or run: enableHeartRateToggle()');
            }
            
            return toggle;
        }
    }
    
    console.log('❌ Heart rate toggle not found');
    return null;
}

// Function 2: Enable Heart Rate Toggle
function enableHeartRateToggle() {
    console.log('\n🖱️ Attempting to enable heart rate toggle...');
    
    const toggle = checkHeartRateToggle();
    if (toggle && !testResults.uiToggleEnabled) {
        toggle.click();
        setTimeout(() => {
            checkHeartRateToggle();
            checkSettings();
        }, 500);
    } else if (testResults.uiToggleEnabled) {
        console.log('✅ Heart rate toggle is already enabled');
    }
}

// Function 3: Check Settings
function checkSettings() {
    console.log('\n💾 Checking Settings...');
    
    try {
        const storedSettings = localStorage.getItem('paceHeartRateSettings');
        
        if (storedSettings) {
            const settings = JSON.parse(storedSettings);
            console.log('📦 Current settings:', settings);
            
            if (settings.includeHeartRate) {
                testResults.heartRateEnabled = true;
                testResults.settingsValid = true;
                console.log('✅ Heart rate is ENABLED in settings');
                console.log(`❤️ Average Heart Rate: ${settings.averageHeartRate} bpm`);
                console.log(`📊 Heart Rate Variability: ${settings.heartRateVariability}%`);
            } else {
                console.log('❌ Heart rate is DISABLED in settings');
                console.log('💡 Enable the heart rate toggle in the UI');
            }
            
            return settings;
        } else {
            console.log('❌ No settings found in localStorage');
        }
    } catch (error) {
        console.log('❌ Error reading settings:', error);
    }
    
    return null;
}

// Function 4: Monitor Console for Heart Rate Logs
function monitorHeartRateLogs() {
    console.log('\n👂 Monitoring console for heart rate logs...');
    console.log('💡 Generate a route now to see heart rate generation logs');
    
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalDebug = console.debug;
    
    let heartRateLogsFound = [];
    
    function interceptLog(originalMethod, methodName) {
        return function(...args) {
            const message = args.join(' ');
            
            // Check for heart rate related messages
            if (message.toLowerCase().includes('heart rate') || 
                message.toLowerCase().includes('includeheartrate') ||
                message.toLowerCase().includes('hr generation') ||
                message.toLowerCase().includes('bpm')) {
                
                heartRateLogsFound.push(`[${methodName}] ${message}`);
                console.log(`🔍 [HR-${methodName.toUpperCase()}]:`, ...args);
            }
            
            return originalMethod.apply(console, args);
        };
    }
    
    console.log = interceptLog(originalLog, 'log');
    console.info = interceptLog(originalInfo, 'info');
    console.debug = interceptLog(originalDebug, 'debug');
    
    // Restore after 30 seconds
    setTimeout(() => {
        console.log = originalLog;
        console.info = originalInfo;
        console.debug = originalDebug;
        
        console.log('\n📊 Heart Rate Log Monitoring Results:');
        if (heartRateLogsFound.length > 0) {
            console.log('✅ Heart rate logs captured:');
            heartRateLogsFound.forEach(log => console.log('  ', log));
        } else {
            console.log('❌ No heart rate logs found');
            console.log('💡 Make sure heart rate is enabled and generate a route');
        }
    }, 30000);
    
    return heartRateLogsFound;
}

// Function 5: Validate GPX Content
function validateGPXContent(gpxContent) {
    console.log('\n📄 Validating GPX Content...');
    
    if (!gpxContent) {
        console.log('❌ No GPX content provided');
        console.log('💡 Usage: validateGPXContent("<gpx>...</gpx>")');
        return false;
    }
    
    // Check for heart rate namespace
    if (TEST_CONFIG.gpxNamespacePattern.test(gpxContent)) {
        console.log('✅ GPX heart rate namespace found');
    } else {
        console.log('❌ GPX heart rate namespace missing');
        console.log('💡 Expected: xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"');
        return false;
    }
    
    // Check for heart rate data
    const heartRateMatches = gpxContent.match(TEST_CONFIG.gpxHeartRateTagPattern);
    
    if (heartRateMatches && heartRateMatches.length > 0) {
        console.log(`✅ Heart rate data found: ${heartRateMatches.length} data points`);
        
        // Extract heart rate values
        const heartRateValues = heartRateMatches.map(match => {
            const hrMatch = match.match(/(\d+)/);
            return hrMatch ? parseInt(hrMatch[1]) : null;
        }).filter(hr => hr !== null);
        
        console.log('❤️ Heart rate values:', heartRateValues.slice(0, 10), heartRateValues.length > 10 ? '...' : '');
        
        // Validate ranges
        const validValues = heartRateValues.filter(hr => 
            hr >= TEST_CONFIG.expectedHeartRateRange[0] && 
            hr <= TEST_CONFIG.expectedHeartRateRange[1]
        );
        
        console.log(`📊 Valid heart rate values: ${validValues.length}/${heartRateValues.length}`);
        
        if (validValues.length === heartRateValues.length) {
            console.log('✅ All heart rate values are within expected range (100-200 bpm)');
            return true;
        } else {
            console.log('⚠️ Some heart rate values are outside expected range');
        }
    } else {
        console.log('❌ No heart rate data found in GPX');
        console.log('💡 Expected tags like: <gpxtpx:hr>140</gpxtpx:hr>');
        return false;
    }
    
    return false;
}

// Function 6: Complete Test
function runCompleteTest() {
    console.log('🚀 Running Complete Heart Rate Test\n');
    
    // Reset results
    testResults = {
        uiToggleFound: false,
        uiToggleEnabled: false,
        settingsValid: false,
        heartRateEnabled: false
    };
    
    // Run tests
    checkHeartRateToggle();
    checkSettings();
    
    // Generate report
    console.log('\n📋 Test Summary');
    console.log('='.repeat(40));
    console.log(`UI Toggle Found: ${testResults.uiToggleFound ? '✅' : '❌'}`);
    console.log(`UI Toggle Enabled: ${testResults.uiToggleEnabled ? '✅' : '❌'}`);
    console.log(`Settings Valid: ${testResults.settingsValid ? '✅' : '❌'}`);
    console.log(`Heart Rate Enabled: ${testResults.heartRateEnabled ? '✅' : '❌'}`);
    console.log('='.repeat(40));
    
    if (testResults.heartRateEnabled) {
        console.log('🎉 Heart rate is properly enabled!');
        console.log('\n📝 Next steps:');
        console.log('1. 🗺️ Generate a route (add waypoints and click generate)');
        console.log('2. 👂 Run monitorHeartRateLogs() to watch for heart rate generation');
        console.log('3. 📥 Export GPX file');
        console.log('4. 🔍 Run validateGPXContent(gpxFileContent) with exported content');
    } else {
        console.log('⚠️ Heart rate is not enabled. Run enableHeartRateToggle() to fix this.');
    }
    
    return testResults;
}

// Function 7: Test with Sample GPX
function testSampleGPX() {
    console.log('\n🧪 Testing with Sample GPX...');
    
    const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="QoderFakeRun" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <name>Test Route</name>
    <trkseg>
      <trkpt lat="45.1234" lon="17.5678">
        <time>2024-01-20T10:00:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>140</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <trkpt lat="45.1235" lon="17.5679">
        <time>2024-01-20T10:00:10Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>142</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;
    
    return validateGPXContent(sampleGPX);
}

// Make functions available globally
window.heartRateTest = {
    checkToggle: checkHeartRateToggle,
    enableToggle: enableHeartRateToggle,
    checkSettings: checkSettings,
    monitorLogs: monitorHeartRateLogs,
    validateGPX: validateGPXContent,
    runComplete: runCompleteTest,
    testSample: testSampleGPX,
    getResults: () => testResults
};

// Display available functions
console.log('\n🎯 Heart Rate Test Functions Available:');
console.log('   heartRateTest.runComplete() - Run complete test');
console.log('   heartRateTest.enableToggle() - Enable heart rate toggle');
console.log('   heartRateTest.checkSettings() - Check current settings');
console.log('   heartRateTest.monitorLogs() - Monitor heart rate logs');
console.log('   heartRateTest.validateGPX(content) - Validate GPX content');
console.log('   heartRateTest.testSample() - Test with sample GPX');

// Auto-run initial test
setTimeout(() => {
    console.log('\n🚀 Auto-running initial test...');
    runCompleteTest();
}, 1000);

console.log('\n✨ Heart Rate Test Script Loaded Successfully!');
console.log('💡 Run heartRateTest.runComplete() to start testing');