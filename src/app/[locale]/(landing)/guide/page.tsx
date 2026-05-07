import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';
import { getPdfDownloads } from '@/shared/models/pdf-download';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 60;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.guide.metadata',
  canonicalUrl: '/guide',
});

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, pdfDownloads] = await Promise.all([
    getTranslations('pages.guide'),
    getPdfDownloads(),
  ]);

  const page: DynamicPage = {
    title: t.raw('page.title'),
    sections: {
      guideDownloads: {
        ...t.raw('page.sections.guideDownloads'),
      },
    },
  };

  const Page = await getThemePage('dynamic-page');

  return (
    <Page
      locale={locale}
      page={page}
      data={{
        downloads: pdfDownloads.map((item) => ({
          id: item.id,
          name: item.name,
          remark: item.remark,
          coverImage: item.coverImage,
        })),
      }}
    />
  );
}
