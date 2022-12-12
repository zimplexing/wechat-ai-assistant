import TelegramBot from 'node-telegram-bot-api'

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true })

export {
  bot
}
