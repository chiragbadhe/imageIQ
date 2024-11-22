import { config } from "dotenv";
import UnifiedBotService from "./services/UnifiedBotService";

// Load environment variables
config();

// Initialize the bot service
new UnifiedBotService();
