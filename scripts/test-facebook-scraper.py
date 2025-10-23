#!/usr/bin/env python3
"""
Test script for facebook-scraper library
Tests if it can scrape multi-image posts from Phuket Facebook news sources
"""

import json
import sys
from facebook_scraper import get_posts

def test_scrape_facebook_page(page_name, num_posts=5):
    """
    Test scraping a Facebook page and check for multi-image posts
    
    Args:
        page_name: Facebook page username/ID
        num_posts: Number of posts to fetch
    
    Returns:
        dict: Results with posts data and statistics
    """
    print(f"Testing facebook-scraper on page: {page_name}", file=sys.stderr)
    print(f"Fetching {num_posts} posts...\n", file=sys.stderr)
    
    results = {
        "success": False,
        "page": page_name,
        "posts": [],
        "stats": {
            "total_posts": 0,
            "posts_with_multiple_images": 0,
            "posts_with_single_image": 0,
            "posts_with_no_images": 0
        },
        "error": None
    }
    
    try:
        posts_data = []
        
        # Use more pages to avoid the warning and increase chance of results
        for post in get_posts(page_name, pages=3, timeout=30):
            # Extract relevant fields
            post_data = {
                "post_id": post.get("post_id"),
                "text": post.get("text", "")[:200],  # First 200 chars
                "time": str(post.get("time")),
                "image": post.get("image"),
                "images": post.get("images"),  # This should be an array for multi-image posts
                "post_url": post.get("post_url")
            }
            
            posts_data.append(post_data)
            
            # Count image statistics
            images = post.get("images")
            if images and len(images) > 1:
                results["stats"]["posts_with_multiple_images"] += 1
                print(f"✅ Found multi-image post: {len(images)} images", file=sys.stderr)
                print(f"   Text: {post_data['text'][:60]}...", file=sys.stderr)
            elif images and len(images) == 1:
                results["stats"]["posts_with_single_image"] += 1
            elif post.get("image"):
                results["stats"]["posts_with_single_image"] += 1
            else:
                results["stats"]["posts_with_no_images"] += 1
            
            # Limit to requested number
            if len(posts_data) >= num_posts:
                break
        
        results["posts"] = posts_data
        results["stats"]["total_posts"] = len(posts_data)
        results["success"] = True
        
        print(f"\n📊 Statistics:", file=sys.stderr)
        print(f"   Total posts: {results['stats']['total_posts']}", file=sys.stderr)
        print(f"   Multi-image posts: {results['stats']['posts_with_multiple_images']}", file=sys.stderr)
        print(f"   Single-image posts: {results['stats']['posts_with_single_image']}", file=sys.stderr)
        print(f"   No images: {results['stats']['posts_with_no_images']}", file=sys.stderr)
        
    except Exception as e:
        results["error"] = str(e)
        print(f"❌ Error: {e}", file=sys.stderr)
    
    return results


if __name__ == "__main__":
    # Test with Phuket Times page (one of the user's sources)
    # Using the page username from their news sources config
    test_pages = [
        "PhuketTimeNews",  # Phuket Time News
    ]
    
    all_results = []
    
    for page in test_pages:
        result = test_scrape_facebook_page(page, num_posts=5)
        all_results.append(result)
        print("\n" + "="*60 + "\n", file=sys.stderr)
    
    # Output JSON to stdout for Node.js to consume
    print(json.dumps(all_results, indent=2))
