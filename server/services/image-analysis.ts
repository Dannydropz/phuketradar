import sharp from 'sharp';

export class ImageAnalysisService {
  /**
   * Detect if an image has a solid/uniform color background
   * (like Facebook's colored background text posts)
   * 
   * @param imageUrl URL of the image to analyze
   * @param threshold Standard deviation threshold (lower = more uniform)
   * @returns true if the image is a solid color background (text graphic)
   */
  async isSolidColorBackground(imageUrl: string, threshold: number = 15): Promise<{
    isSolid: boolean;
    avgStdDev: number;
    reason: string;
  }> {
    try {
      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      // Analyze with Sharp
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // APPROACH: Check what % of pixels are similar to the dominant color
      // Facebook text posts: 80%+ pixels are the background color (black/red/blue)
      // Real photos: More color variety, no single color dominates
      
      // Step 1: Downsample to reduce processing time
      const { data, info } = await sharp(imageBuffer)
        .resize(32, 32, { fit: 'fill' })  // 32x32 = 1024 pixels to analyze
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Step 2: Find the most common color by clustering nearby colors
      const colorCounts = new Map<string, number>();
      const tolerance = 30; // Colors within this range are considered "same"
      
      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Find if this color is close to any existing cluster
        let matched = false;
        for (const [colorKey, count] of Array.from(colorCounts.entries())) {
          const [cr, cg, cb] = colorKey.split(',').map(Number);
          const distance = Math.sqrt(
            Math.pow(r - cr, 2) + 
            Math.pow(g - cg, 2) + 
            Math.pow(b - cb, 2)
          );
          
          if (distance < tolerance) {
            colorCounts.set(colorKey, count + 1);
            matched = true;
            break;
          }
        }
        
        if (!matched) {
          colorCounts.set(`${r},${g},${b}`, 1);
        }
      }
      
      // Step 3: Find the dominant color cluster
      const totalPixels = data.length / info.channels;
      let maxCount = 0;
      let dominantColor = '';
      
      for (const [color, count] of Array.from(colorCounts.entries())) {
        if (count > maxCount) {
          maxCount = count;
          dominantColor = color;
        }
      }
      
      const dominancePercentage = (maxCount / totalPixels) * 100;
      
      // If one color represents >70% of pixels, it's likely a solid background
      const isSolid = dominancePercentage > 70;
      
      let reason = '';
      if (isSolid) {
        const [r, g, b] = dominantColor.split(',').map(Number);
        reason = `${dominancePercentage.toFixed(1)}% of pixels are RGB(${r},${g},${b}) - solid background`;
      } else {
        reason = `Only ${dominancePercentage.toFixed(1)}% pixels share dominant color - varied content`;
      }
      
      return {
        isSolid,
        avgStdDev: Math.round(dominancePercentage * 10) / 10, // Return dominance % for logging
        reason,
      };
    } catch (error) {
      console.error('Error analyzing image for solid background:', error);
      // If analysis fails, assume it's NOT a solid background (err on side of inclusion)
      // This prevents network errors from blocking legitimate posts
      throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Quick batch check for multiple images
   * Returns true if ALL images are solid color backgrounds
   */
  async areAllSolidBackgrounds(imageUrls: string[], threshold: number = 15): Promise<{
    allSolid: boolean;
    results: Array<{ url: string; isSolid: boolean; stdDev: number }>;
  }> {
    const results = await Promise.all(
      imageUrls.map(async (url) => {
        try {
          const analysis = await this.isSolidColorBackground(url, threshold);
          return {
            url,
            isSolid: analysis.isSolid,
            stdDev: analysis.avgStdDev,
          };
        } catch (error) {
          // If analysis fails, assume NOT solid (don't block on errors)
          return {
            url,
            isSolid: false,
            stdDev: 999, // High value = varied content
          };
        }
      })
    );

    const allSolid = results.every(r => r.isSolid);

    return { allSolid, results };
  }
}

export const imageAnalysisService = new ImageAnalysisService();
