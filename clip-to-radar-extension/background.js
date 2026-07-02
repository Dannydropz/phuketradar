// Background service worker for Clip to Radar extension

// Listen for messages from content script or options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clip_post') {
    handleClipRequest(request.payload)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error('Error in background processing:', error);
        sendResponse({ success: false, error: error.message || 'Unknown background error' });
      });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'test_connection') {
    handleTestConnection(request.url, request.apiKey)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.warn('Error testing connection:', error);
        sendResponse({ success: false, error: error.message || 'Unknown connection error' });
      });
    return true; // Keep message channel open for async response
  }
});

// Stored notification details to handle clicks
const notificationUrlMap = new Map();

// Listen for notification clicks to open the editor tab
chrome.notifications.onClicked.addListener((notificationId) => {
  const url = notificationUrlMap.get(notificationId);
  if (url) {
    chrome.tabs.create({ url: url });
    notificationUrlMap.delete(notificationId);
  }
});

// Helper to get configuration
function getCredentials() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backendUrl', 'apiKey'], (result) => {
      resolve({
        backendUrl: result.backendUrl || 'https://phuketradar.com',
        apiKey: result.apiKey || ''
      });
    });
  });
}

// Handle connection test from options page (bypasses CORS using background context)
async function handleTestConnection(url, apiKey) {
  try {
    const testUrl = `${url}/api/admin/clips/auth-test`;
    console.log('[BG] Testing connection to:', testUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const res = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      return { success: data.success, status: res.status };
    } else {
      return { success: false, status: res.status };
    }
  } catch (err) {
    console.warn('[BG] Connection test failed:', err);
    return { success: false, error: err.name === 'AbortError' ? 'Connection timed out' : err.message };
  }
}

// Handle the clip extraction, image fetches, and backend POST
async function handleClipRequest(payload) {
  const { backendUrl, apiKey } = await getCredentials();
  
  if (!apiKey) {
    showNotification('config_error', 'Clip to Radar: Setup Required', 'Please configure your API Key in the extension options first.');
    return { success: false, error: 'API Key not configured. Open options.' };
  }
  
  console.log('[BG] Sourcing credentials. Base URL:', backendUrl);
  
  // Create FormData payload
  const formData = new FormData();
  formData.append('sourceUrl', payload.sourceUrl);
  formData.append('caption', payload.caption);
  formData.append('authorName', payload.authorName || '');
  formData.append('timestamp', payload.timestamp || '');
  
  // Download each image cross-origin as a blob and append
  const imageUrls = payload.imageUrls || [];
  console.log(`[BG] Fetching ${imageUrls.length} post images cross-origin...`);
  
  let successfulImageCount = 0;
  for (let i = 0; i < imageUrls.length; i++) {
    const imgUrl = imageUrls[i];
    try {
      const response = await fetch(imgUrl);
      if (response.ok) {
        const blob = await response.blob();
        
        let mimeType = blob.type || 'image/jpeg';
        let extension = 'jpg';
        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('webp')) extension = 'webp';
        else if (mimeType.includes('gif')) extension = 'gif';
        
        formData.append('images[]', blob, `clipped-image-${Date.now()}-${i}.${extension}`);
        successfulImageCount++;
      } else {
        console.warn(`[BG] Non-ok response fetching image URL: ${imgUrl}`);
      }
    } catch (err) {
      console.error(`[BG] Error fetching image URL: ${imgUrl}`, err);
    }
  }
  
  console.log(`[BG] Prepared ${successfulImageCount} image blobs out of ${imageUrls.length} total.`);
  
  // POST to the backend endpoint
  const endpoint = `${backendUrl}/api/admin/clips`;
  console.log('[BG] Posting payload to backend:', endpoint);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey
    },
    body: formData
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('[BG] Success response from server:', data);
    
    // Build direct editor url: /admin?articleId=X
    const editorUrl = `${backendUrl}/admin?articleId=${data.articleId}`;
    const notificationId = `success-${Date.now()}`;
    
    // Map notification ID to editor URL
    notificationUrlMap.set(notificationId, editorUrl);
    
    showNotification(
      notificationId,
      'Story Clipped ✓',
      `"${data.title?.substring(0, 45) || 'Draft created'}..." is ready for review. Click to edit.`
    );
    
    return { success: true, articleId: data.articleId };
  } else {
    const status = response.status;
    let errorMessage = `Server responded with status ${status}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // ignore
    }
    
    console.error(`[BG] Backend clipping failed (${status}):`, errorMessage);
    
    if (status === 409) {
      showNotification('duplicate_error', 'Story Already Exists', 'This Facebook post has already been clipped to Phuket Radar.');
      return { success: false, status: 409, error: 'Already exists' };
    } else {
      showNotification('api_error', 'Clipping Failed', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}

// Show desktop notifications
function showNotification(id, title, message) {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icon.png',
    title: title,
    message: message,
    priority: 2
  });
}
