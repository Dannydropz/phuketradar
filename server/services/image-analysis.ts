import sharp from 'sharp';

export interface ImageAnalysisResult {
  status: 'download_failed' | 'too_large' | 'solid_background' | 'real_photo' | 'analysis_error';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  metadata?: {
    fileSize?: number;
    dominancePercentage?: number;
    dominantColor?: string;
  };
}

export class ImageAnalysisService {
  /**
   * Safe image fetch with size and metadata checks
   * Returns structured result instead of throwing
   */
  async analyzeImageSafely(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      // Step 1: HEAD request to check file size without downloading full image
      const headResponse = await fetch(imageUrl, { method: 'HEAD' });

      if (!headResponse.ok) {
        // Network/permission error - accept the post (don't block on CDN issues)
        return {
          status: 'download_failed',
          confidence: 'low',
          reason: `Download failed (${headResponse.status}) - accepting post (CDN error shouldn't block)`,
        };
      }

      const contentLength = headResponse.headers.get('content-length');
      const fileSize = contentLength ? parseInt(contentLength, 10) : 0;

      // Step 2: File size heuristic - Facebook text-on-background posts are typically <150KB
      // Increased from 80KB to catch gradient backgrounds which can be larger
      // Real photos are usually >150KB even when compressed
      if (fileSize > 0 && fileSize < 150000) {
        // Small/medium file = possibly text graphic, download to confirm with color analysis
        const getResponse = await fetch(imageUrl);
        if (!getResponse.ok) {
          return {
            status: 'download_failed',
            confidence: 'low',
            reason: `Small file (${Math.round(fileSize / 1024)}KB) but download failed - accepting`,
            metadata: { fileSize },
          };
        }

        // Step 3: Color analysis - check both dominance AND unique color clusters
        const imageBuffer = Buffer.from(await getResponse.arrayBuffer());
        const colorResult = await this.analyzeColorDominance(imageBuffer);

        // TEXT GRAPHIC DETECTION - Two methods:
        // Method 1: High dominance (>75%) = solid color background
        // Method 2: Very few color clusters (<5) + moderate dominance (>60%) = gradient background
        const isHighDominance = colorResult.dominancePercentage > 75;
        const isLowVariety = colorResult.uniqueColorClusters < 5 && colorResult.dominancePercentage > 60;

        if (isHighDominance || isLowVariety) {
          const detectionMethod = isHighDominance ? 'solid color' : 'low color variety (gradient)';
          return {
            status: 'solid_background',
            confidence: 'high',
            reason: `File ${Math.round(fileSize / 1024)}KB, ${colorResult.dominancePercentage.toFixed(1)}% dominant color, ${colorResult.uniqueColorClusters} color clusters = ${detectionMethod} text graphic`,
            metadata: {
              fileSize,
              dominancePercentage: colorResult.dominancePercentage,
              dominantColor: colorResult.dominantColor,
            },
          };
        } else {
          // Varied colors or moderate cluster count - likely a real photo
          return {
            status: 'real_photo',
            confidence: 'medium',
            reason: `File ${Math.round(fileSize / 1024)}KB with ${colorResult.uniqueColorClusters} color clusters (${colorResult.dominancePercentage.toFixed(1)}% dominant) - accepting as real photo`,
            metadata: {
              fileSize,
              dominancePercentage: colorResult.dominancePercentage,
            },
          };
        }
      } else if (fileSize > 0) {
        // Large file = likely real photo
        return {
          status: 'real_photo',
          confidence: 'high',
          reason: `Large file (${Math.round(fileSize / 1024)}KB) - real photo`,
          metadata: { fileSize },
        };
      } else {
        // No size info - download and analyze
        const getResponse = await fetch(imageUrl);
        if (!getResponse.ok) {
          return {
            status: 'download_failed',
            confidence: 'low',
            reason: `No size header and download failed - accepting (CDN error)`,
          };
        }

        const imageBuffer = Buffer.from(await getResponse.arrayBuffer());
        const actualSize = imageBuffer.length;

        if (actualSize < 150000) {
          const colorResult = await this.analyzeColorDominance(imageBuffer);
          // Same detection logic: high dominance OR low color variety
          const isHighDominance = colorResult.dominancePercentage > 75;
          const isLowVariety = colorResult.uniqueColorClusters < 5 && colorResult.dominancePercentage > 60;

          if (isHighDominance || isLowVariety) {
            const detectionMethod = isHighDominance ? 'solid color' : 'low color variety (gradient)';
            return {
              status: 'solid_background',
              confidence: 'high',
              reason: `File ${Math.round(actualSize / 1024)}KB, ${colorResult.uniqueColorClusters} color clusters = ${detectionMethod} text graphic`,
              metadata: {
                fileSize: actualSize,
                dominancePercentage: colorResult.dominancePercentage,
                dominantColor: colorResult.dominantColor,
              },
            };
          }
        }

        return {
          status: 'real_photo',
          confidence: 'medium',
          reason: `Downloaded and analyzed - appears to be real photo`,
          metadata: { fileSize: actualSize },
        };
      }
    } catch (error) {
      // Any error = accept the post (don't block on analysis failures)
      return {
        status: 'analysis_error',
        confidence: 'low',
        reason: `Analysis error: ${error instanceof Error ? error.message : 'Unknown'} - accepting post`,
      };
    }
  }

  /**
   * Analyze color dominance of an image buffer
   * Returns percentage of pixels that are the dominant color
   */
  private async analyzeColorDominance(imageBuffer: Buffer): Promise<{
    dominancePercentage: number;
    dominantColor: string;
    uniqueColorClusters: number;
  }> {
    // Downsample to 32x32 for fast analysis
    const { data, info } = await sharp(imageBuffer)
      .resize(32, 32, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Cluster nearby colors (tolerance = colors within this range are considered "same")
    // Using a higher tolerance (50) to better cluster gradient shades together
    const colorCounts = new Map<string, number>();
    const tolerance = 50; // Increased from 30 to catch gradient variations

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

    // Find dominant color cluster
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

    // Count unique color clusters - text overlays typically have very few (< 5)
    // Real photos have many distinct color regions (> 10)
    const uniqueColorClusters = colorCounts.size;

    return { dominancePercentage, dominantColor, uniqueColorClusters };
  }

  /**
   * Batch analysis of multiple images
   * Returns summary: are ALL images text graphics?
   */
  async analyzeMultipleImages(imageUrls: string[]): Promise<{
    allTextGraphics: boolean;
    anyRealPhotos: boolean;
    multipleRealPhotos: boolean;
    results: Array<{ url: string; analysis: ImageAnalysisResult }>;
  }> {
    const results = await Promise.all(
      imageUrls.map(async (url) => ({
        url,
        analysis: await this.analyzeImageSafely(url),
      }))
    );

    const allTextGraphics = results.every(
      r => r.analysis.status === 'solid_background' && r.analysis.confidence === 'high'
    );

    const anyRealPhotos = results.some(
      r => r.analysis.status === 'real_photo' ||
        r.analysis.status === 'download_failed' ||
        r.analysis.status === 'analysis_error'
    );

    // Count how many images are confirmed real photos (high confidence)
    const realPhotoCount = results.filter(
      r => r.analysis.status === 'real_photo' && r.analysis.confidence !== 'low'
    ).length;

    const multipleRealPhotos = realPhotoCount >= 2;

    return { allTextGraphics, anyRealPhotos, multipleRealPhotos, results };
  }
}

export const imageAnalysisService = new ImageAnalysisService();
