import OpenAI from 'openai';
import type { ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions/completions';
import {
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  UIMessage,
} from 'ai';

import { CHAT_MODEL } from '@/shared/constants/chat';
import { findChatById } from '@/shared/models/chat';
import {
  ChatMessageStatus,
  createChatMessage,
  getChatMessages,
  NewChatMessage,
} from '@/shared/models/chat_message';
import { getUserInfo } from '@/shared/models/user';
import {
  CHAT_SYSTEM_PROMPT,
  getChatAccessErrorMessage,
  getChatAccessForCurrentUser,
} from '@/shared/services/chat-access';

type OpenRouterChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  reasoning_details?: unknown;
};

type OpenRouterStreamingRequest = ChatCompletionCreateParamsStreaming & {
  extra_body?: {
    reasoning?: {
      enabled?: boolean;
    };
  };
};

function getTextFromUIMessage(message: UIMessage) {
  return (
    message.parts
      ?.filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
      .trim() || ''
  );
}

function parseMessageMetadata(raw: string | null | undefined) {
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function toOpenRouterMessages(
  historyMessages: {
    role: string;
    parts: string | null;
    metadata?: string | null;
  }[]
): OpenRouterChatMessage[] {
  const messages: OpenRouterChatMessage[] = [
    {
      role: 'system',
      content: CHAT_SYSTEM_PROMPT,
    },
  ];

  for (const item of historyMessages) {
    if (item.role !== 'user' && item.role !== 'assistant') {
      continue;
    }

    const parts = item.parts ? JSON.parse(item.parts) : [];
    const content = parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('\n')
      .trim();

    if (!content) {
      continue;
    }

    const metadata = parseMessageMetadata(item.metadata);

    if (
      item.role === 'assistant' &&
      metadata &&
      typeof metadata === 'object' &&
      'reasoning_details' in metadata
    ) {
      messages.push({
        role: 'assistant',
        content,
        reasoning_details: (metadata as Record<string, unknown>)
          .reasoning_details,
      });
      continue;
    }

    messages.push({
      role: item.role,
      content,
    });
  }

  return messages;
}

function extractReasoningDelta(delta: Record<string, any>) {
  const candidates = [
    delta.reasoning,
    delta.reasoning_content,
    delta.reasoning_text,
    delta.reasoning_details,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) {
      return candidate;
    }

    if (Array.isArray(candidate)) {
      const text = candidate
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          if (item && typeof item === 'object') {
            return (
              item.text ??
              item.content ??
              item.reasoning ??
              item.summary ??
              ''
            );
          }
          return '';
        })
        .join('');

      if (text) {
        return text;
      }
    }

    if (candidate && typeof candidate === 'object') {
      const text =
        candidate.text ??
        candidate.content ??
        candidate.reasoning ??
        candidate.summary;
      if (typeof text === 'string' && text) {
        return text;
      }
    }
  }

  return '';
}

