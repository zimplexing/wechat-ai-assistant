
import { ContactInterface, RoomInterface } from "wechaty/impls";
import { Message } from "wechaty";
import Utils from "./Utils.js";
import fetch from "node-fetch";

export default class AliDrive {
  botName: string = "";
  public setBotName(botName: string) {
    this.botName = botName;
  }

  private async onPrivateAliDriveMessage(talker: ContactInterface, searchKey: string, room?: RoomInterface) {
    console.log(`Trigger AliDrive search: ${searchKey}`);
    await Utils.trySay(room ?? talker, `正在努力搜索 ${searchKey}...`);
    let message = '';
    let result = '';
    const response = await fetch(`https://yiso.fun/api/search?name=${searchKey}&pageNo=1&pageSize=8`)
    const {data: {list}} = await response.json() as any;
    if (!list.length) {
      await Utils.trySay(room ?? talker, '抱歉，未找到资源')
      return;
    }
    list.forEach((v: {url: string, name: string},idx: number) => {
      // remove highlight span tag
      const name = v.name.replace(/<span style=\"color: red;\">/g, '').replace(/<\/span>/g,'')
      return result += `${idx+1}、${name}: ${v.url} \n`;
    })
    if (room) {
      message = `${searchKey} 搜索结果\n ------\n ${result}`;
      await Utils.trySay(room, message);
    } else {
      await Utils.trySay(talker, result);
    }
  }

  private shouldTriggerSearch(message: string, isGroup:boolean) {
    const chatGroupTriggerKeyword = `@${this.botName}`
    return isGroup ? message.includes(chatGroupTriggerKeyword) : true
  }

  public async onMessage(message: Message) {
    const talker = message.talker();
    const rawText = message.text();
    const room = message.room();
    const messageType = message.type();
    if (Utils.isNonsense(talker, messageType, rawText)) {
      return;
    }
    const realText = Utils.getRealText(message, this.botName);
    if (this.shouldTriggerSearch(rawText, !!room) && realText.startsWith('#')) {
      const searchKey = realText.slice(1);
      await this.onPrivateAliDriveMessage(talker, searchKey, room)
      return;
    }
  }
}