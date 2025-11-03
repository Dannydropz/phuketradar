import sharp from 'sharp';
import { bmvbhash } from 'blockhash-core';

class ImageHashService {
  async generatePerceptualHash(imageUrl: string): Promise<string> {
    try {
      console.log(`[IMAGE-HASH] Generating perceptual hash for: ${imageUrl.substring(0, 80)}...`);
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      const { data, info } = await sharp(imageBuffer)
        .resize(16, 16, { fit: 'fill' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const hash = bmvbhash({ data, width: info.width, height: info.height }, 4);
      
      console.log(`[IMAGE-HASH] Generated hash: ${hash}`);
      return hash;
    } catch (error) {
      console.error(`[IMAGE-HASH] Error generating hash for ${imageUrl}:`, error);
      throw error;
    }
  }

  hammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      throw new Error('Hashes must be the same length');
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
      distance += this.countBits(xor);
    }
    
    return distance;
  }

  areSimilar(hash1: string, hash2: string, threshold: number = 10): boolean {
    const distance = this.hammingDistance(hash1, hash2);
    console.log(`[IMAGE-HASH] Hamming distance: ${distance} (threshold: ${threshold})`);
    return distance <= threshold;
  }

  private countBits(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }
}

export const imageHashService = new ImageHashService();