export async function POST(req: Request) {
  try {
    const {
      chatId,
      message,
      reasoning,
    }: {
      chatId: string;
      message: UIMessage;
      model?: string;
      webSearch?: boolean;
      reasoning?: boolean;
    } = await req.json();

    if (!chatId) {
      throw new Error('invalid params');
    }

    if (!message || !message.parts || message.parts.length === 0) {
      throw new Error('invalid message');
    }

    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    const access = await getChatAccessForCurrentUser();
    if (!access?.canChat) {
      throw new Error(getChatAccessErrorMessage(access));
    }

    const chat = await findChatById(chatId);
    if (!chat) {
      throw new Error('chat not found');
    }

    if (chat.userId !== user.id) {
      throw new Error('no permission to access this chat');
    }

    const openRouterApiKey = process.env.OPEN_ROUTER_API_KEY;
    if (!openRouterApiKey) {
      throw new Error('OPEN_ROUTER_API_KEY is not set');
    }

    const textContent = getTextFromUIMessage(message);
    if (!textContent) {
      throw new Error('message text is required');
    }

    const currentTime = new Date();
    const metadata = {
      model: CHAT_MODEL,
      reasoning: Boolean(reasoning),
    };

    const userMessage: NewChatMessage = {
      id: generateId().toLowerCase(),
      chatId,
      userId: user.id,
      status: ChatMessageStatus.CREATED,
      createdAt: currentTime,
      updatedAt: currentTime,
      role: 'user',
      parts: JSON.stringify(message.parts),
      metadata: JSON.stringify(metadata),
      model: CHAT_MODEL,
      provider: 'openrouter',
    };
    await createChatMessage(userMessage);

    const previousMessages = await getChatMessages({
      chatId,
      status: ChatMessageStatus.CREATED,
      page: 1,
      limit: 50,
    });

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openRouterApiKey,
    });

    const requestMessages = toOpenRouterMessages(previousMessages);
    const stream = createUIMessageStream({
      generateId: createIdGenerator({
        size: 16,
      }),
      execute: async ({ writer }) => {
        const textId = generateId().toLowerCase();
        const reasoningId = generateId().toLowerCase();
        let hasStartedText = false;
        let hasStartedReasoning = false;
        let assistantText = '';
        let assistantReasoning = '';
        let finalReasoningDetails: unknown;

        writer.write({
          type: 'start',
        });

        const requestBody: OpenRouterStreamingRequest = {
          model: CHAT_MODEL,
          stream: true,
          messages: requestMessages,
          extra_body: {
            reasoning: {
              enabled: Boolean(reasoning),
            },
          },
        };

        const completion = (await openrouter.chat.completions.create(
          requestBody as any
        )) as unknown as AsyncIterable<any>;

        for await (const chunk of completion) {
          const choice = chunk.choices?.[0];
          const delta = (choice?.delta ?? {}) as Record<string, any>;

          const reasoningDelta = extractReasoningDelta(delta);
          if (reasoningDelta) {
            if (!hasStartedReasoning) {
              hasStartedReasoning = true;
              writer.write({
                type: 'reasoning-start',
                id: reasoningId,
              });
            }

            assistantReasoning += reasoningDelta;
            writer.write({
              type: 'reasoning-delta',
              id: reasoningId,
              delta: reasoningDelta,
            });
          }

          if (typeof delta.content === 'string' && delta.content) {
            if (!hasStartedText) {
              hasStartedText = true;
              writer.write({
                type: 'text-start',
                id: textId,
              });
            }

            assistantText += delta.content;
            writer.write({
              type: 'text-delta',
              id: textId,
              delta: delta.content,
            });
          }

          if ('reasoning_details' in delta && delta.reasoning_details) {
            finalReasoningDetails = delta.reasoning_details;
          }
        }

        if (hasStartedReasoning) {
          writer.write({
            type: 'reasoning-end',
            id: reasoningId,
          });
        }

        if (hasStartedText) {
          writer.write({
            type: 'text-end',
            id: textId,
          });
        }

        writer.write({
          type: 'finish',
        });

        if (assistantText.trim()) {
          const assistantMessage: NewChatMessage = {
            id: generateId().toLowerCase(),
            chatId,
            userId: user.id,
            status: ChatMessageStatus.CREATED,
            createdAt: new Date(),
            updatedAt: new Date(),
            model: CHAT_MODEL,
            provider: 'openrouter',
            parts: JSON.stringify([
              ...(assistantReasoning
                ? [
                    {
                      type: 'reasoning',
                      text: assistantReasoning,
                    },
                  ]
                : []),
              {
                type: 'text',
                text: assistantText,
              },
            ]),
            metadata: JSON.stringify({
              reasoning_details: finalReasoningDetails,
            }),
            role: 'assistant',
          };
          await createChatMessage(assistantMessage);
        }
      },
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : 'request failed, please try again';
        return message;
      },
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (e: any) {
    console.log('chat failed:', e);
    return new Response(e.message, { status: 500 });
  }
}
