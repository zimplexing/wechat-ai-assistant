
import { ContactInterface, RoomInterface } from 'wechaty/impls'
import { Message } from 'wechaty'
import Utils from './Utils.js'
import cloudscraper from 'cloudscraper'

export default class AliDrive {
  botName: string = ''
  public setBotName (botName: string): void {
    this.botName = botName
  }

  private async sendMessage (talker: ContactInterface, searchKey: string, room?: RoomInterface): Promise<void> {
    console.log(`Trigger AliDrive search: ${searchKey}`)
    await Utils.trySay(room ?? talker, `正在努力搜索 ${searchKey}...`)
    let message = ''
    let result = ''
    const response = (await cloudscraper.get(`https://yiso.fun/api/search?name=${encodeURIComponent(searchKey)}&pageNo=1&pageSize=8`)) as unknown as string
    console.log(response)
    const list = JSON.parse(response).data.list
    if (!list.length) {
      await Utils.trySay(room ?? talker, '抱歉，未找到资源')
      return
    }
    list.forEach((v: { url: string, name: string }, idx: number) => {
      // remove highlight span tag
      const name = v.name.replace(/<span style="color: red;">/g, '').replace(/<\/span>/g, '')
      result += `${idx + 1}、${name}: ${v.url} \n`
      return result
    })
    if (room != null) {
      message = `${searchKey} 搜索结果\n ------\n ${result}`
      await Utils.trySay(room, message)
    } else {
      await Utils.trySay(talker, result)
    }
  }

  private shouldTriggerSearch (message: string, isGroup: boolean): boolean {
    const chatGroupTriggerKeyword = `@${this.botName}`
    return isGroup ? message.includes(chatGroupTriggerKeyword) : true
  }

  public async onMessage (message: Message): Promise<void> {
    const talker = message.talker()
    const rawText = message.text()
    const room = message.room()
    const messageType = message.type()
    if (Utils.isNonsense(talker, messageType, rawText)) {
      return
    }
    const realText = Utils.getRealText(message, this.botName)
    if (this.shouldTriggerSearch(rawText, !(room == null)) && realText.startsWith('#')) {
      const searchKey = realText.slice(1)
      await this.sendMessage(talker, searchKey, room)
    }
  }
}
