import { ChatGPTAPI, ChatGPTConversation } from 'chatgpt'
import { Message } from 'wechaty'
import { config } from './config.js'
import { execa } from 'execa'
import { Cache } from './cache.js'
import { ContactInterface, RoomInterface } from 'wechaty/impls'
import Utils from './Utils.js'
import {
  IChatGPTItem,
  IConversationItem,
  AccountWithUserInfo,
  isAccountWithUserInfo,
  isAccountWithSessionToken,
  AccountWithSessionToken,
  IAccount
} from './interface.js'

const ErrorCode2Message: Record<string, string> = {
  503:
    'OpenAI 服务器繁忙，请稍后再试| The OpenAI server is busy, please try again later',
  429:
    'OpenAI 服务器限流，请稍后再试| The OpenAI server was limted, please try again later',
  500:
    'OpenAI 服务器繁忙，请稍后再试| The OpenAI server is busy, please try again later',
  unknown: '未知错误，请看日志 | Error unknown, please see the log'
}
export class ChatGPTPoole {
  chatGPTPools: IChatGPTItem[] | [] = []
  conversationsPool: Map<string, IConversationItem> = new Map()
  cache = new Cache('cache.json')
  async getSessionToken (email: string, password: string): Promise<string> {
    if (this.cache.get(email)) {
      return this.cache.get(email)
    }
    const cmd = `poetry run python3 src/generate_session.py ${email} ${password}`
    const platform = process.platform
    const { stdout, stderr, exitCode } = await execa(
      platform === 'win32' ? 'powershell' : 'sh',
      [platform === 'win32' ? '/c' : '-c', cmd]
    )
    if (exitCode !== 0) {
      console.error(`${email} login failed: ${stderr}`)
      return ''
    }
    // The last line in stdout is the session token
    const lines = stdout.split('\n')
    if (lines.length > 0) {
      await this.cache.set(email, lines[lines.length - 1])
      return lines[lines.length - 1]
    }
    return ''
  }

