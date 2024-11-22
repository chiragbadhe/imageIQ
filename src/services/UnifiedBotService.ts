import TelegramBot from "node-telegram-bot-api";
import { extractTextFromImage } from "../utils/ocr";
import { getOpenAIClient } from "../utils/openai";
import fs from "fs";
import path from "path";

class UnifiedBotService {
  private bot: TelegramBot;
  private client = getOpenAIClient();

  static readonly commands: TelegramBot.BotCommand[] = [
    { command: "start", description: "Restart the bot" },
    { command: "about", description: "Learn more about the bot" },
    { command: "menu", description: "Show available options" },
  ];

  constructor() {
    this.bot = new TelegramBot(process.env["TELEGRAM_BOT_TOKEN"]!, {
      polling: true,
    });
    this.init();
  }

  private init() {
    this.bot.setMyCommands(UnifiedBotService.commands);
    this.bot.onText(/\/start/, (msg) => this.start(msg));
    this.bot.onText(/\/about/, (msg) => this.about(msg));
    this.bot.onText(/\/menu/, (msg) => this.menu(msg));
    this.bot.on("photo", (msg) => {
      const fileId = msg.photo?.[msg.photo.length - 1]?.file_id;
      if (fileId) {
        this.handleImage(msg, fileId);
      }
    });
  }

  public async start(msg: TelegramBot.Message): Promise<void> {
    console.log(`[COMMAND]: /start triggered by user ${msg.from?.id}`);
    this.bot.sendMessage(
      msg.chat.id,
      "Welcome! Send me an image of MCQ questions, and I'll provide the answers!",
      {
        reply_markup: {
          keyboard: [
            [{ text: "/start" }, { text: "/about" }, { text: "/menu" }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }

  public async about(msg: TelegramBot.Message): Promise<void> {
    console.log(`[COMMAND]: /about triggered by user ${msg.from?.id}`);
    this.bot.sendMessage(msg.chat.id, "<< Made with ♥ by ch1rag.eth >>", {
      reply_markup: {
        keyboard: [
          [{ text: "/start" }, { text: "/about" }, { text: "/menu" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  public async menu(msg: TelegramBot.Message): Promise<void> {
    console.log(`[COMMAND]: /menu triggered by user ${msg.from?.id}`);
    const menuText = `
    Here are the available commands:
    /start - Restart the bot
    /about - Learn more about the bot
    /menu - Show available options
    `;
    this.bot.sendMessage(msg.chat.id, menuText, {
      reply_markup: {
        keyboard: [
          [{ text: "/start" }, { text: "/about" }, { text: "/menu" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  public async handleImage(
    msg: TelegramBot.Message,
    fileId: string
  ): Promise<void> {
    console.log(`[PHOTO]: Received image from user ${msg.from?.id}`);
    try {
      console.log(`[PHOTO]: Fetching file link for file_id ${fileId}`);
      const fileUrl = await this.bot.getFileLink(fileId);

      console.log(`[PHOTO]: Downloading image from ${fileUrl}`);
      const response = await fetch(fileUrl);
      const buffer = await response.arrayBuffer();
      const imagePath = path.join(__dirname, "temp_image.jpg");
      fs.writeFileSync(imagePath, Buffer.from(buffer));
      console.log(`[PHOTO]: Image saved to ${imagePath}`);

      console.log(`[OCR]: Starting text extraction for ${imagePath}`);
      const extractedText = await extractTextFromImage(imagePath);
      console.log(`[OCR]: Extracted text:\n${extractedText}`);

      console.log(`[GPT]: Sending extracted text to ChatGPT API`);
      const chatResponse = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          {
            role: "system",
            content: "You are an AI that answers multiple-choice questions.",
          },
          { role: "user", content: extractedText },
        ],
      });
      const answer =
        chatResponse.choices[0].message?.content ||
        "Could not generate an answer.";
      console.log(`[GPT]: Received response:\n${answer}`);
      console.log(`[REPLY]: Sending answer back to user ${msg.from?.id}`);
      await this.bot.sendMessage(msg.chat.id, `Answers:\n${answer}`);

      console.log(`[CLEANUP]: Deleting temporary file ${imagePath}`);
      fs.unlinkSync(imagePath);
    } catch (error) {
      console.error(
        `[ERROR]: Error processing image from user ${msg.from?.id}`,
        (error as Error).message
      );
      this.bot.sendMessage(
        msg.chat.id, 
        `Error: ${(error as Error).message}`
      );
    }
  }
}

export default UnifiedBotService; 