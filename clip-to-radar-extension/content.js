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
  
  /* Facebook dark mode adjustment if needed */
  @media (prefers-color-scheme: dark) {
    .clip-radar-btn {
      color: #fb923c !important;
    }
  }
`;
document.head.appendChild(style);

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Find the post container element starting from a child node
function findPostContainer(element) {
  // Strategy 1: Walk up parent tree to find a container with [role="article"] that contains an h2 or h3 heading
  let current = element.parentElement;
  let depth = 0;
  while (current && depth < 20) {
    if (current.matches('[role="article"]') && current.querySelector('h2, h3')) {
      return current;
    }
    const isFeedUnit = current.getAttribute('data-pagelet')?.startsWith('FeedUnit_') || 
                       current.id?.startsWith('feed_item_') || 
                       current.className?.includes('feed-item');
    if (isFeedUnit) return current;
    current = current.parentElement;
    depth++;
  }
  
  // Fallback: standard closest logic
  let container = element.closest('[role="article"]');
  if (container) return container;
  
  return element.closest('div[data-testid="post_container"]');
}

// Extract Facebook Post URL (permalink)
function extractPostUrl(postEl) {
  // Strategy 1: Look for timestamp link in header
  // Links that contain '/posts/', '/permalink/', '/photos/', '/videos/', '/groups/.../permalink/'
  const links = Array.from(postEl.querySelectorAll('a[role="link"], a'));
  
  // Look for timestamp links first (usually have absolute timestamp or dynamic text like '3 hrs')
  // We can filter href patterns
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
    /\/share\/[a-zA-Z0-9]+/
  ];

  for (const link of links) {
    const href = link.href;
    if (!href) continue;
    
    // Check patterns
    const matchesPattern = fbPatterns.some(pattern => pattern.test(href));
    if (matchesPattern) {
      // Clean up the URL by resolving relative and removing unnecessary query params
      try {
        const urlObj = new URL(href);
        // Keep only important query params for tracking/identifying post ID
        const cleanParams = new URLSearchParams();
        const importantKeys = ['story_fbid', 'fbid', 'id', 'substory_index'];
        importantKeys.forEach(key => {
          if (urlObj.searchParams.has(key)) {
            cleanParams.set(key, urlObj.searchParams.get(key));
          }
        });
        
        urlObj.search = cleanParams.toString();
        // Remove trailing slash and return
        let cleanUrl = urlObj.toString();
        if (cleanUrl.endsWith('/')) {
          cleanUrl = cleanUrl.slice(0, -1);
        }
        return cleanUrl;
      } catch (e) {
        return href;
      }
    }
  }
  
  // Strategy 2: If we are on a single post permalink page, use current page URL
  const currentUrl = window.location.href;
  if (fbPatterns.some(pattern => pattern.test(currentUrl))) {
    return currentUrl;
  }
  
  return null;
}

// Extract Author/Page name
function extractAuthorName(postEl) {
  // Strategy 1: Find <h2> elements which usually house the page title/author link
  const h2Elements = postEl.querySelectorAll('h2');
  for (const h2 of h2Elements) {
    const link = h2.querySelector('a');
    if (link && link.textContent) {
      const text = link.textContent.trim();
      if (text) return text;
    }
    const span = h2.querySelector('span');
    if (span && span.textContent) {
      const text = span.textContent.trim();
      if (text) return text;
    }
  }
  
  // Strategy 2: Find first bold/strong or strong-looking element inside header
  const strongEl = postEl.querySelector('strong a, a strong');
  if (strongEl && strongEl.textContent) {
    return strongEl.textContent.trim();
  }
  
  // Strategy 3: Check first links inside post header
  const headerLinks = Array.from(postEl.querySelectorAll('a[role="link"]'));
  for (const link of headerLinks) {
    // Skip if it contains numbers only (might be timestamp)
    if (/^\d+/.test(link.textContent?.trim())) continue;
    if (link.textContent?.trim().length > 2) {
      return link.textContent.trim();
    }
  }
  
  return "Unknown Facebook Author";
}

// Extract timestamp text
function extractTimestamp(postEl) {
  // Look for elements representing timestamp (usually inside h2, h3, or a links)
  const links = Array.from(postEl.querySelectorAll('a[role="link"], a'));
  for (const link of links) {
    // Check if the link contains timestamp indicators or has specific aria-label
    const label = link.getAttribute('aria-label');
    if (label && (label.includes('ago') || label.includes('Yesterday') || /\d/.test(label))) {
      return label.trim();
    }
    
    // Facebook often puts timestamp in span or relative class
    // e.g. text of the timestamp link itself (e.g. "3h", "Yesterday", "2 July")
    const href = link.href;
    if (href && (href.includes('/posts/') || href.includes('/permalink/') || href.includes('story.php'))) {
      const text = link.textContent?.trim();
      if (text && text.length > 0 && !text.includes('·')) {
        return text;
      }
    }
  }
  
  return null;
}

// Extract post images
function extractImages(postEl) {
  const images = [];
  const allImgs = Array.from(postEl.querySelectorAll('img'));
  
  allImgs.forEach(img => {
    // 1. Exclude comment section images using a robust parent-walk up to postEl
    let parent = img.parentElement;
    let insideComment = false;
    while (parent && parent !== postEl) {
      if (parent.matches('[role="article"]') || 
          parent.closest('[role="group"]') || 
          parent.closest('ul') || 
          parent.closest('.comment-list') ||
          parent.classList.contains('comment') ||
          parent.id?.includes('comment')) {
        insideComment = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (insideComment) return;
    
    const src = img.src;
    if (!src) return;
    
    // 2. Filter out reactions/emojis, avatar/profile images
    // - Emojis usually have 'emoji' or 'images/emoji' in url or are very small (e.g., width <= 24)
    if (src.includes('/images/emoji') || src.includes('emoji.php') || src.includes('rsrc.php')) {
      return;
    }
    
    // - Avatars: check sizes. Avatars are usually square, 32x32 to 48x48.
    const width = img.width || img.naturalWidth || 0;
    const height = img.height || img.naturalHeight || 0;
    
    // Exclude small images (avatars, like buttons, react icons, etc.)
    if (width > 0 && height > 0) {
      if (width <= 60 || height <= 60) return;
    } else {
      // Fallback if dimensions are 0 (not loaded yet)
      // Check if image looks like an avatar (role link parent or alt is user profile name)
      const alt = img.getAttribute('alt') || '';
      if (alt.includes('profile') || alt.includes('profile picture') || img.closest('a[role="link"]')?.getAttribute('aria-label')?.includes('profile')) {
        return;
      }
    }
    
    // Push the image source
    if (!images.includes(src)) {
      images.push(src);
    }
  });
  
  return images;
}

// Extract the post caption text
async function extractCaption(postEl) {
  // Step 1: Programmatically click "See more" or "ดูเพิ่มเติม" to expand text
  const seeMoreButtons = Array.from(postEl.querySelectorAll('div[role="button"]'));
  const seeMoreBtn = seeMoreButtons.find(el => {
    const txt = el.textContent?.toLowerCase() || '';
    return txt === 'see more' || txt === 'ดูเพิ่มเติม' || txt.includes('see more') || txt.includes('ดูเพิ่มเติม');
  });
  
  if (seeMoreBtn) {
    console.log('[CLIP] Found "See more" button. Clicking to expand...');
    seeMoreBtn.click();
    await sleep(250); // wait briefly for DOM update
  }
  
  // Step 2: Look for text container
  // Facebook post message text is usually inside an element with specific attributes
  const messageEl = postEl.querySelector('[data-ad-preview="message"]') || 
                    postEl.querySelector('[data-testid="post_message"]') ||
                    postEl.querySelector('div[dir="auto"]');
                    
  if (messageEl) {
    return messageEl.textContent.trim();
  }
  
  // Fallback: search for divs with dir="auto" inside the post body area (excluding comments/header)
  // Let's look for paragraphs or large text blocks
  const textDivs = Array.from(postEl.querySelectorAll('div[dir="auto"]'));
  if (textDivs.length > 0) {
    // Filter out comments and header divs
    const mainTextDivs = textDivs.filter(div => {
      // Exclude if inside comments or header details using a robust parent-walk
      let parent = div.parentElement;
      let insideComment = false;
      while (parent && parent !== postEl) {
        if (parent.matches('[role="article"]') || 
            parent.closest('[role="group"]') || 
            parent.closest('ul') || 
            parent.closest('.comment-list') ||
            parent.classList.contains('comment')) {
          insideComment = true;
          break;
        }
        parent = parent.parentElement;
      }
      
      const isHeader = div.closest('h2') || div.closest('h3');
      return !insideComment && !isHeader;
    });
    
    if (mainTextDivs.length > 0) {
      // Join them with newlines
      return mainTextDivs.map(div => div.textContent.trim()).filter(Boolean).join('\n');
    }
  }
  
  // Last resort fallback: get all visible text in post, clean it up
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

// Update the button appearance based on status
function updateButtonState(button, state, text) {
  button.className = 'clip-radar-btn ' + state;
  button.textContent = `📡 ${text}`;
  
  // Re-enable button after 5 seconds if failed or exists, or keep it disabled if success
  if (state !== 'success' && state !== 'exists') {
    setTimeout(() => {
      button.className = 'clip-radar-btn';
      button.textContent = '📡 Clip';
      button.disabled = false;
    }, 5000);
  }
}

// Check if an element is a genuine top-level post container
function isMainPost(el) {
  // 1. A valid post container MUST contain a heading (h1-h6 or role="heading") representing the author/page name.
  // Comments never use headings, so this instantly filters them out.
  if (!el.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]')) {
    return false;
  }
  
  // 2. A main post must NOT be inside a comment thread, group, or list
  if (el.closest('[role="group"]') || el.closest('ul') || el.closest('.comment-list') || el.closest('ol')) {
    return false;
  }
  
  // 3. A post container must contain the Like action button.
  // If it doesn't have a Like button, it's not a post card with an action toolbar.
  const hasLikeButton = el.querySelector('[aria-label="Like"], [aria-label="ถูกใจ"]');
  if (!hasLikeButton) {
    return false;
  }
  
  return true;
}

// Inject "📡 Clip" button into post action bar
function injectClipButton(postEl) {
  // Avoid duplicate injection using a custom class on the post container
  if (postEl.classList.contains('clip-radar-processed')) return;
  
  // Find the action bar (excluding any that are inside the comments container)
  const actionBars = Array.from(postEl.querySelectorAll('[role="toolbar"]'));
  let actionBar = actionBars.find(bar => {
    const insideComment = bar.closest('[role="group"]') || bar.closest('ul') || bar.closest('.comment-list');
    return !insideComment;
  });
  
  if (!actionBar) {
    // Fallback: look for Like button (excluding comments)
    const likeBtns = Array.from(postEl.querySelectorAll('[aria-label="Like"], [aria-label="ถูกใจ"]'));
    const postLikeBtn = likeBtns.find(btn => {
      const insideComment = btn.closest('[role="group"]') || btn.closest('ul') || btn.closest('.comment-list');
      return !insideComment;
    });
    
    if (postLikeBtn) {
      actionBar = postLikeBtn.closest('div'); // Get nearest container
      // If it doesn't look like a row (too narrow), try going up a level
      if (actionBar && actionBar.offsetWidth < 150) {
        actionBar = actionBar.parentElement;
      }
    }
  }
  
  // Sibling lookup: look for a div with Like/Comment indicators (excluding comments)
  if (!actionBar) {
    const divs = Array.from(postEl.querySelectorAll('div'));
    actionBar = divs.find(div => {
      const insideComment = div.closest('[role="group"]') || div.closest('ul') || div.closest('.comment-list');
      if (insideComment) return false;
      
      const txt = div.textContent || '';
      return (txt.includes('Like') || txt.includes('ถูกใจ')) && 
             (txt.includes('Comment') || txt.includes('แสดงความคิดเห็น')) &&
             div.childElementCount >= 2;
    });
  }
  
  // Sibling check: ensure we didn't accidentally catch a comment reply action bar
  if (actionBar) {
    const isCommentBar = actionBar.textContent.includes('Reply') || 
                         actionBar.textContent.includes('ตอบกลับ') ||
                         actionBar.querySelector('[aria-label*="Reply"], [aria-label*="ตอบกลับ"]');
    if (isCommentBar) {
      return;
    }
    
    // Mark post container as processed
    postEl.classList.add('clip-radar-processed');
    
    const clipBtn = document.createElement('button');
    clipBtn.className = 'clip-radar-btn';
    clipBtn.textContent = '📡 Clip';
    
    // Add click handler
    clipBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      clipBtn.disabled = true;
      clipBtn.className = 'clip-radar-btn clipping';
      clipBtn.textContent = '📡 Clipping...';
      
      try {
        console.log('[CLIP] Sourcing post details...');
        const postContainer = findPostContainer(clipBtn);
        if (!postContainer) {
          throw new Error('Could not find parent Facebook post container.');
        }
        
        const sourceUrl = extractPostUrl(postContainer);
        if (!sourceUrl) {
          throw new Error('Could not extract Facebook post source URL. Selectors may have changed.');
        }
        
        const authorName = extractAuthorName(postContainer);
        const timestamp = extractTimestamp(postContainer);
        const imageUrls = extractImages(postContainer);
        const caption = await extractCaption(postContainer);
        
        if (!caption || caption.trim().length === 0) {
          throw new Error('Extracted post caption is empty.');
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
        console.error('[CLIP] Error clipping post:', error);
        updateButtonState(clipBtn, 'failed', error.message || 'Error');
      }
    });
    
    // Append the button. We append it to the end or inside the action bar row
    // Let's append to actionBar
    actionBar.appendChild(clipBtn);
    console.log('[CLIP] Injected "📡 Clip" button into post');
  }
}

// Initial setup to run on page load
function initialize() {
  console.log('[CLIP] Content script initialized on facebook.com');
  
  const postSelectors = '[role="article"], div[data-testid="fbfeed_story"], div[data-testid="post_container"], div[data-pagelet^="FeedUnit_"]';
  
  // Find all candidate posts and inject button
  const candidates = document.querySelectorAll(postSelectors);
  candidates.forEach(el => {
    if (isMainPost(el)) {
      injectClipButton(el);
    }
  });
  
  // Set up MutationObserver to watch for new posts injected during scroll
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length === 0) continue;
      
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        
        // If the node is itself a post
        if (node.matches && node.matches(postSelectors) && isMainPost(node)) {
          injectClipButton(node);
        } else {
          // If a post is nested inside the added node
          const nestedPosts = node.querySelectorAll(postSelectors);
          nestedPosts.forEach(el => {
            if (isMainPost(el)) {
              injectClipButton(el);
            }
          });
        }
      });
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Run initialisation
initialize();
