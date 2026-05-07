import { NextResponse } from 'next/server';

import { getUserInfo } from '@/shared/models/user';
import { getAuthorizedPdfDownload } from '@/shared/services/pdf-download';

function getLocalizedPath(reqUrl: string, path: string) {
  const url = new URL(reqUrl);
  const locale = url.pathname.split('/').filter(Boolean)[0];

  if (locale === 'zh') {
    return `/zh${path}`;
  }

  return path;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getUserInfo();
  if (!user?.id) {
    const guidePath = getLocalizedPath(_req.url, '/guide');
    const signInUrl = new URL(getLocalizedPath(_req.url, '/sign-in'), _req.url);
    signInUrl.searchParams.set('callbackUrl', guidePath);

    return NextResponse.redirect(signInUrl);
  }

  let pdfDownload = null;
  try {
    pdfDownload = await getAuthorizedPdfDownload({
      userId: user.id,
      pdfDownloadId: id,
    });
  } catch (error) {
    console.error('authorize pdf download failed:', error);
    return new NextResponse('Download authorization is not configured', {
      status: 503,
    });
  }

  if (!pdfDownload?.downloadUrl) {
    return NextResponse.redirect(
      new URL(getLocalizedPath(_req.url, '/pricing'), _req.url)
    );
  }

  return NextResponse.redirect(pdfDownload.downloadUrl);
}
