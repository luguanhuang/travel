'use client';

import { useState } from 'react';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import { BrainCircuitIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from '@/shared/components/ai-elements/prompt-input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { CHAT_MODEL } from '@/shared/constants/chat';
import { ChatAccess } from '@/shared/types/chat-access';

function getAccessBanner(
  access: ChatAccess | null | undefined,
  t: ReturnType<typeof useTranslations>
) {
  if (!access || access.canChat) {
    return null;
  }

  if (access.state === 'upgrade_required') {
    return {
      title: t('access.upgrade_title'),
      description: t('access.upgrade_description'),
      tone: 'amber',
    };
  }

  return {
    title: t('access.purchase_title'),
    description: t('access.purchase_description'),
    tone: 'rose',
  };
}

export function ChatInput({
  handleSubmit,
  status,
  error,
  onInputChange,
  access,
}: {
  handleSubmit: (
    message: PromptInputMessage,
    body: Record<string, any>
  ) => void | Promise<void>;
  status?: UseChatHelpers<UIMessage>['status'];
  error?: string | null;
  onInputChange?: (value: string) => void;
  access?: ChatAccess | null;
}) {
  const t = useTranslations('ai.chat.generator');
  const [input, setInput] = useState('');
  const [reasoning, setReasoning] = useState(false);
  const isLocked = access ? !access.canChat : false;
  const banner = getAccessBanner(access, t);
  const inputPlaceholder = isLocked
    ? access?.state === 'upgrade_required'
      ? t('access.upgrade_description')
      : t('access.purchase_description')
    : t('input_placeholder');

  return (
    <div className="w-full">
      {banner ? (
        <div
          className={
            banner.tone === 'amber'
              ? 'mb-4 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-950'
              : 'mb-4 rounded-2xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-rose-950'
          }
        >
          <p className="text-sm font-semibold">{banner.title}</p>
          <p className="mt-1 text-sm opacity-90">{banner.description}</p>
        </div>
      ) : null}
      <PromptInput
        onSubmit={async (message) => {
          try {
            handleSubmit(message, { model: CHAT_MODEL, reasoning });
            setInput('');
          } catch (err) {
            // Allow parent to control error display/state. Do not clear input.
          }
        }}
        className="mt-4"
        globalDrop
        multiple
      >
        <PromptInputBody>
          <PromptInputTextarea
            className="overflow-hidden p-4 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder={inputPlaceholder}
            disabled={isLocked || status === 'submitted'}
            onChange={(e) => {
              const value = e.target.value;
              setInput(value);
              onInputChange?.(value);
            }}
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <div className="flex items-center">
              <Switch
                id="prompt-reasoning-switch"
                checked={reasoning}
                onCheckedChange={setReasoning}
                disabled={isLocked || status === 'submitted'}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label
                    htmlFor="prompt-reasoning-switch"
                  className="text-muted-foreground hover:text-foreground peer-data-[state=checked]:text-primary inline-flex cursor-pointer items-center rounded-md p-2 transition-colors"
                >
                  <BrainCircuitIcon size={16} />
                </Label>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>Reasoning</TooltipContent>
              </Tooltip>
            </div>
            <div className="text-muted-foreground rounded-full border px-3 py-1 text-xs font-medium">
              Qwen 3.6 35B
            </div>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={isLocked || !input || status === 'submitted'}
            status={status}
          />
        </PromptInputFooter>
      </PromptInput>
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
