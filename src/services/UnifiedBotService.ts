import TelegramBot from "node-telegram-bot-api";
import { extractTextFromImage } from "../utils/ocr";
import { getOpenAIClient } from "../utils/openai";
import fs from "fs";
import path from "path";

class UnifiedBotService {
  private bot: TelegramBot;
  private client = getOpenAIClient();
  private userSubjects: Map<number, string> = new Map();
  private userHistory: Map<number, string[]> = new Map();

  static readonly commands: TelegramBot.BotCommand[] = [
    { command: "start", description: "Restart the bot" },
    { command: "about", description: "Learn more about the bot" },
    { command: "menu", description: "Show available options" },
    { command: "subject", description: "Set your current subject" },
    { command: "history", description: "View your answer history" },
    { command: "clear", description: "Clear your answer history" },
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
    this.bot.onText(/\/subject/, (msg) => this.setSubject(msg));
    this.bot.onText(/\/history/, (msg) => this.showHistory(msg));
    this.bot.onText(/\/clear/, (msg) => this.clearHistory(msg));
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
      "Welcome! Send me an image of MCQ questions, and I'll provide the answers with option letters (A, B, C, or D)!\n\nUse /subject to set your current subject for better answers.",
      {
        reply_markup: {
          keyboard: [
            [{ text: "/start" }, { text: "/about" }, { text: "/menu" }],
            [{ text: "/subject" }, { text: "/history" }, { text: "/clear" }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }

  public async about(msg: TelegramBot.Message): Promise<void> {
    console.log(`[COMMAND]: /about triggered by user ${msg.from?.id}`);
    this.bot.sendMessage(
      msg.chat.id, 
      "<< Made with ♥ by ch1rag.eth >>\n\nThis bot helps you solve MCQ questions! Features:\n- OCR text extraction\n- AI-powered answer generation\n- Subject-specific responses\n- Answer history tracking",
      {
        reply_markup: {
          keyboard: [
            [{ text: "/start" }, { text: "/about" }, { text: "/menu" }],
            [{ text: "/subject" }, { text: "/history" }, { text: "/clear" }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }

  public async menu(msg: TelegramBot.Message): Promise<void> {
    console.log(`[COMMAND]: /menu triggered by user ${msg.from?.id}`);
    const menuText = `
    Here are the available commands:
    /start - Restart the bot
    /about - Learn more about the bot
    /menu - Show available options
    /subject - Set your current subject
    /history - View your answer history
    /clear - Clear your answer history
    `;
    this.bot.sendMessage(msg.chat.id, menuText, {
      reply_markup: {
        keyboard: [
          [{ text: "/start" }, { text: "/about" }, { text: "/menu" }],
          [{ text: "/subject" }, { text: "/history" }, { text: "/clear" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  private async setSubject(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id;
    if (!userId) return;

    this.bot.sendMessage(
      msg.chat.id,
      "Please enter your subject (e.g., Mathematics, Physics, Chemistry, Biology):",
      {
        reply_markup: {
          force_reply: true,
        },
      }
    ).then(sentMsg => {
      this.bot.onReplyToMessage(msg.chat.id, sentMsg.message_id, (replyMsg) => {
        const subject = replyMsg.text;
        if (subject) {
          this.userSubjects.set(userId, subject);
          this.bot.sendMessage(msg.chat.id, `Subject set to: ${subject}`);
        }
      });
    });
  }

  private async showHistory(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id;
    if (!userId) return;

    const history = this.userHistory.get(userId) || [];
    if (history.length === 0) {
      this.bot.sendMessage(msg.chat.id, "No answer history available.");
      return;
    }

    const historyText = history.join('\n\n');
    this.bot.sendMessage(msg.chat.id, `Your answer history:\n\n${historyText}`);
  }

  private async clearHistory(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id;
    if (!userId) return;

    this.userHistory.delete(userId);
    this.bot.sendMessage(msg.chat.id, "Your answer history has been cleared.");
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
      const imagePath = path.join(__dirname, `temp_image_${msg.from?.id}.jpg`);
      fs.writeFileSync(imagePath, Buffer.from(buffer));
      console.log(`[PHOTO]: Image saved to ${imagePath}`);

      await this.bot.sendMessage(msg.chat.id, "Processing your image... 🔄");

      console.log(`[OCR]: Starting text extraction for ${imagePath}`);
      const extractedText = await extractTextFromImage(imagePath);
      console.log(`[OCR]: Extracted text:\n${extractedText}`);

      const userId = msg.from?.id;
      const subject = userId ? this.userSubjects.get(userId) : undefined;
      
      console.log(`[GPT]: Sending extracted text to ChatGPT API`);
      const chatResponse = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          {
            role: "system",
            content: `You are an AI that answers multiple-choice questions${subject ? ` specializing in ${subject}` : ''}. For each question, provide the answer letter (A, B, C, or D) followed by a dash and a brief explanation of the answer. Format each answer like "1. A - This is correct because...". Number answers sequentially.`,
          },
          { role: "user", content: extractedText },
        ],
      });
      const answer =
        chatResponse.choices[0].message?.content ||
        "Could not generate an answer.";
      console.log(`[GPT]: Received response:\n${answer}`);
      
      const timestamp = new Date().toLocaleString();
      const formattedAnswer = `[${timestamp}]\n${answer}`;
      
      if (userId) {
        const history = this.userHistory.get(userId) || [];
        history.push(formattedAnswer);
        this.userHistory.set(userId, history.slice(-10)); // Keep last 10 answers
      }

      console.log(`[REPLY]: Sending answer back to user ${msg.from?.id}`);
      await this.bot.sendMessage(
        msg.chat.id, 
        `Answers${subject ? ` for ${subject}` : ''}:\n${answer}`,
        {
          reply_to_message_id: msg.message_id,
        }
      );

      console.log(`[CLEANUP]: Deleting temporary file ${imagePath}`);
      fs.unlinkSync(imagePath);
    } catch (error) {
      console.error(
        `[ERROR]: Error processing image from user ${msg.from?.id}`,
        (error as Error).message
      );
      this.bot.sendMessage(
        msg.chat.id, 
        `Error: ${(error as Error).message}`,
        {
          reply_to_message_id: msg.message_id,
        }
      );
    }
  }
}

export default UnifiedBotService;