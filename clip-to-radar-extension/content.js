// Content script for Clip to Radar
// DIAGNOSTIC + FUNCTIONAL VERSION

// Inject custom styles
const style = document.createElement('style');
style.textContent = `
  .clip-radar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background-color: rgba(249, 115, 22, 0.15) !important;
    border: 1px solid rgba(249, 115, 22, 0.4) !important;
    border-radius: 9999px !important;
    padding: 6px 14px !important;
    margin: 4px 6px !important;
    color: #f97316 !important;
    font-family: inherit !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    outline: none !important;
    user-select: none !important;
    z-index: 999 !important;
  }
  .clip-radar-btn:hover {
    background-color: rgba(249, 115, 22, 0.25) !important;
    border-color: rgba(249, 115, 22, 0.7) !important;
  }
  .clip-radar-btn.clipping {
    opacity: 0.7 !important;
    cursor: not-allowed !important;
  }
  .clip-radar-btn.success {
    background-color: rgba(16, 185, 129, 0.15) !important;
    border-color: rgba(16, 185, 129, 0.4) !important;
    color: #10b981 !important;
  }
  .clip-radar-btn.failed {
    background-color: rgba(239, 68, 68, 0.15) !important;
    border-color: rgba(239, 68, 68, 0.4) !important;
    color: #ef4444 !important;
  }
  .clip-radar-btn.exists {
    background-color: rgba(168, 85, 247, 0.15) !important;
    border-color: rgba(168, 85, 247, 0.4) !important;
    color: #a855f7 !important;
  }
  #clip-radar-debug {
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0,0,0,0.85);
    color: #0f0;
    font-family: monospace;
    font-size: 11px;
    padding: 8px 12px;
    border-radius: 8px;
    z-index: 99999;
    max-width: 400px;
    max-height: 200px;
    overflow-y: auto;
    pointer-events: auto;
    border: 1px solid #333;
  }
`;
document.head.appendChild(style);

// Debug panel
const debugPanel = document.createElement('div');
debugPanel.id = 'clip-radar-debug';
debugPanel.innerHTML = '<b>📡 Clip to Radar</b> - scanning...';
document.body.appendChild(debugPanel);

