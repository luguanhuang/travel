'use client';

import { useEffect, useState } from 'react';

import { useAppContext } from '@/shared/contexts/app';
import { ChatAccess } from '@/shared/types/chat-access';

export function useChatAccess() {
  const { user } = useAppContext();
  const [access, setAccess] = useState<ChatAccess | null>(null);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchAccess() {
      if (!user) {
        setAccess(null);
        setIsLoadingAccess(false);
        return;
      }

      setIsLoadingAccess(true);

      try {
        const resp = await fetch('/api/chat/access', {
          method: 'POST',
        });
        if (!resp.ok) {
          throw new Error(`fetch failed with status: ${resp.status}`);
        }

        const { code, data } = await resp.json();
        if (cancelled) {
          return;
        }

        if (code === 0) {
          setAccess(data as ChatAccess);
        } else {
          setAccess(null);
        }
      } catch (e) {
        if (!cancelled) {
          setAccess(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAccess(false);
        }
      }
    }

    fetchAccess();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    access,
    isLoadingAccess,
  };
}
