import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
    try {
        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 10,
            messages: [{ role: "user", content: "Hello" }],
        });
        console.log("Success:", response.content);
    } catch (error) {
        console.error("Error with claude-sonnet-4-5:", error.message);
    }
}
main();
