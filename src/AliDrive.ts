
import { ContactInterface, RoomInterface } from 'wechaty/impls'
import { Message } from 'wechaty'
import Utils from './Utils.js'
import fetch from 'node-fetch'

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
    // const data = await fetch(`https://yiso.fun/api/search?name=${encodeURIComponent(searchKey)}&pageNo=1&pageSize=8`, {
    //   headers: {
    //     accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    //     'accept-language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8,zh-HK;q=0.7,en;q=0.6,am;q=0.5,de-LI;q=0.4,de;q=0.3',
    //     'cache-control': 'max-age=0',
    //     'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="102", "Google Chrome";v="102"',
    //     'sec-ch-ua-mobile': '?0',
    //     'sec-ch-ua-platform': '"macOS"',
    //     'sec-fetch-dest': 'document',
    //     'sec-fetch-mode': 'navigate',
    //     'sec-fetch-site': 'none',
    //     'sec-fetch-user': '?1',
    //     'upgrade-insecure-requests': '1'
    //   },
    //   referrerPolicy: 'strict-origin-when-cross-origin',
    //   body: null,
    //   method: 'GET'
    // }).then(async res => await res.json()) as any
    // const list = data.data.list
    const data = await fetch('https://gitcafe.net/tool/alipaper/', {
      headers: {
        accept: '*/*',
        'accept-language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8,zh-HK;q=0.7,en;q=0.6,am;q=0.5,de-LI;q=0.4,de;q=0.3',
        'content-type': 'application/x-www-form-urlencoded',
        'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="102", "Google Chrome";v="102"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site'
      },
      referrer: 'https://u.gitcafe.net/',
      referrerPolicy: 'strict-origin-when-cross-origin',
      body: `action=search&keyword=${searchKey}`,
      method: 'POST'
    }).then(async res => await res.json()) as Array<{ title: string, key: string }>
    const list = data.map(v => ({ name: v.title, url: `https://www.aliyundrive.com/s/${v.key}` }))
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
