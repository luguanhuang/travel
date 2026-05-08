'use client';

import { useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';

import { useChatContext } from '@/shared/contexts/chat';
import { useChatAccess } from '@/shared/hooks/use-chat-access';
import { Chat } from '@/shared/types/chat';

import { FollowUp } from './follow-up';
import { ChatHeader } from './header';
import { ChatMessages } from './messages';

export function ChatBox({
  initialChat,
  initialMessages,
}: {
  initialChat?: Chat;
  initialMessages?: UIMessage[];
}) {
  const { chat, setChat } = useChatContext();
  const { access } = useChatAccess();

  // create chat instance
  const chatInstance = useChat({
    id: initialChat?.id,
    messages: initialMessages,

    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ messages, id, body }) {
        const extraBody = body ?? {};
        return {
          body: {
            chatId: id,
            message: messages[messages.length - 1],
            ...extraBody,
          },
        };
      },
    }),
  });

  useEffect(() => {
    if (initialChat) {
      setChat(initialChat);
    }
  }, [initialChat]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-4 py-6 md:max-w-3xl">
          {access && !access.canChat ? (
            <div
              className={
                access.state === 'upgrade_required'
                  ? 'mb-4 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950'
                  : 'mb-4 rounded-2xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-950'
              }
            >
              {access.message}
            </div>
          ) : null}
          <ChatMessages chatInstance={chatInstance} />
        </div>
      </div>
      <div className="mx-auto w-full px-4 pb-4 md:max-w-3xl">
        <FollowUp chatInstance={chatInstance} />
      </div>
    </div>
  );
}