  async resetAccount (account: IAccount): Promise<void> {
    if (isAccountWithUserInfo(account)) {
      // Remove all conversation information
      this.conversationsPool.forEach((item, key) => {
        if ((item.account as AccountWithUserInfo)?.email === account.email) {
          this.conversationsPool.delete(key)
        }
      })
      // Relogin and generate a new session token
      const chatGPTItem = this.chatGPTPools
        .filter((item) => isAccountWithUserInfo(item.account))
        .find(
          (
            item: any
          ): item is IChatGPTItem & {
            account: AccountWithUserInfo
            chatGpt: ChatGPTAPI
          } => item.account.email === account.email
        )
      if (chatGPTItem) {
        await this.cache.delete(account.email)
        try {
          const sessionToken = await this.getSessionToken(
            chatGPTItem.account?.email,
            chatGPTItem.account?.password
          )
          chatGPTItem.chatGpt = new ChatGPTAPI({
            sessionToken
          })
        } catch (err: any) {
          // remove this object
          this.chatGPTPools = this.chatGPTPools.filter(
            (item) =>
              (item.account as AccountWithUserInfo)?.email !== account.email
          )
          console.error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Try reset account: ${account.email} failed: ${err}, remove it from pool`
          )
        }
      }
    } else if (isAccountWithSessionToken(account)) {
      // Remove all conversation information
      this.conversationsPool.forEach((item, key) => {
        if (
          (item.account as AccountWithSessionToken)?.sessionToken ===
          account.sessionToken
        ) {
          this.conversationsPool.delete(key)
        }
      })
      // Remove this gptItem
      this.chatGPTPools = this.chatGPTPools.filter(
        (item) =>
          (item.account as AccountWithSessionToken)?.sessionToken !==
          account.sessionToken
      )
    }
  }

  async startPools (): Promise<void> {
    const sessionAccounts = config.chatGPTAccountPool.filter(
      isAccountWithSessionToken
    )
    const userAccounts = await Promise.all(
      config.chatGPTAccountPool
        .filter(isAccountWithUserInfo)
        .map(async (account: AccountWithUserInfo) => {
          const sessionToken = await this.getSessionToken(
            account.email,
            account.password
          )
          return {
            ...account,
            sessionToken
          }
        })
    )
    this.chatGPTPools = [...sessionAccounts, ...userAccounts].map((account) => {
      return {
        chatGpt: new ChatGPTAPI({
          sessionToken: account.sessionToken
        }),
        account
      }
    })
    if (this.chatGPTPools.length === 0) {
      throw new Error('⚠️ No chatgpt account in pool')
    }
    console.log(`ChatGPTPools: ${this.chatGPTPools.length}`)
  }

  // Randome get chatgpt item form pool
  get chatGPTAPI (): IChatGPTItem {
    return this.chatGPTPools[
      Math.floor(Math.random() * this.chatGPTPools.length)
    ]
  }

  // Randome get conversation item form pool
  getConversation (talkid: string): IConversationItem {
    if (this.conversationsPool.has(talkid)) {
      return this.conversationsPool.get(talkid) as IConversationItem
    }
    const chatGPT = this.chatGPTAPI
    if (!chatGPT) {
      throw new Error('⚠️ No chatgpt item in pool')
    }
    const conversation = chatGPT.chatGpt.getConversation()
    const conversationItem = {
      conversation,
      account: chatGPT.account
    }
    this.conversationsPool.set(talkid, conversationItem)
    return conversationItem
  }

  // send message with talkid
  async sendMessage (message: string, talkid: string): Promise<string> {
    const conversationItem = this.getConversation(talkid)
    const { conversation, account } = conversationItem
    try {
      // TODO: Add Retry logic
      const response = await conversation.sendMessage(message)
      return response
    } catch (err: any) {
      if (err.message.includes('ChatGPT failed to refresh auth token')) {
        await this.resetAccount(account)
        return await this.sendMessage(message, talkid)
      }
      console.error(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `err is ${err.message}, account ${JSON.stringify(account)}`
      )
      // If send message failed, we will remove the conversation from pool
      this.conversationsPool.delete(talkid)
      // Retry
      return this.error2msg(err)
    }
  }

  // Make error code to more human readable message.
  error2msg (err: Error): string {
    for (const code in ErrorCode2Message) {
      if (err.message.includes(code)) {
        return ErrorCode2Message[code]
      }
    }
    return ErrorCode2Message.unknown
  }
}
export class ChatGPTBot {
  // Record talkid with conversation id
  conversations = new Map<string, ChatGPTConversation>()
  chatGPTPool = new ChatGPTPoole()
  cache = new Cache('cache.json')
  chatPrivateTiggerKeyword = config.chatPrivateTiggerKeyword
  botName: string = ''
  setBotName (botName: string): void {
    this.botName = botName
  }

  get chatGroupTiggerKeyword (): string {
    return `@${this.botName}`
  }

  async startGPTBot (): Promise<void> {
    console.debug(`Start GPT Bot Config is:${JSON.stringify(config)}`)
    await this.chatGPTPool.startPools()
    console.debug('🤖️ Start GPT Bot Success, ready to handle message!')
  }

  // TODO: Add reset conversation id and ping pong
  async command (): Promise<void> {}
  // remove more times conversation and mention
  cleanMessage (rawText: string, privateChat: boolean = false): string {
    let text = rawText
    const item = rawText.split('- - - - - - - - - - - - - - -')
    if (item.length > 1) {
      text = item[item.length - 1]
    }
    text = text.replace(
      privateChat ? this.chatPrivateTiggerKeyword : this.chatGroupTiggerKeyword,
      ''
    )
    // remove more text via - - - - - - - - - - - - - - -
    return text
  }

  async getGPTMessage (text: string, talkerId: string): Promise<string> {
    return await this.chatGPTPool.sendMessage(text, talkerId)
  }

  // Check whether the ChatGPT processing can be triggered
  tiggerGPTMessage (text: string, privateChat: boolean = false): boolean {
    const chatPrivateTiggerKeyword = this.chatPrivateTiggerKeyword
    let triggered = false
    if (privateChat) {
      triggered = chatPrivateTiggerKeyword
        ? text.includes(chatPrivateTiggerKeyword)
        : true
    } else {
      triggered = text.includes(this.chatGroupTiggerKeyword)
    }
    if (triggered) {
      console.log(`🎯 Triggered ChatGPT: ${text}`)
    }
    return triggered
  }

  async onPrivateMessage (talker: ContactInterface, text: string): Promise<void> {
    const talkerId = talker.id
    const gptMessage = await this.getGPTMessage(text, talkerId)
    await Utils.trySay(talker, gptMessage)
  }

  async onGroupMessage (
    talker: ContactInterface,
    text: string,
    room: RoomInterface
  ): Promise<void> {
    const talkerId = talker.id
    const gptMessage = await this.getGPTMessage(text, talkerId)
    const result = `${text}\n ------\n ${gptMessage}`
    await Utils.trySay(room, result)
  }

  async onMessage (message: Message): Promise<void> {
    const talker = message.talker()
    const rawText = message.text()
    const room = message.room()
    const messageType = message.type()
    const privateChat = !room
    if (Utils.isNonsense(talker, messageType, rawText)) {
      return
    }
    if (this.tiggerGPTMessage(rawText, privateChat)) {
      const text = this.cleanMessage(rawText, privateChat)
      if (privateChat) {
        return await this.onPrivateMessage(talker, text)
      } else {
        return await this.onGroupMessage(talker, text, room)
      }
    }
  }
}
