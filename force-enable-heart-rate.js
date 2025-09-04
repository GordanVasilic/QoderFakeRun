// Force enable heart rate in localStorage
console.log('🔄 Force enabling heart rate in localStorage...');

// Get current settings
const currentSettings = JSON.parse(localStorage.getItem('paceHeartRateSettings') || '{}');
console.log('Current settings:', currentSettings);

// Create new settings with heart rate enabled
const newSettings = {
    averagePace: currentSettings.averagePace || 5.5,
    paceInconsistency: currentSettings.paceInconsistency || 15,
    includeHeartRate: true,
    averageHeartRate: currentSettings.averageHeartRate || 150,
    heartRateVariability: currentSettings.heartRateVariability || 15
};

// Save to localStorage
localStorage.setItem('paceHeartRateSettings', JSON.stringify(newSettings));
console.log('✅ Heart rate enabled in localStorage:', newSettings);

// Verify it was saved
const verifySettings = JSON.parse(localStorage.getItem('paceHeartRateSettings') || '{}');
console.log('✅ Verified settings:', verifySettings);

// Trigger a storage event to notify React components
window.dispatchEvent(new StorageEvent('storage', {
    key: 'paceHeartRateSettings',
    newValue: JSON.stringify(newSettings),
    oldValue: JSON.stringify(currentSettings)
}));

console.log('🚀 Heart rate should now be enabled. Refresh the page to see changes.');

// Also set a flag to indicate this was manually enabled
localStorage.setItem('heartRateManuallyEnabled', 'true');

console.log('💡 You can now generate a new route and the heart rate data should be included in the GPX file.');