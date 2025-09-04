# Heart Rate Data Export Guide

## 🎯 Quick Start

To enable heart rate data in your GPX exports, follow these simple steps:

### 1. Enable Heart Rate in Settings

1. **Locate the Settings Panel**: Look for the "Pace & Heart Rate Settings" section in the sidebar
2. **Find the Toggle**: Scroll down to "Include Heart Rate Data" 
3. **Enable the Toggle**: Click the toggle switch to turn it ON (it should turn orange)
4. **Configure Heart Rate**: Adjust the heart rate settings that appear:
   - **Average Heart Rate**: Set your target heart rate (100-200 bpm)
   - **Heart Rate Variability**: Set how much your heart rate varies (0-50%)

### 2. Generate Route with Heart Rate

1. **Create Waypoints**: Add waypoints on the map by clicking
2. **Generate Route**: Click the "Generate Route" button
3. **Verify Heart Rate Data**: Check the console logs for heart rate generation messages

### 3. Export GPX with Heart Rate

1. **Export GPX**: Click the "Export GPX" button
2. **Verify Heart Rate Data**: Open the downloaded GPX file and look for `<gpxtpx:hr>` tags

---

## 🔍 Troubleshooting

### Problem: No Heart Rate Data in GPX

**Check List:**
1. ✅ Heart rate toggle is enabled (orange)
2. ✅ Console shows "includeHeartRate: true"
3. ✅ Console shows "Heart rate generation started"
4. ✅ GPX file contains `<gpxtpx:hr>` tags

### Debug Steps:

1. **Open Browser Console** (F12)
2. **Copy and paste this test script:**

```javascript
// Quick Heart Rate Test
function testHeartRate() {
    console.log('🔍 Testing Heart Rate Settings...');
    
    // Check localStorage
    const settings = localStorage.getItem('paceHeartRateSettings');
    if (settings) {
        const parsed = JSON.parse(settings);
        console.log('Settings:', parsed);
        console.log('Heart Rate Enabled:', parsed.includeHeartRate);
    }
    
    // Find heart rate toggle
    const toggles = document.querySelectorAll('[role="switch"], .cursor-pointer');
    toggles.forEach((toggle, i) => {
        const parent = toggle.closest('div');
        if (parent && parent.textContent.includes('Heart Rate')) {
            console.log(`Found HR toggle ${i}:`, toggle);
        }
    });
}

testHeartRate();
```

3. **Run the test**: Type `testHeartRate()` in console
4. **Check the output** for heart rate settings

---

## 🧪 Testing Heart Rate Export

### Test Script for Browser Console:

```javascript
// Complete Heart Rate Test
function runCompleteTest() {
    console.log('🚀 Running Complete Heart Rate Test');
    
    // 1. Check current settings
    const settings = JSON.parse(localStorage.getItem('paceHeartRateSettings') || '{}');
    console.log('1. Current Settings:', settings);
    console.log('   Heart Rate Enabled:', settings.includeHeartRate ? '✅' : '❌');
    
    // 2. Find and enable heart rate toggle if needed
    if (!settings.includeHeartRate) {
        console.log('2. Attempting to enable heart rate...');
        const toggles = document.querySelectorAll('.cursor-pointer');
        toggles.forEach(toggle => {
            const parent = toggle.closest('div');
            if (parent && parent.textContent.includes('Include Heart Rate Data')) {
                console.log('   Found toggle, clicking...');
                toggle.click();
            }
        });
    } else {
        console.log('2. Heart rate already enabled ✅');
    }
    
    // 3. Monitor for heart rate logs
    console.log('3. Monitoring console for heart rate messages...');
    console.log('   Generate a route now and watch for:');
    console.log('   - "Heart rate generation started"');
    console.log('   - "includeHeartRate: true"');
    console.log('   - "Heart rate data generated"');
    
    // 4. Instructions for GPX verification
    console.log('4. GPX Verification Steps:');
    console.log('   - Export GPX file');
    console.log('   - Open in text editor');
    console.log('   - Search for "<gpxtpx:hr>"');
    console.log('   - Should find heart rate values like: <gpxtpx:hr>140</gpxtpx:hr>');
}

// Run the test
runCompleteTest();
```

---

## 📋 Expected GPX Format

When heart rate is enabled, your GPX file should contain:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="QoderFakeRun" 
     xmlns="http://www.topografix.com/GPX/1/1" 
     xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <name>Generated Route</name>
    <trkseg>
      <trkpt lat="45.1234" lon="17.5678">
        <ele>100</ele>
        <time>2024-01-15T10:00:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>140</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <!-- More track points with heart rate data -->
    </trkseg>
  </trk>
</gpx>
```

**Key Elements:**
- `xmlns:gpxtpx` namespace declaration
- `<extensions>` section in each track point
- `<gpxtpx:TrackPointExtension>` wrapper
- `<gpxtpx:hr>` tags with heart rate values

---

## 🔧 Advanced Debugging

### Check Component State:

```javascript
// Advanced debugging script
function debugHeartRateFlow() {
    console.log('🔧 Advanced Heart Rate Debugging');
    
    // Check React component state (if accessible)
    const reactElements = document.querySelectorAll('[data-reactroot], #__next');
    console.log('React elements found:', reactElements.length);
    
    // Check for heart rate related elements
    const hrElements = document.querySelectorAll('*');
    const hrRelated = Array.from(hrElements).filter(el => 
        el.textContent && el.textContent.toLowerCase().includes('heart')
    );
    console.log('Heart rate related elements:', hrRelated.length);
    
    // Check localStorage in detail
    console.log('LocalStorage keys:', Object.keys(localStorage));
    Object.keys(localStorage).forEach(key => {
        if (key.toLowerCase().includes('heart') || key.toLowerCase().includes('pace')) {
            console.log(`${key}:`, localStorage.getItem(key));
        }
    });
    
    // Monitor network requests
    console.log('Monitor network tab for API calls to /api/files/generate');
}

debugHeartRateFlow();
```

---

## 📞 Support

If you're still having issues:

1. **Check Browser Console**: Look for error messages
2. **Verify Settings**: Ensure heart rate toggle is visually enabled (orange)
3. **Test with Sample Data**: Use the test scripts above
4. **Check GPX Content**: Open exported file in text editor
5. **Network Tab**: Monitor API calls during export

**Common Issues:**
- Toggle appears enabled but localStorage shows `includeHeartRate: false`
- Console shows heart rate generation but GPX has no `<gpxtpx:hr>` tags
- Heart rate settings not persisting between sessions

**Quick Fix:**
```javascript
// Force enable heart rate in localStorage
localStorage.setItem('paceHeartRateSettings', JSON.stringify({
    averagePace: 5.5,
    paceInconsistency: 30,
    includeHeartRate: true,
    averageHeartRate: 140,
    heartRateVariability: 25
}));
console.log('Heart rate settings forced to enabled');
// Refresh the page
```