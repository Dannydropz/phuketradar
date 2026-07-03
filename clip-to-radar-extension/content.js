// Content script for Clip to Radar

// Inject custom styles for the Clip button
const style = document.createElement('style');
style.textContent = `
  .clip-radar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background-color: rgba(249, 115, 22, 0.1) !important;
    border: 1px solid rgba(249, 115, 22, 0.3) !important;
    border-radius: 9999px !important;
    padding: 6px 14px !important;
    margin: 4px 6px !important;
    color: #f97316 !important;
    font-family: inherit !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
    outline: none !important;
    user-select: none !important;
    z-index: 999 !important;
    position: relative !important;
  }
  
  .clip-radar-btn:hover {
    background-color: rgba(249, 115, 22, 0.2) !important;
    border-color: rgba(249, 115, 22, 0.6) !important;
    transform: scale(1.03) !important;
  }
  
  .clip-radar-btn:active {
    transform: scale(0.97) !important;
  }
  
  .clip-radar-btn.clipping {
    background-color: rgba(234, 88, 12, 0.1) !important;
    border-color: rgba(234, 88, 12, 0.4) !important;
    color: #ea580c !important;
    cursor: not-allowed !important;
    opacity: 0.8 !important;
  }
  
  .clip-radar-btn.success {
    background-color: rgba(16, 185, 129, 0.1) !important;
    border-color: rgba(16, 185, 129, 0.4) !important;
    color: #10b981 !important;
  }
  
  .clip-radar-btn.failed {
    background-color: rgba(239, 68, 68, 0.1) !important;
    border-color: rgba(239, 68, 68, 0.4) !important;
    color: #ef4444 !important;
  }
  
  .clip-radar-btn.exists {
    background-color: rgba(168, 85, 247, 0.1) !important;
    border-color: rgba(168, 85, 247, 0.4) !important;
    color: #a855f7 !important;
  }
`;
document.head.appendChild(style);

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Walk up from a button to find the nearest post-level container
function findPostContainer(element) {
  let current = element;
  let depth = 0;
  while (current && depth < 30) {
    // Check for role="article" 
    if (current.getAttribute('role') === 'article') {
      return current;
    }
    // Check for data-pagelet feed units
    const pagelet = current.getAttribute('data-pagelet');
    if (pagelet && pagelet.startsWith('FeedUnit_')) {
      return current;
    }
    current = current.parentElement;
    depth++;
  }
  return element.closest('[role="article"]') || document.body;
}

// Extract Facebook Post URL (permalink)
function extractPostUrl(postEl) {
  const links = Array.from(postEl.querySelectorAll('a[href]'));
  
  const fbPatterns = [
    /\/posts\/\d+/,
    /\/posts\/pfbid/,
    /\/permalink\.php\?story_fbid=/,
    /\/story\.php\?story_fbid=/,
    /\/permalink\/\d+/,
    /\/permalink\/pfbid/,
    /\/videos\/\d+/,
    /\/photo\.php\?fbid=/,
    /\/photo\/\?fbid=/,
    /\/groups\/[^/]+\/permalink\/\d+/,
    /\/groups\/[^/]+\/permalink\/pfbid/,
    /\/share\/[a-zA-Z0-9]+/,
    /\/reel\/\d+/
  ];

  for (const link of links) {
    const href = link.href;
    if (!href) continue;
    
    if (fbPatterns.some(pattern => pattern.test(href))) {
      try {
        const urlObj = new URL(href);
        const cleanParams = new URLSearchParams();
        ['story_fbid', 'fbid', 'id', 'substory_index'].forEach(key => {
          if (urlObj.searchParams.has(key)) {
            cleanParams.set(key, urlObj.searchParams.get(key));
          }
        });
        urlObj.search = cleanParams.toString();
        let cleanUrl = urlObj.toString();
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
        return cleanUrl;
      } catch (e) {
        return href;
      }
    }
  }
  
  // Fallback: use current page URL if it's a permalink page
  const currentUrl = window.location.href;
  if (fbPatterns.some(pattern => pattern.test(currentUrl))) {
    return currentUrl;
  }
  
  return null;
}

