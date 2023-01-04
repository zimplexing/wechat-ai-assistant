import { WechatyInterface } from 'wechaty/impls'
import { Message } from 'wechaty'
import axios from 'axios'
import { intervalTaskManager } from './IntervalTaskManager.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import Utils from './Utils.js'
import { Base64 } from 'js-base64'
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Shanghai')
interface CardGroup {
  itemid: string
  card_type: number
  pic: string
  scheme: string
  promotion: object
  actionlog: {
    act_code: number
    lfid: string
    fid: string
    luicode: string
    act_type: number
    uicode: string
    ext: string
  }
  icon: string
  desc: string
}

interface ShortUrlRes {
  code: number
  msg: string
  data: {
    shortUrl: string
    url: string
  }
}

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
    console.log(`Schedule weibo trending task at ${dayjs().tz().format()}`)
    intervalTaskManager.addTask('intervalSendMessage', this.intervalSendMessage, {
      immediately: true,
      interval: 2 * 60 * 60 * 1000
    })
  }

  private async getShortUrl (url: string): Promise<string | undefined> {
    try {
      const shortUrlApi = getShortUrlApi(url)
      const { data } = (await axios(shortUrlApi)).data as ShortUrlRes
      return data.shortUrl
    } catch (error) {
      console.error(error)
    }
  }

  private async generateShortUrl (items: CardGroup[], count = 0): Promise<CardGroup[]> {
    return await new Promise((resolve, reject) => {
      if (count < items.length) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
          const shortUrl = await this.getShortUrl(items[count].scheme)
          shortUrl && (items[count].scheme = shortUrl)
          this.generateShortUrl(items, count + 1).then(resolve).catch(reject)
        }, 1000)
      } else {
        resolve(items)
      }
    })
  }

  private async getTrendingData (): Promise<string> {
    const response = await axios(WEIBO_TRENDING_API)
    if (response.data.ok === 1) {
      const items = response.data.data.cards[0]?.card_group as CardGroup[]
      const newItems = await this.generateShortUrl(
        // 过滤广告
        items.filter(v => !v.promotion)
          .slice(1, 11)
      )
      return newItems.reduce((pre, cur, idx) => {
        pre += `${++idx}. ${cur.desc} ${cur.scheme}\n`
        return pre
      }, '当前微博热搜：\n')
    }
    return ''
  }

  private readonly intervalSendMessage: () => Promise<void> = async () => {
    console.log(`
      Trigger interval task(weiboTrending), current time: ${dayjs().tz().format()}, hour: ${dayjs().tz().hour()}
    `)
    const currentHour = dayjs().tz().hour()
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
    console.log('updated weibo trending')
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
