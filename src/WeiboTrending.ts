import { WechatyInterface } from 'wechaty/impls'
import { Message } from 'wechaty'
import fetch from 'node-fetch'
import { intervalTaskManager } from './IntervalTaskManager.js'
import dayjs from 'dayjs'
import Utils from './Utils.js'
import { Base64 } from 'js-base64'
import _ from 'lodash'

const WEIBO_TRENDING_API =
  'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot'
const getShortUrlApi: (url: string) => string = url => {
  return `https://www.mxnzp.com/api/shortlink/create?url=${Base64.encode(url)}&app_id=${
    process.env.SHORT_URL_APP_ID!
  }&app_secret=${process.env.SHORT_URL_APP_SECRET!}`
}

export default class WeiboTrending {
  botName: string = ''
  public setBotName (botName: string): void {
    this.botName = botName
  }

  constructor (
    private readonly _bot: WechatyInterface,
    private readonly _targetContacts: {
      contact?: string[]
      room?: string[]
    }
  ) {}

  public scheduleTask (): void {
    intervalTaskManager.addTask('intervalSendMessage', this.intervalSendMessage, {
      immediately: true,
      interval: 30 * 60 * 1000
    })
  }

  private readonly getShortUrl = _.throttle(async url => {
    try {
      const shortUrlApi = getShortUrlApi(url)
      const response = await fetch(shortUrlApi)
      const { data } = (await response.json()) as any
      return data.shortUrl
    } catch (error) {
      console.error(error)
    }
  }, 1500)

  private async getTrendingData (): Promise<string> {
    const response = await fetch(WEIBO_TRENDING_API)
    const data = (await response.json()) as any
    if (data.ok === 1) {
      const items = data.data.cards[0]?.card_group as any[]
      let msgTemplate = '当前微博热搜：\n'
      let idx = 1
      for await (const item of items.slice(1, 11)) {
        const url = await this.getShortUrl(item.scheme)
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        msgTemplate += `${idx++}. ${item.desc} ${url}\n`
      }
      return msgTemplate
    }
    return ''
  }

  // 抽象成一个广播消息的方法到 utils 方法中
  private readonly intervalSendMessage: () => Promise<void> = async () => {
    const currentHour = dayjs().hour()
    if (currentHour < 9) return
    const trendingData = await this.getTrendingData()
    for (const name of this._targetContacts?.contact ?? []) {
      const contact = await this._bot.Contact.find({ name })
      await contact?.say(trendingData)
    }
    for (const name of this._targetContacts?.room ?? []) {
      const contact = await this._bot.Room.find({ topic: name })
      await contact?.say(trendingData)
    }
    console.log('update weibo trending')
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
    if (
      this.shouldTriggerSearch(rawText, !(room == null)) &&
      realText.includes(process.env.WEIBO_TRENDING_TRIGGER_WORLD!)
    ) {
      const trending = await this.getTrendingData()
      await Utils.trySay(room ?? talker, trending)
    }
  }
}
