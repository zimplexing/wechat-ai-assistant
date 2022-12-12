
import { Message } from 'wechaty'
import { ContactInterface, RoomInterface } from 'wechaty/impls'
const SINGLE_MESSAGE_MAX_SIZE = 500

enum MessageType {
  Unknown = 0,

  Attachment = 1, // Attach(6),
  Audio = 2, // Audio(1), Voice(34)
  Contact = 3, // ShareCard(42)
  ChatHistory = 4, // ChatHistory(19)
  Emoticon = 5, // Sticker: Emoticon(15), Emoticon(47)
  Image = 6, // Img(2), Image(3)
  Text = 7, // Text(1)
  Location = 8, // Location(48)
  MiniProgram = 9, // MiniProgram(33)
  GroupNote = 10, // GroupNote(53)
  Transfer = 11, // Transfers(2000)
  RedEnvelope = 12, // RedEnvelopes(2001)
  Recalled = 13, // Recalled(10002)
  Url = 14, // Url(5)
  Video = 15, // Video(4), Video(43)
  Post = 16, // Moment, Channel, Tweet, etc
}

export default class Utils {
  // The message is segmented according to its size
  static async trySay (
    talker: RoomInterface | ContactInterface,
    msg: string
  ): Promise<void> {
    const messages: string[] = []
    let message = msg
    while (message.length > SINGLE_MESSAGE_MAX_SIZE) {
      messages.push(message.slice(0, SINGLE_MESSAGE_MAX_SIZE))
      message = message.slice(SINGLE_MESSAGE_MAX_SIZE)
    }
    messages.push(message)
    for (const msg of messages) {
      await talker.say(msg)
    }
  }

  static // Filter out the message that does not need to be processed
  isNonsense (
    talker: ContactInterface,
    messageType: MessageType,
    text: string
  ): boolean {
    return (
      talker.self() ||
      messageType > MessageType.GroupNote ||
      talker.name() === '微信团队' ||
      // 语音(视频)消息
      text.includes('收到一条视频/语音聊天消息，请在手机上查看') ||
      // 红包消息
      text.includes('收到红包，请在手机上查看') ||
      // 位置消息
      text.includes('/cgi-bin/mmwebwx-bin/webwxgetpubliclinkimg')
    )
  }

  static getRealText (message: Message, userName: string): string {
    const room = message.room()
    const realTextRegexp = (room != null) ? new RegExp(`@${userName}\\s(.*)`) : /.*/
    const realTextGroup = message.text().match(realTextRegexp)
    const realText = !(room == null) && (realTextGroup != null) ? realTextGroup[1] : message.text()
    return realText
  }
}