function debugLog(msg) {
  console.log('[CLIP] ' + msg);
  debugPanel.innerHTML += '<br>' + msg;
  // Keep only last 10 lines
  const lines = debugPanel.innerHTML.split('<br>');
  if (lines.length > 10) {
    debugPanel.innerHTML = lines.slice(-10).join('<br>');
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Walk up from a button to find the nearest post-level container
function findPostContainer(element) {
  let current = element;
  let depth = 0;
  while (current && depth < 30) {
    if (current.getAttribute && current.getAttribute('role') === 'article') {
      return current;
    }
    const pagelet = current.getAttribute && current.getAttribute('data-pagelet');
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
    /\/posts\/\d+/, /\/posts\/pfbid/,
    /\/permalink\.php\?story_fbid=/, /\/story\.php\?story_fbid=/,
    /\/permalink\/\d+/, /\/permalink\/pfbid/,
    /\/videos\/\d+/, /\/photo\.php\?fbid=/, /\/photo\/\?fbid=/,
    /\/groups\/[^/]+\/permalink\/\d+/, /\/groups\/[^/]+\/permalink\/pfbid/,
    /\/share\/[a-zA-Z0-9]+/, /\/reel\/\d+/
  ];

  for (const link of links) {
    const href = link.href;
    if (!href) continue;
    if (fbPatterns.some(p => p.test(href))) {
      try {
        const urlObj = new URL(href);
        const cleanParams = new URLSearchParams();
        ['story_fbid', 'fbid', 'id', 'substory_index'].forEach(key => {
          if (urlObj.searchParams.has(key)) cleanParams.set(key, urlObj.searchParams.get(key));
        });
        urlObj.search = cleanParams.toString();
        let cleanUrl = urlObj.toString();
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
        return cleanUrl;
      } catch (e) { return href; }
    }
  }
  const currentUrl = window.location.href;
  if (fbPatterns.some(p => p.test(currentUrl))) return currentUrl;
  return null;
}

function extractAuthorName(postEl) {
  const headings = postEl.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
  for (const h of headings) {
    const link = h.querySelector('a');
    if (link && link.textContent?.trim().length > 1) return link.textContent.trim();
    if (h.textContent?.trim().length > 1) return h.textContent.trim();
  }
  const strongEl = postEl.querySelector('strong a, a strong');
  if (strongEl && strongEl.textContent) return strongEl.textContent.trim();
  return "Unknown Facebook Author";
}

function extractTimestamp(postEl) {
  const links = Array.from(postEl.querySelectorAll('a[href]'));
  for (const link of links) {
    const label = link.getAttribute('aria-label');
    if (label && /\d/.test(label)) return label.trim();
    const href = link.href;
    if (href && (href.includes('/posts/') || href.includes('/permalink/'))) {
      const text = link.textContent?.trim();
      if (text && text.length > 0 && text.length < 30) return text;
    }
  }
  return null;
}

function extractImages(postEl) {
  const images = [];
  postEl.querySelectorAll('img').forEach(img => {
    const src = img.src;
    if (!src) return;
    if (src.includes('emoji') || src.includes('rsrc.php')) return;
    const w = img.width || img.naturalWidth || 0;
    const h = img.height || img.naturalHeight || 0;
    if (w > 0 && h > 0 && (w <= 60 || h <= 60)) return;
    if (!images.includes(src)) images.push(src);
  });
  return images;
}

async function extractCaption(postEl) {
  const seeMoreBtns = Array.from(postEl.querySelectorAll('div[role="button"]'));
  const seeMore = seeMoreBtns.find(el => {
    const t = el.textContent?.toLowerCase() || '';
    return t.includes('see more') || t.includes('ดูเพิ่มเติม');
  });
  if (seeMore) { seeMore.click(); await sleep(250); }

  const msgEl = postEl.querySelector('[data-ad-preview="message"]') || postEl.querySelector('[data-testid="post_message"]');
  if (msgEl) return msgEl.textContent.trim();

  const textDivs = Array.from(postEl.querySelectorAll('div[dir="auto"]'));
  const texts = textDivs.filter(d => !d.closest('h1, h2, h3, h4, h5, h6')).map(d => d.textContent.trim()).filter(Boolean);
  if (texts.length > 0) return texts.join('\n');
  return postEl.innerText || '';
}

function sendClipRequest(payload, buttonEl) {
  chrome.runtime.sendMessage({ action: 'clip_post', payload }, (response) => {
    buttonEl.classList.remove('clipping');
    if (!response) {
      updateButtonState(buttonEl, 'failed', chrome.runtime.lastError?.message || 'No response');
      return;
    }
    if (response.success) updateButtonState(buttonEl, 'success', 'Clipped ✓');
    else if (response.status === 409) updateButtonState(buttonEl, 'exists', 'Exists ⚠️');
    else updateButtonState(buttonEl, 'failed', response.error || 'Failed ❌');
  });
}

function updateButtonState(button, state, text) {
  button.className = 'clip-radar-btn ' + state;
  button.textContent = '📡 ' + text;
  if (state !== 'success' && state !== 'exists') {
    setTimeout(() => { button.className = 'clip-radar-btn'; button.textContent = '📡 Clip'; button.disabled = false; }, 5000);
  }
}

// Create a click handler for a clip button
function makeClipHandler(clipBtn) {
  return async (e) => {
    e.stopPropagation();
    e.preventDefault();
    clipBtn.disabled = true;
    clipBtn.className = 'clip-radar-btn clipping';
    clipBtn.textContent = '📡 Clipping...';
    try {
      const postContainer = findPostContainer(clipBtn);
      const sourceUrl = extractPostUrl(postContainer);
      if (!sourceUrl) throw new Error('Could not extract post URL.');
      const authorName = extractAuthorName(postContainer);
      const timestamp = extractTimestamp(postContainer);
      const imageUrls = extractImages(postContainer);
      const caption = await extractCaption(postContainer);
      if (!caption || caption.trim().length === 0) throw new Error('Post caption is empty.');
      const payload = { sourceUrl, caption, authorName, timestamp, imageUrls };
      console.log('[CLIP] Payload:', payload);
      sendClipRequest(payload, clipBtn);
    } catch (error) {
      console.warn('[CLIP] Error:', error);
      updateButtonState(clipBtn, 'failed', error.message || 'Error');
    }
  };
}

// ============================================================
// STRATEGY: Find the post action bar by looking for visible
// "Like", "Comment", "Share" text in the DOM. Facebook renders
// these as spans inside div[role="button"] elements. We find
// the Share span/button, walk up to the action bar row, and
// append our Clip button.
// ============================================================

function scanAndInject() {
  let injectedCount = 0;

  // Strategy 1: Look for elements with aria-label containing "Share" or "แชร์"
  const ariaShareBtns = document.querySelectorAll('[aria-label="Share"], [aria-label="แชร์"], [aria-label="Send"], [aria-label="ส่ง"]');
  
  ariaShareBtns.forEach(shareEl => {
    let actionBar = shareEl;
    for (let i = 0; i < 8; i++) {
      actionBar = actionBar.parentElement;
      if (!actionBar) break;
      if (actionBar.childElementCount >= 3) break;
    }
    if (!actionBar || actionBar.querySelector('.clip-radar-btn')) return;
    
    const btn = document.createElement('button');
    btn.className = 'clip-radar-btn';
    btn.textContent = '📡 Clip';
    btn.addEventListener('click', makeClipHandler(btn));
    actionBar.appendChild(btn);
    injectedCount++;
  });

  // Strategy 2: Look for visible text "Share" or "แชร์" inside spans/divs
  if (injectedCount === 0) {
    // Use TreeWalker to find text nodes containing "Share" or "แชร์"
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent.trim();
          if (text === 'Share' || text === 'แชร์') {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    const shareTextNodes = [];
    while (walker.nextNode()) {
      shareTextNodes.push(walker.currentNode);
    }
    
    debugLog('Found ' + shareTextNodes.length + ' "Share" text nodes');

    shareTextNodes.forEach(textNode => {
      // The text node's parent is usually a span, inside a div[role="button"]
      let shareElement = textNode.parentElement;
      if (!shareElement) return;
      
      // Walk up to find the clickable container (role="button" or similar)
      let clickable = shareElement.closest('[role="button"]') || shareElement;
      
      // Now walk up from the clickable to find the action bar row
      let actionBar = clickable.parentElement;
      let attempts = 0;
      while (actionBar && attempts < 5) {
        // The action bar row should contain multiple children (Like, Comment, Share)
        if (actionBar.childElementCount >= 3) break;
        // Also check if sibling elements exist with "Like" or "Comment" text
        const siblingText = actionBar.textContent || '';
        if ((siblingText.includes('Like') || siblingText.includes('ถูกใจ')) &&
            (siblingText.includes('Comment') || siblingText.includes('แสดงความคิดเห็น'))) {
          break;
        }
        actionBar = actionBar.parentElement;
        attempts++;
      }
      
      if (!actionBar || actionBar.querySelector('.clip-radar-btn')) return;
      
      // Extra check: if this action bar also contains "Reply" or "ตอบกลับ", 
      // it's a comment bar, skip it
      const barText = actionBar.textContent || '';
      if (barText.includes('Reply') || barText.includes('ตอบกลับ')) return;
      
      const btn = document.createElement('button');
      btn.className = 'clip-radar-btn';
      btn.textContent = '📡 Clip';
      btn.addEventListener('click', makeClipHandler(btn));
      actionBar.appendChild(btn);
      injectedCount++;
    });
  }

  // Strategy 3: Absolute fallback - find role="article" elements that have visible 
  // Like/Comment/Share and inject
  if (injectedCount === 0) {
    const articles = document.querySelectorAll('[role="article"]');
    debugLog('Found ' + articles.length + ' article elements');
    
    articles.forEach(article => {
      if (article.querySelector('.clip-radar-btn')) return;
      
      // Check if this article's text includes "Like" and "Comment" and "Share"
      // This indicates it's a main post with an action bar
      const text = article.textContent || '';
      const hasLike = text.includes('Like') || text.includes('ถูกใจ');
      const hasComment = text.includes('Comment') || text.includes('แสดงความคิดเห็น');
      const hasShare = text.includes('Share') || text.includes('แชร์');
      const hasReply = text.includes('Reply') || text.includes('ตอบกลับ');
      
      // Must have Like+Comment+Share but NOT Reply at the article level (Reply = comment)
      // Actually comments are nested, so the outer article will have Reply too
      // Instead check: is this article nested inside another article?
      const parentArticle = article.parentElement?.closest('[role="article"]');
      
      if (hasLike && hasComment && hasShare && !parentArticle) {
        // Find the specific div containing Like/Comment/Share buttons
        const allDivs = article.querySelectorAll('div');
        for (const div of allDivs) {
          const divText = div.textContent || '';
          const divHasLike = divText.includes('Like') || divText.includes('ถูกใจ');
          const divHasComment = divText.includes('Comment') || divText.includes('แสดงความคิดเห็น');
          const divHasShare = divText.includes('Share') || divText.includes('แชร์');
          
          // Look for a relatively compact div (not the whole article) that has all three
          if (divHasLike && divHasComment && divHasShare && 
              div.childElementCount >= 2 && div.childElementCount <= 10 &&
              div.offsetHeight < 80 && div.offsetHeight > 20 &&
              !div.querySelector('.clip-radar-btn')) {
            
            const btn = document.createElement('button');
            btn.className = 'clip-radar-btn';
            btn.textContent = '📡 Clip';
            btn.addEventListener('click', makeClipHandler(btn));
            div.appendChild(btn);
            injectedCount++;
            debugLog('Injected via Strategy 3 (article scan)');
            break; // Only one button per article
          }
        }
      }
    });
  }

  return injectedCount;
}

// Initial setup
function initialize() {
  debugLog('Script loaded on ' + window.location.hostname);
  
  // First scan after short delay
  setTimeout(() => {
    const count = scanAndInject();
    debugLog('Initial scan: injected ' + count + ' buttons');
  }, 2000);
  
  // Re-scan every 3 seconds for new posts from scrolling
  setInterval(() => {
    const count = scanAndInject();
    if (count > 0) {
      debugLog('Scan: injected ' + count + ' new buttons');
    }
  }, 3000);
}

initialize();
