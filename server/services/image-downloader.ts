
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
    async downloadAndSaveImage(
        url: string,
        prefix: string = "img",
        options: { blurFaces?: boolean } = {}
    ): Promise<string | null> {
        try {
            // Check if Cloudinary is configured
            if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                console.warn("⚠️ Cloudinary not configured. Falling back to local storage.");
                return this.downloadAndSaveImageLocal(url, prefix, options);
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

            // Optimize with sharp before upload
            const optimizedBuffer = await sharp(buffer)
                .resize({ width: 1000, withoutEnlargement: true })
                .webp({ quality: 75 })
                .toBuffer();

            // Upload to Cloudinary
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: "phuketradar",
                        public_id: `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
                        resource_type: "image",
                        // Apply face blur effect if requested
                        transformation: options.blurFaces ? [
                            { width: 1000, crop: "limit" },
                            { effect: "blur_faces:2000" }, // High blur for privacy
                            { quality: "auto" }
                        ] : undefined
                    },
                    (error, result) => {
                        if (error) {
                            console.error("❌ Cloudinary upload failed:", {
                                message: error.message,
                                name: error.name,
                                http_code: error.http_code,
                            });
                            console.warn("⚠️  Falling back to original URL");
                            // Fallback to original URL instead of null
                            resolve(url);
                        } else {
                            if (options.blurFaces) {
                                console.log(`✅ Uploaded to Cloudinary with FACE BLUR: ${result?.secure_url}`);
                            } else {
                                console.log(`✅ Uploaded to Cloudinary: ${result?.secure_url}`);
                            }
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
    async downloadAndSaveImageLocal(
        url: string,
        prefix: string = "img",
        options: { blurFaces?: boolean } = {}
    ): Promise<string | null> {
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

            let sharpInstance = sharp(buffer)
                .resize({ width: 1000, withoutEnlargement: true });

            // Note: Sharp doesn't have built-in face detection.
            // For local fallback, we'd need a library like face-api.js or opencv.
            // As a basic fallback, we could blur the whole image if requested, 
            // but that's not ideal. For now, we'll log a warning.
            if (options.blurFaces) {
                console.warn("⚠️ Local face blurring not implemented. Image saved without blur.");
            }

            await sharpInstance
                .webp({ quality: 75 })
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
