
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class ImageDownloaderService {
    private uploadDir: string;
    private publicPath: string;

    constructor() {
        // Keep local path for fallback or temporary usage if needed
        this.uploadDir = path.join(process.cwd(), "public", "uploads");
        this.publicPath = "/uploads";
    }

    /**
     * Ensure the upload directory exists (legacy support)
     */
    private async ensureUploadDir(): Promise<void> {
        try {
            await fs.access(this.uploadDir);
        } catch {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Download an image from a URL, optimize it, and upload to Cloudinary.
     * Returns the secure Cloudinary URL.
     */
    async downloadAndSaveImage(url: string, prefix: string = "img"): Promise<string | null> {
        try {
            // Check if Cloudinary is configured
            if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                console.warn("⚠️ Cloudinary not configured. Falling back to local storage.");
                return this.downloadAndSaveImageLocal(url, prefix);
            }

            console.log(`⬇️  Downloading image: ${url}`);
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            if (!response.ok) {
                console.error(`Failed to fetch image: ${response.statusText} (${url})`);
                return null;
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Optimize with sharp before upload (optional, but good for bandwidth)
            // Cloudinary can also do this, but resizing locally saves upload time
            const optimizedBuffer = await sharp(buffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            // Upload to Cloudinary
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: "phuketradar",
                        public_id: `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
                        resource_type: "image",
                    },
                    (error, result) => {
                        if (error) {
                            console.error("❌ Cloudinary upload failed:", error);
                            // Fallback to local? Or just fail?
                            // For now, let's fail so we know something is wrong
                            resolve(null);
                        } else {
                            console.log(`✅ Uploaded to Cloudinary: ${result?.secure_url}`);
                            resolve(result?.secure_url || null);
                        }
                    }
                );

                // Write buffer to stream
                uploadStream.end(optimizedBuffer);
            });

        } catch (error) {
            console.error(`Error processing image (${url}):`, error);
            return null;
        }
    }

    /**
     * Legacy local download method (Fallback)
     */
    async downloadAndSaveImageLocal(url: string, prefix: string = "img"): Promise<string | null> {
        try {
            await this.ensureUploadDir();

            const response = await fetch(url);
            if (!response.ok) return null;

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const timestamp = Date.now();
            const random = crypto.randomBytes(4).toString("hex");
            const filename = `${prefix}-${timestamp}-${random}.webp`;
            const filepath = path.join(this.uploadDir, filename);

            await sharp(buffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(filepath);

            console.log(`✅ Image saved locally: ${filename}`);
            return `${this.publicPath}/${filename}`;
        } catch (error) {
            console.error(`Error saving local image:`, error);
            return null;
        }
    }
}

export const imageDownloaderService = new ImageDownloaderService();
