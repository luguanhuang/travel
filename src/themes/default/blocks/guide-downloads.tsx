import Image from 'next/image';
import { ArrowDownToLine, FileText } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

type PdfDownloadItem = {
  id: string;
  name: string;
  downloadUrl?: string;
  remark?: string | null;
  coverImage?: string | null;
};

type GuideCardItem = {
  key: string;
  title: string;
  description: string;
  highlights?: string[];
  match?: string[];
  fallback_image?: string;
};

export function GuideDownloads({
  section,
  downloads = [],
  className,
}: {
  section: Section;
  downloads?: PdfDownloadItem[];
  className?: string;
}) {
  const cards = ((section.items || []) as GuideCardItem[]).map((item) => {
    const download = downloads.find((downloadItem) =>
      item.match?.some((keyword) =>
        downloadItem.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    return {
      ...item,
      downloadUrl: download
        ? `/api/pdf-downloads/${encodeURIComponent(download.id)}/download`
        : undefined,
      coverImage: download?.coverImage || item.fallback_image,
    };
  });

  return (
    <section
      id={section.id || section.name}
      className={cn('bg-background py-20 md:py-28', section.className, className)}
    >
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          {section.sr_only_title && (
            <h1 className="sr-only">{section.sr_only_title}</h1>
          )}
          {section.label && (
            <p className="text-primary mb-4 text-sm font-medium">
              {section.label}
            </p>
          )}
          <h2 className="text-foreground text-3xl font-semibold text-balance md:text-5xl">
            {section.title}
          </h2>
          {section.description && (
            <p className="text-muted-foreground mt-5 text-base leading-7 md:text-lg">
              {section.description}
            </p>
          )}
        </div>

        {cards.length > 0 ? (
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
            {cards.map((item) => (
              <article
                key={item.key}
                className="border-border bg-card flex h-full flex-col overflow-hidden rounded-lg border shadow-xs transition-shadow hover:shadow-md"
              >
                <div className="bg-muted relative aspect-4/3 overflow-hidden">
                  {item.coverImage ? (
                    <Image
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full items-center justify-center">
                      <FileText className="size-12" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-foreground text-xl font-semibold text-balance">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-muted-foreground mt-3 text-sm leading-6">
                      {item.description}
                    </p>
                  )}
                  {item.highlights && item.highlights.length > 0 && (
                    <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                      {item.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-2">
                          <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto pt-6">
                    {item.downloadUrl ? (
                      <Button asChild className="w-full">
                        <Link
                          href={item.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ArrowDownToLine
                            className="size-4"
                            aria-hidden="true"
                          />
                          {section.button_text || 'Download PDF'}
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled className="w-full">
                        <span>{section.unavailable_text || 'Coming soon'}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-border bg-card text-muted-foreground mx-auto mt-12 max-w-xl rounded-lg border p-8 text-center">
            {section.empty_text || 'No PDF guides are available yet.'}
          </div>
        )}
      </div>
    </section>
  );
}
