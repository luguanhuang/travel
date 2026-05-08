import { generateId } from 'ai';

import { CHAT_MODEL } from '@/shared/constants/chat';
import { respData, respErr } from '@/shared/lib/resp';
import { ChatStatus, createChat, NewChat } from '@/shared/models/chat';
import { getUserInfo } from '@/shared/models/user';
import {
  getChatAccessErrorMessage,
  getChatAccessForCurrentUser,
} from '@/shared/services/chat-access';

export async function POST(req: Request) {
  try {
    const { message, body } = await req.json();
    if (!message || !message.text) {
      throw new Error('message is required');
    }

    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    const access = await getChatAccessForCurrentUser();
    if (!access?.canChat) {
      throw new Error(getChatAccessErrorMessage(access));
    }

    // todo: get provider from settings
    const provider = 'openrouter';

    // todo: auto generate title
    const title = message.text.substring(0, 100);

    const chatId = generateId().toLowerCase();
    const currentTime = new Date();

    const parts = [
      {
        type: 'text',
        text: message.text,
      },
    ];

    const chat: NewChat = {
      id: chatId,
      userId: user.id,
      status: ChatStatus.CREATED,
      createdAt: currentTime,
      updatedAt: currentTime,
      model: CHAT_MODEL,
      provider: provider,
      title: title,
      parts: '',
      // parts: JSON.stringify(parts),
      metadata: JSON.stringify({
        ...body,
        model: CHAT_MODEL,
      }),
      content: JSON.stringify(message),
    };

    await createChat(chat);

    return respData(chat);
  } catch (e: any) {
    console.log('new chat failed:', e);
    return respErr(`new chat failed: ${e.message}`);
  }
}
