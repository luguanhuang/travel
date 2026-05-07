import { envConfigs } from '@/config';
import { PdfDownload } from '@/shared/models/pdf-download';

type SupabasePdfDownloadRow = {
  id: string;
  name: string;
  download_url: string;
  remark: string | null;
  cover_image: string | null;
  created_at?: string;
  updated_at?: string;
};

function getSupabaseServiceConfig() {
  const url = envConfigs.supabase_url;
  const serviceRoleKey = envConfigs.supabase_service_role_key;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ''),
    serviceRoleKey,
  };
}

async function supabaseServiceFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const config = getSupabaseServiceConfig();

  if (!config) {
    throw new Error('Supabase service role is not configured');
  }

  const response = await fetch(`${config.url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Supabase service request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function mapPdfDownload(row: SupabasePdfDownloadRow): PdfDownload {
  return {
    id: row.id,
    name: row.name,
    downloadUrl: row.download_url,
    remark: row.remark,
    coverImage: row.cover_image,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

export async function hasPaidOrderByServiceRole(userId: string) {
  if (!userId) {
    return false;
  }

  const rows = await supabaseServiceFetch<{ id: string }[]>(
    `/order?select=id&user_id=eq.${encodeURIComponent(
      userId
    )}&status=eq.paid&limit=1`
  );

  return rows.length > 0;
}

export async function findPdfDownloadByServiceRole(id: string) {
  if (!id) {
    return null;
  }

  const rows = await supabaseServiceFetch<SupabasePdfDownloadRow[]>(
    `/pdf_download?select=id,name,download_url,remark,cover_image,created_at,updated_at&id=eq.${encodeURIComponent(
      id
    )}&limit=1`
  );

  return rows[0] ? mapPdfDownload(rows[0]) : null;
}

export async function getAuthorizedPdfDownload({
  userId,
  pdfDownloadId,
}: {
  userId: string;
  pdfDownloadId: string;
}) {
  const paidOrders = await hasPaidOrderByServiceRole(userId);
  if (!paidOrders) {
    return null;
  }

  return findPdfDownloadByServiceRole(pdfDownloadId);
}
