"use client";

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

type GuideDownloadNoticeMessages = {
  purchaseRequired?: string;
};

export function GuideDownloadNotice({
  messages,
}: {
  messages?: GuideDownloadNoticeMessages;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shownRef = useRef(false);

  useEffect(() => {
    const status = searchParams.get('download');

    if (status !== 'purchase-required' || shownRef.current) {
      return;
    }

    shownRef.current = true;
    toast.error(
      messages?.purchaseRequired || 'Purchase is required before downloading.'
    );

    const params = new URLSearchParams(searchParams.toString());
    params.delete('download');
    const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [messages?.purchaseRequired, pathname, router, searchParams]);

  return null;
}
