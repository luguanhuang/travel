import { respData, respErr } from '@/shared/lib/resp';
import { getPdfDownloads } from '@/shared/models/pdf-download';

export async function GET() {
  try {
    const pdfDownloads = await getPdfDownloads();

    return respData(
      pdfDownloads.map((item) => ({
        id: item.id,
        name: item.name,
        remark: item.remark,
        coverImage: item.coverImage,
        downloadUrl: `/api/pdf-downloads/${encodeURIComponent(item.id)}/download`,
      }))
    );
  } catch (error: any) {
    console.log('get pdf downloads failed:', error);
    return respErr(`get pdf downloads failed: ${error.message}`);
  }
}