// Extract Author/Page name
function extractAuthorName(postEl) {
  // Look for any heading element containing a link
  const headings = postEl.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
  for (const heading of headings) {
    const link = heading.querySelector('a');
    if (link && link.textContent?.trim().length > 1) {
      return link.textContent.trim();
    }
    if (heading.textContent?.trim().length > 1) {
      return heading.textContent.trim();
    }
  }
  
  const strongEl = postEl.querySelector('strong a, a strong');
  if (strongEl && strongEl.textContent) {
    return strongEl.textContent.trim();
  }
  
  return "Unknown Facebook Author";
}

// Extract timestamp text
function extractTimestamp(postEl) {
  const links = Array.from(postEl.querySelectorAll('a[href]'));
  for (const link of links) {
    const label = link.getAttribute('aria-label');
    if (label && (label.includes('ago') || label.includes('Yesterday') || /\d/.test(label))) {
      return label.trim();
    }
    
    const href = link.href;
    if (href && (href.includes('/posts/') || href.includes('/permalink/') || href.includes('story.php'))) {
      const text = link.textContent?.trim();
      if (text && text.length > 0 && text.length < 30) {
        return text;
      }
    }
  }
  return null;
}

// Extract post images (only from the main post area, not comments)
function extractImages(postEl) {
  const images = [];
  const allImgs = Array.from(postEl.querySelectorAll('img'));
  
  allImgs.forEach(img => {
    const src = img.src;
    if (!src) return;
    
    // Filter out emojis and resource images
    if (src.includes('/images/emoji') || src.includes('emoji.php') || src.includes('rsrc.php')) {
      return;
    }
    
    // Filter out small images (avatars, icons)
    const width = img.width || img.naturalWidth || 0;
    const height = img.height || img.naturalHeight || 0;
    if (width > 0 && height > 0 && (width <= 60 || height <= 60)) return;
    
    if (!images.includes(src)) {
      images.push(src);
    }
  });
  
  return images;
}

// Extract the post caption text
async function extractCaption(postEl) {
  // Click "See more" to expand
  const seeMoreButtons = Array.from(postEl.querySelectorAll('div[role="button"]'));
  const seeMoreBtn = seeMoreButtons.find(el => {
    const txt = el.textContent?.toLowerCase() || '';
    return txt === 'see more' || txt === 'ดูเพิ่มเติม' || txt.includes('see more') || txt.includes('ดูเพิ่มเติม');
  });
  
  if (seeMoreBtn) {
    seeMoreBtn.click();
    await sleep(250);
  }
  
  // Look for message container
  const messageEl = postEl.querySelector('[data-ad-preview="message"]') || 
                    postEl.querySelector('[data-testid="post_message"]');
  if (messageEl) {
    return messageEl.textContent.trim();
  }
  
  // Look for dir="auto" text divs
  const textDivs = Array.from(postEl.querySelectorAll('div[dir="auto"]'));
  if (textDivs.length > 0) {
    const texts = textDivs
      .filter(div => !div.closest('h1, h2, h3, h4, h5, h6'))
      .map(div => div.textContent.trim())
      .filter(Boolean);
    if (texts.length > 0) {
      return texts.join('\n');
    }
  }
  
  return postEl.innerText || '';
}

// Send payload to background script
function sendClipRequest(payload, buttonEl) {
  chrome.runtime.sendMessage({ action: 'clip_post', payload }, (response) => {
    buttonEl.classList.remove('clipping');
    
    if (!response) {
      const error = chrome.runtime.lastError?.message || 'Could not communicate with extension service worker.';
      updateButtonState(buttonEl, 'failed', `Error: ${error}`);
      return;
    }
    
    if (response.success) {
      updateButtonState(buttonEl, 'success', 'Clipped ✓');
    } else {
      if (response.status === 409) {
        updateButtonState(buttonEl, 'exists', 'Exists ⚠️');
      } else {
        updateButtonState(buttonEl, 'failed', response.error || 'Failed ❌');
      }
    }
  });
}

