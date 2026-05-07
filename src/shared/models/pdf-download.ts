import { desc, eq } from 'drizzle-orm';

import { pdfDownload } from '@/config/db/schema';
import { db } from '@/core/db';

export type PdfDownload = typeof pdfDownload.$inferSelect;

export async function getPdfDownloads(): Promise<PdfDownload[]> {
  try {
    return await db()
      .select()
      .from(pdfDownload)
      .orderBy(desc(pdfDownload.createdAt));
  } catch (error) {
    console.log('get pdf downloads failed:', error);
    return [];
  }
}

export async function findPdfDownloadById(
  id: string
): Promise<PdfDownload | null> {
  if (!id) {
    return null;
  }

  try {
    const [result] = await db()
      .select()
      .from(pdfDownload)
      .where(eq(pdfDownload.id, id))
      .limit(1);

    return result || null;
  } catch (error) {
    console.log('find pdf download failed:', error);
    return null;
  }
}
