import OpenAI from "openai";
import { imageDownloaderService } from "./image-downloader";

// Standard OpenAI configuration
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class ImageGeneratorService {
    /**
     * Generate an enticing, high-quality editorial news image for an article.
     * Used for viral (Score 5) stories to replace low-quality screen grabs.
     */
    async generateEditorialImage(title: string, excerpt: string): Promise<string | null> {
        try {
            console.log(`🎨 Requesting AI Editorial Image for: ${title}`);

            // STEP 1: Use GPT-4o-mini to sanitize the prompt for DALL-E safety
            // It will rephrase "Tourist Assault" into something like "Dramatic scene on a Phuket street"
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a DALL-E prompt engineer. Your job is to take a news headline and excerpt and turn it into a SAFE, professional news editorial photography prompt for DALL-E 3. ABSOLUTELY NO graphic violence, blood, weapons, or illegal acts. Focus on the SETTING, the MOOD, the ATMOSPHERE, and NEUTRAL news elements (police lights, bystanders, street scenes, official buildings). Replace violent words with neutral equivalents like 'incident', 'drama', or 'situation'. Output ONLY the DALL-E prompt text."
                    },
                    {
                        role: "user",
                        content: `Headline: ${title}\nExcerpt: ${excerpt}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 200,
            });

            const safeDallePrompt = completion.choices[0].message.content || title;
            console.log(`✨ Sanitized DALL-E Prompt: ${safeDallePrompt}`);

            // Construct the final detailed prompt
            const prompt = `A professional news editorial photograph from Phuket, Thailand. 
            
            Scene: ${safeDallePrompt}
            
            Style Requirements:
            - Professional press photography style (Reuters/AP style).
            - Realistic lighting, natural colors, high resolution, 8k.
            - Wide angle 16:9 cinematic composition.
            - NO text, watermarks, or logos.
            - Authentic Thai street atmosphere.`;

            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                quality: "hd",
                style: "vivid",
            });

            const imageUrl = response.data?.[0]?.url;
            if (!imageUrl) {
                console.error("❌ No image URL returned from OpenAI");
                return null;
            }

            console.log("✅ DALL-E generated image successfully. Downloading to storage...");

            // Use prefix 'ai-hero' to distinguish generated images
            const storedUrl = await imageDownloaderService.downloadAndSaveImage(imageUrl, "ai-hero");

            if (storedUrl) {
                console.log(`✨ AI Hero Image stored: ${storedUrl}`);
                return storedUrl;
            }

            return imageUrl; // Fallback to original OpenAI URL if storage fails
        } catch (error) {
            console.error("❌ Error generating editorial image:", error);
            return null;
        }
    }
}

export const imageGeneratorService = new ImageGeneratorService();
