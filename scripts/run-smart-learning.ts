import "dotenv/config";
import { smartLearningService } from "../server/services/smart-learning-service";

async function main() {
    console.log('Starting Smart Learning Calculation...');

    try {
        const result = await smartLearningService.recalculateEngagementScores(7); // Last 7 days
        console.log(`Calculation complete! Updated: ${result.updated}`);
    } catch (error) {
        console.error('Calculation failed:', error);
    }

    process.exit(0);
}

main();
