import { users, WechatyBuilder } from "wechaty";
import QRCode from "qrcode";
import { ChatGPTBot } from "./chatgpt.js";
import AliDrive from "./AliDrive.js";
import Utils from "./Utils.js";
const chatGPTBot = new ChatGPTBot();
const aliDrive = new AliDrive();

const bot = WechatyBuilder.build({
  name: "wechat-assistant", // generate xxxx.memory-card.json and save login data for the next login
});
// get a Wechaty instance

async function main() {
  let userName:string | null = null;
  bot
    .on("scan", async (qrcode, status) => {
      const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
      console.log(`Scan QR Code to login: ${status}\n${url}`);
      console.log(
        await QRCode.toString(qrcode, { type: "terminal", small: true })
      );
    })
    .on("login", async (user) => {
      console.log(`User ${user} logged in`);
      userName = user.name();
      chatGPTBot.setBotName(userName);
      aliDrive.setBotName(userName);
      await chatGPTBot.startGPTBot();
    })
    .on("message", async (message) => {
      if (message.text().startsWith("/ping ")) {
        await message.say("pong");
        return;
      }
      try {
        console.log(`Message: ${message}`);
        const realText = Utils.getRealText(message, userName!);
        switch (realText.slice(0,1)) {
          case '#':
            await aliDrive.onMessage(message);
            break;
          default:
            await chatGPTBot.onMessage(message);
            break;
        }
      } catch (e) {
        console.error(e);
      }
    });
  try {
    await bot.start();
  } catch (e) {
    console.error(
      `⚠️ Bot start failed, can you log in through wechat on the web?: ${e}`
    );
  }
}
main();
