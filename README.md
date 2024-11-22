# ImageIQ

ImageIQ is a Telegram bot service that processes images of multiple-choice questions (MCQs) and provides answers using OpenAI's GPT-3.5-turbo-16k model. The bot is built using the `node-telegram-bot-api` library and integrates OCR capabilities to extract text from images.

## Features

- **Command Handling**: Supports `/start`, `/about`, and `/menu` commands to interact with users.
- **Image Processing**: Accepts images from users, extracts text using OCR, and processes the text to generate answers.
- **AI Integration**: Utilizes OpenAI's GPT-3.5-turbo-16k model to generate answers for the extracted MCQs.
- **Error Handling**: Provides feedback to users in case of errors during image processing or AI response generation.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/chiragbadhe/ImageIQ.git
   cd ImageIQ
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   - Create a `.env` file in the root directory.
   - Add your Telegram bot token:
     ```
     TELEGRAM_BOT_TOKEN=your_telegram_bot_token
     ```
   - Add your OpenAI api key:
     ```
     OPENAI_API_KEY=your_openai_api+key
     ```

4. Run the bot:
   ```bash
   npm start
   ```

## Usage

- **/start**: Initializes the bot and provides a welcome message.
- **/about**: Displays information about the bot.
- **/menu**: Lists available commands.
- **Image Upload**: Send an image containing MCQs to the bot, and it will return the answers.

## Dependencies

- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api): A library to interact with the Telegram Bot API.
- [OpenAI API](https://openai.com/api/): Used for generating answers to MCQs.
- [fs](https://nodejs.org/api/fs.html): Node.js file system module for handling file operations.
- [path](https://nodejs.org/api/path.html): Node.js path module for handling file paths.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Special thanks to [ch1rag.eth](https://github.com/chiragbadhe) for the initial development of this bot.
