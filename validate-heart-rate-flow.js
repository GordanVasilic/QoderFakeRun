// Heart Rate Flow Validation Script
// This script validates the complete heart rate data flow from UI to GPX export

console.log('🔍 Heart Rate Flow Validation Started');

// Configuration
const VALIDATION_CONFIG = {
    expectedHeartRateRange: [100, 200],
    expectedVariabilityRange: [0, 50],
    gpxHeartRateTagPattern: /<gpxtpx:hr>(\d+)<\/gpxtpx:hr>/g,
    gpxNamespacePattern: /xmlns:gpxtpx="http:\/\/www\.garmin\.com\/xmlschemas\/TrackPointExtension\/v1"/,
    debugLogPatterns: [
        /includeHeartRate:\s*true/i,
        /heart rate generation started/i,
        /heart rate data generated/i
    ]
};

// Validation Results
let validationResults = {
    uiToggleFound: false,
    uiToggleEnabled: false,
    settingsStored: false,
    settingsValid: false,
    debugLogsPresent: false,
    gpxFormatValid: false,
    heartRateDataPresent: false
};

// Step 1: Validate UI Toggle
function validateUIToggle() {
    console.log('\n📋 Step 1: Validating UI Toggle');
    
    // Look for heart rate toggle elements
    const toggleSelectors = [
        '[role="switch"]',
        '.cursor-pointer',
        'input[type="checkbox"]',
        '.toggle',
        '.switch'
    ];
    
    let heartRateToggle = null;
    
    for (const selector of toggleSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const parent = element.closest('div');
            const textContent = parent ? parent.textContent : element.textContent;
            
            if (textContent && textContent.toLowerCase().includes('heart rate')) {
                heartRateToggle = element;
                validationResults.uiToggleFound = true;
                console.log('✅ Heart rate toggle found:', element);
                
                // Check if toggle is enabled
                const isEnabled = element.checked || 
                                element.classList.contains('bg-orange-500') ||
                                element.querySelector('.translate-x-6');
                
                validationResults.uiToggleEnabled = isEnabled;
                console.log(`🔘 Toggle state: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
                
                return heartRateToggle;
            }
        }
    }
    
    if (!heartRateToggle) {
        console.log('❌ Heart rate toggle not found');
    }
    
    return heartRateToggle;
}

// Step 2: Validate Settings Storage
function validateSettingsStorage() {
    console.log('\n💾 Step 2: Validating Settings Storage');
    
    try {
        const storedSettings = localStorage.getItem('paceHeartRateSettings');
        
        if (storedSettings) {
            validationResults.settingsStored = true;
            console.log('✅ Settings found in localStorage');
            
            const settings = JSON.parse(storedSettings);
            console.log('📦 Stored settings:', settings);
            
            // Validate settings structure
            const requiredFields = ['averagePace', 'paceInconsistency', 'includeHeartRate', 'averageHeartRate', 'heartRateVariability'];
            const hasAllFields = requiredFields.every(field => settings.hasOwnProperty(field));
            
            if (hasAllFields) {
                validationResults.settingsValid = true;
                console.log('✅ Settings structure is valid');
                
                // Validate heart rate specific settings
                if (settings.includeHeartRate) {
                    const hrInRange = settings.averageHeartRate >= VALIDATION_CONFIG.expectedHeartRateRange[0] && 
                                    settings.averageHeartRate <= VALIDATION_CONFIG.expectedHeartRateRange[1];
                    const variabilityInRange = settings.heartRateVariability >= VALIDATION_CONFIG.expectedVariabilityRange[0] && 
                                             settings.heartRateVariability <= VALIDATION_CONFIG.expectedVariabilityRange[1];
                    
                    console.log(`❤️ Heart Rate: ${settings.averageHeartRate} bpm ${hrInRange ? '✅' : '❌'}`);
                    console.log(`📊 Variability: ${settings.heartRateVariability}% ${variabilityInRange ? '✅' : '❌'}`);
                } else {
                    console.log('⚠️ Heart rate is disabled in settings');
                }
            } else {
                console.log('❌ Settings structure is invalid, missing fields:', 
                          requiredFields.filter(field => !settings.hasOwnProperty(field)));
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

// Step 3: Monitor Debug Logs
function monitorDebugLogs() {
    console.log('\n👂 Step 3: Monitoring Debug Logs');
    
    const capturedLogs = [];
    const originalConsole = {
        log: console.log,
        info: console.info,
        debug: console.debug
    };
    
    function interceptConsole(method, methodName) {
        return function(...args) {
            const message = args.join(' ');
            
            // Check for heart rate related patterns
            VALIDATION_CONFIG.debugLogPatterns.forEach(pattern => {
                if (pattern.test(message)) {
                    capturedLogs.push(`[${methodName}] ${message}`);
                    console.log(`🔍 [HR-${methodName.toUpperCase()}]:`, ...args);
                }
            });
            
            return originalConsole[method].apply(console, args);
        };
    }
    
    // Intercept console methods
    console.log = interceptConsole(originalConsole.log, 'log');
    console.info = interceptConsole(originalConsole.info, 'info');
    console.debug = interceptConsole(originalConsole.debug, 'debug');
    
    console.log('📝 Debug log monitoring active. Generate a route to see heart rate logs.');
    
    // Restore console after 60 seconds and report results
    setTimeout(() => {
        console.log = originalConsole.log;
        console.info = originalConsole.info;
        console.debug = originalConsole.debug;
        
        console.log('\n📊 Debug Log Results:');
        if (capturedLogs.length > 0) {
            validationResults.debugLogsPresent = true;
            console.log('✅ Heart rate debug logs found:');
            capturedLogs.forEach(log => console.log('  ', log));
        } else {
            console.log('❌ No heart rate debug logs captured');
            console.log('💡 Make sure to generate a route while monitoring is active');
        }
    }, 60000);
    
    return capturedLogs;
}

// Step 4: Validate GPX Format
function validateGPXFormat(gpxContent) {
    console.log('\n📄 Step 4: Validating GPX Format');
    
    if (!gpxContent) {
        console.log('❌ No GPX content provided');
        return false;
    }
    
    // Check for GPX namespace
    if (VALIDATION_CONFIG.gpxNamespacePattern.test(gpxContent)) {
        validationResults.gpxFormatValid = true;
        console.log('✅ GPX namespace for heart rate extensions found');
    } else {
        console.log('❌ GPX namespace for heart rate extensions missing');
        console.log('💡 Expected: xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"');
    }
    
    // Check for heart rate data
    const heartRateMatches = gpxContent.match(VALIDATION_CONFIG.gpxHeartRateTagPattern);
    
    if (heartRateMatches && heartRateMatches.length > 0) {
        validationResults.heartRateDataPresent = true;
        console.log(`✅ Heart rate data found: ${heartRateMatches.length} data points`);
        
        // Extract and validate heart rate values
        const heartRateValues = heartRateMatches.map(match => {
            const hrMatch = match.match(/(\d+)/);
            return hrMatch ? parseInt(hrMatch[1]) : null;
        }).filter(hr => hr !== null);
        
        console.log('❤️ Heart rate values:', heartRateValues);
        
        // Validate heart rate ranges
        const validValues = heartRateValues.filter(hr => 
            hr >= VALIDATION_CONFIG.expectedHeartRateRange[0] && 
            hr <= VALIDATION_CONFIG.expectedHeartRateRange[1]
        );
        
        console.log(`📊 Valid heart rate values: ${validValues.length}/${heartRateValues.length}`);
        
        if (validValues.length === heartRateValues.length) {
            console.log('✅ All heart rate values are within expected range');
        } else {
            console.log('⚠️ Some heart rate values are outside expected range');
        }
    } else {
        console.log('❌ No heart rate data found in GPX');
        console.log('💡 Expected tags like: <gpxtpx:hr>140</gpxtpx:hr>');
    }
    
    return validationResults.gpxFormatValid && validationResults.heartRateDataPresent;
}

// Step 5: Generate Validation Report
function generateValidationReport() {
    console.log('\n📋 Validation Report');
    console.log('='.repeat(50));
    
    const checks = [
        { name: 'UI Toggle Found', result: validationResults.uiToggleFound },
        { name: 'UI Toggle Enabled', result: validationResults.uiToggleEnabled },
        { name: 'Settings Stored', result: validationResults.settingsStored },
        { name: 'Settings Valid', result: validationResults.settingsValid },
        { name: 'Debug Logs Present', result: validationResults.debugLogsPresent },
        { name: 'GPX Format Valid', result: validationResults.gpxFormatValid },
        { name: 'Heart Rate Data Present', result: validationResults.heartRateDataPresent }
    ];
    
    let passedChecks = 0;
    
    checks.forEach(check => {
        const status = check.result ? '✅ PASS' : '❌ FAIL';
        console.log(`${check.name}: ${status}`);
        if (check.result) passedChecks++;
    });
    
    console.log('='.repeat(50));
    console.log(`Overall Score: ${passedChecks}/${checks.length} (${Math.round(passedChecks/checks.length*100)}%)`);
    
    if (passedChecks === checks.length) {
        console.log('🎉 All validations passed! Heart rate functionality is working correctly.');
    } else {
        console.log('⚠️ Some validations failed. Check the issues above.');
        
        // Provide specific recommendations
        if (!validationResults.uiToggleEnabled) {
            console.log('💡 Recommendation: Enable the heart rate toggle in the UI');
        }
        if (!validationResults.debugLogsPresent) {
            console.log('💡 Recommendation: Generate a route to trigger heart rate generation');
        }
        if (!validationResults.heartRateDataPresent) {
            console.log('💡 Recommendation: Check GPX export functionality');
        }
    }
    
    return { passedChecks, totalChecks: checks.length, results: validationResults };
}

// Main validation function
function runCompleteValidation() {
    console.log('🚀 Starting Complete Heart Rate Validation\n');
    
    // Reset results
    validationResults = {
        uiToggleFound: false,
        uiToggleEnabled: false,
        settingsStored: false,
        settingsValid: false,
        debugLogsPresent: false,
        gpxFormatValid: false,
        heartRateDataPresent: false
    };
    
    // Run validation steps
    const toggle = validateUIToggle();
    const settings = validateSettingsStorage();
    monitorDebugLogs();
    
    // Instructions for manual steps
    console.log('\n📝 Manual Steps Required:');
    console.log('1. 🗺️ Generate a route (add waypoints and click generate)');
    console.log('2. 📥 Export GPX file');
    console.log('3. 🔍 Run validateGPXContent(gpxFileContent) with the exported content');
    
    // Return validation helper functions
    return {
        validateGPX: validateGPXFormat,
        generateReport: generateValidationReport,
        getResults: () => validationResults,
        enableHeartRate: () => {
            if (toggle && !validationResults.uiToggleEnabled) {
                console.log('🖱️ Attempting to enable heart rate toggle...');
                toggle.click();
                setTimeout(() => {
                    console.log('✅ Toggle clicked, please check if it\'s now enabled');
                }, 100);
            }
        }
    };
}

// Test GPX content validation with sample
function testGPXValidation() {
    console.log('\n🧪 Testing GPX Validation with Sample Data');
    
    const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="QoderFakeRun" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <trkseg>
      <trkpt lat="45.1234" lon="17.5678">
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>140</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;
    
    validateGPXFormat(sampleGPX);
}

// Export functions for browser console use
if (typeof window !== 'undefined') {
    window.heartRateValidation = {
        runComplete: runCompleteValidation,
        validateGPX: validateGPXFormat,
        generateReport: generateValidationReport,
        testSample: testGPXValidation,
        getResults: () => validationResults
    };
    
    console.log('\n🎯 Heart Rate Validation Functions Available:');
    console.log('   heartRateValidation.runComplete() - Run complete validation');
    console.log('   heartRateValidation.validateGPX(content) - Validate GPX content');
    console.log('   heartRateValidation.generateReport() - Generate validation report');
    console.log('   heartRateValidation.testSample() - Test with sample GPX');
}

// Auto-run test sample on load
if (typeof window !== 'undefined') {
    setTimeout(() => {
        testGPXValidation();
        console.log('\n🚀 Ready! Run heartRateValidation.runComplete() to start full validation');
    }, 1000);
}

module.exports = {
    runCompleteValidation,
    validateGPXFormat,
    generateValidationReport,
    testGPXValidation
};