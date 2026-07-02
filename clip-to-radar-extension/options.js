// Options page logic for storing backend credentials

const statusEl = document.getElementById('status');
const backendUrlInput = document.getElementById('backend-url');
const apiKeyInput = document.getElementById('api-key');

// Load stored values
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['backendUrl', 'apiKey'], (result) => {
    if (result.backendUrl) {
      backendUrlInput.value = result.backendUrl;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
});

// Helper to show status message
function showStatus(message, type) {
  statusEl.className = 'status-msg';
  statusEl.textContent = message;
  
  if (type === 'success') {
    statusEl.classList.add('status-success');
  } else if (type === 'error') {
    statusEl.classList.add('status-error');
  } else if (type === 'checking') {
    statusEl.classList.add('status-checking');
  }
  
  statusEl.style.display = 'block';
  
  if (type !== 'checking') {
    setTimeout(() => {
      statusEl.style.opacity = '0';
      setTimeout(() => {
        statusEl.style.display = 'none';
        statusEl.style.opacity = '1';
      }, 300);
    }, 4000);
  }
}

// Save configuration
document.getElementById('options-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  let url = backendUrlInput.value.trim();
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  // Strip trailing slash if present
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  const key = apiKeyInput.value.trim();
  
  chrome.storage.local.set({
    backendUrl: url,
    apiKey: key
  }, () => {
    // Reflect normalized URL in input
    backendUrlInput.value = url;
    showStatus('Configuration saved successfully! ✓', 'success');
  });
});

// Test connection by delegating to background script to bypass CORS
document.getElementById('test-btn').addEventListener('click', () => {
  let url = backendUrlInput.value.trim();
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  const key = apiKeyInput.value.trim();
  
  if (!url || !key) {
    showStatus('Please enter both URL and API Key first.', 'error');
    return;
  }
  
  // Reflect normalized URL in input
  backendUrlInput.value = url;
  
  showStatus('Testing connection...', 'checking');
  
  // Delegate fetch to background.js to bypass CORS restrictions
  chrome.runtime.sendMessage({
    action: 'test_connection',
    url: url,
    apiKey: key
  }, (response) => {
    if (!response) {
      const error = chrome.runtime.lastError?.message || 'Could not communicate with background script.';
      showStatus(`Error: ${error}`, 'error');
      return;
    }
    
    if (response.success) {
      showStatus('Connection successful! Connected to Phuket Radar. ✓', 'success');
    } else if (response.status === 401) {
      showStatus('Authentication failed: Invalid API key.', 'error');
    } else if (response.status) {
      showStatus(`Server error: received status ${response.status}`, 'error');
    } else {
      showStatus(`Could not connect: ${response.error || 'Connection error'}`, 'error');
    }
  });
});
