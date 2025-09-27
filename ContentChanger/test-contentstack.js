// Contentstack API Test Script
// This will help diagnose Contentstack connection issues

const testContentstack = async (config) => {
  console.log('🔍 Testing Contentstack Configuration...');
  console.log('API Key:', config.apiKey ? '✅ Set' : '❌ Missing');
  console.log('Delivery Token:', config.deliveryToken ? '✅ Set' : '❌ Missing');
  console.log('Environment:', config.environment || '❌ Missing');
  console.log('Entry UID:', config.entryUid || '❌ Missing');
  console.log('');

  if (!config.apiKey || !config.deliveryToken || !config.environment || !config.entryUid) {
    console.log('❌ Missing required configuration. Please provide all fields.');
    return;
  }

  try {
    console.log('🌐 Testing API connection...');
    
    // Test 1: Basic API connectivity
    const testUrl = `https://cdn.contentstack.io/v3/content_types?environment=${config.environment}`;
    console.log('Testing URL:', testUrl);
    
    const response = await fetch(testUrl, {
      headers: {
        'api_key': config.apiKey,
        'access_token': config.deliveryToken,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Error Response:', errorText);
      
      if (response.status === 401) {
        console.log('🔑 Authentication Error: Check your API Key and Delivery Token');
      } else if (response.status === 403) {
        console.log('🚫 Permission Error: Check if your Delivery Token has access to this environment');
      } else if (response.status === 404) {
        console.log('🔍 Not Found: Check your environment name and API endpoint');
      }
      return;
    }

    const data = await response.json();
    console.log('✅ API Connection Successful!');
    console.log('Available Content Types:', data.content_types?.length || 0);

    // Test 2: Specific entry fetch
    console.log('');
    console.log('📄 Testing specific entry fetch...');
    
    const entryUrl = `https://cdn.contentstack.io/v3/content_types/entry/entries/${config.entryUid}?environment=${config.environment}`;
    console.log('Entry URL:', entryUrl);
    
    const entryResponse = await fetch(entryUrl, {
      headers: {
        'api_key': config.apiKey,
        'access_token': config.deliveryToken,
        'Content-Type': 'application/json'
      }
    });

    console.log('Entry Response Status:', entryResponse.status);

    if (!entryResponse.ok) {
      const errorText = await entryResponse.text();
      console.log('❌ Entry Error Response:', errorText);
      
      if (entryResponse.status === 404) {
        console.log('🔍 Entry Not Found: Check your Entry UID and ensure the entry is published');
      }
      return;
    }

    const entryData = await entryResponse.json();
    console.log('✅ Entry Fetch Successful!');
    console.log('Entry Data Keys:', Object.keys(entryData.entry || {}));
    
    // Extract content
    const content = entryData.entry?.content || entryData.entry?.body || JSON.stringify(entryData.entry, null, 2);
    console.log('Content Preview:', content.substring(0, 100) + '...');
    
    return {
      success: true,
      content: content,
      entry: entryData.entry
    };

  } catch (error) {
    console.log('❌ Network Error:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('🌐 Network Issue: Check your internet connection');
    } else if (error.message.includes('CORS')) {
      console.log('🚫 CORS Error: This is expected when testing from browser');
    }
    
    return { success: false, error: error.message };
  }
};

// Export for use in the application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testContentstack };
} else {
  window.testContentstack = testContentstack;
}

console.log('📋 Contentstack Test Script Loaded');
console.log('Usage: testContentstack({ apiKey: "...", deliveryToken: "...", environment: "...", entryUid: "..." })');