// Update button appearance
function updateButtonState(button, state, text) {
  button.className = 'clip-radar-btn ' + state;
  button.textContent = `📡 ${text}`;
  
  if (state !== 'success' && state !== 'exists') {
    setTimeout(() => {
      button.className = 'clip-radar-btn';
      button.textContent = '📡 Clip';
      button.disabled = false;
    }, 5000);
  }
}

// ============================================================
// CORE STRATEGY: Instead of trying to identify post containers
// and filtering out comments (which keeps breaking due to
// Facebook's unpredictable DOM), we take the opposite approach:
//
// 1. Find ALL "Share" buttons on the page (aria-label="Share" or
//    aria-label="Send" or text "Share"). Only main post action
//    bars have a Share button. Comment action bars NEVER have one.
//
// 2. Walk up from the Share button to find its parent action bar
//    row (the div containing Like + Comment + Share).
//
// 3. Append the Clip button to that row.
//
// This is bulletproof because Facebook comments can have Like
// and Reply, but NEVER have a Share button.
// ============================================================

function findActionBars() {
  const processed = new Set();
  
  // Find all elements that could be Share buttons
  const allElements = document.querySelectorAll(
    '[aria-label="Share"], [aria-label="Send"], [aria-label="แชร์"], [aria-label="ส่ง"]'
  );
  
  allElements.forEach(shareEl => {
    // Walk up to find the action bar row (parent div containing Like + Comment + Share)
    let actionBar = shareEl.closest('div');
    let attempts = 0;
    
    // Walk up until we find a div that contains at least the Share element 
    // and has multiple child divs (indicating it's the row with Like/Comment/Share)
    while (actionBar && attempts < 8) {
      if (actionBar.childElementCount >= 3) {
        break;
      }
      actionBar = actionBar.parentElement;
      attempts++;
    }
    
    if (!actionBar) return;
    
    // Skip if we already processed this action bar
    if (actionBar.querySelector('.clip-radar-btn')) return;
    
    // Use a unique key to avoid duplicate processing
    const key = actionBar.getBoundingClientRect().top + '-' + actionBar.getBoundingClientRect().left;
    if (processed.has(key)) return;
    processed.add(key);
    
    // Create and inject the Clip button
    const clipBtn = document.createElement('button');
    clipBtn.className = 'clip-radar-btn';
    clipBtn.textContent = '📡 Clip';
    
    clipBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      clipBtn.disabled = true;
      clipBtn.className = 'clip-radar-btn clipping';
      clipBtn.textContent = '📡 Clipping...';
      
      try {
        // Walk up from the clip button to find the post container
        const postContainer = findPostContainer(clipBtn);
        
        const sourceUrl = extractPostUrl(postContainer);
        if (!sourceUrl) {
          throw new Error('Could not extract post URL.');
        }
        
        const authorName = extractAuthorName(postContainer);
        const timestamp = extractTimestamp(postContainer);
        const imageUrls = extractImages(postContainer);
        const caption = await extractCaption(postContainer);
        
        if (!caption || caption.trim().length === 0) {
          throw new Error('Post caption is empty.');
        }
        
        const payload = {
          sourceUrl,
          caption,
          authorName,
          timestamp,
          imageUrls
        };
        
        console.log('[CLIP] Extracted payload:', payload);
        sendClipRequest(payload, clipBtn);
        
      } catch (error) {
        console.warn('[CLIP] Error clipping post:', error);
        updateButtonState(clipBtn, 'failed', error.message || 'Error');
      }
    });
    
    actionBar.appendChild(clipBtn);
    console.log('[CLIP] Injected Clip button next to Share button');
  });
}

// Initial setup
function initialize() {
  console.log('[CLIP] Content script initialized on facebook.com');
  
  // Initial scan after a brief delay to let the page render
  setTimeout(findActionBars, 1500);
  
  // Re-scan periodically to catch new posts loaded by infinite scroll
  // This is simpler and more reliable than MutationObserver for Facebook's
  // virtual DOM which constantly rebuilds elements
  setInterval(findActionBars, 2000);
}

// Run
initialize();
