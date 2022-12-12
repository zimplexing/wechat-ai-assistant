import { WechatyBuilder } from 'wechaty'
import QRCode from 'qrcode'
// import { ChatGPTBot } from "./chatgpt.js";
import AliDrive from './AliDrive.js'
import Utils from './Utils.js'
import WeiboTrending from './WeiboTrending.js'
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

// const chatGPTBot = new ChatGPTBot();
const aliDrive = new AliDrive()
let weiboTrending: WeiboTrending | null = null
const bot = WechatyBuilder.build({
  name: 'wechat-assistant' // generate xxxx.memory-card.json and save login data for the next login
})

function weiboTrendingSetup (): void {
  weiboTrending = new WeiboTrending(bot, {
    room: ['智能小助理']
  })
  weiboTrending.scheduleTask()
}

// async function chatGPTBotSetup(userName: string) {
//     chatGPTBot.setBotName(userName);
//     await chatGPTBot.startGPTBot();
// }

async function main (): Promise<void> {
  let userName: string | null = null
  bot
    .on('scan', async (qrcode, status) => {
      const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`
      console.log(`Scan QR Code to login: ${status}\n${url}`)
      console.log(
        await QRCode.toString(qrcode, { type: 'terminal', small: true })
      )
    })
    .on('login', async (user) => {
      userName = user.name()
      console.log(`User ${userName} logged in`)
      aliDrive.setBotName(userName)
      weiboTrending?.setBotName(userName)
      //  await chatGPTBotSetup(userName);
      weiboTrendingSetup()
    })
    .on('message', async (message) => {
      if (message.text().startsWith('/ping ')) {
        await message.say('pong')
        return
      }
      try {
        console.log(`Message: ${message.text()}`)
        const realText = Utils.getRealText(message, userName!)
        switch (realText.slice(0, 1)) {
          case '#':
            await aliDrive.onMessage(message)
            break

          default:
            // await chatGPTBot.onMessage(message);
            await weiboTrending?.onMessage(message)
            break
        }
      } catch (e) {
        console.error(e)
      }
    })
  try {
    await bot.start()
  } catch (e: any) {
    console.error(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `⚠️ Bot start failed, can you log in through wechat on the web?: ${e}`
    )
  }
}
await main()
