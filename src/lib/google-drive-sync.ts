import { db } from './db';
import { FolderRecord, NotebookRecord, PageRecord } from '@/types/note';

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
}

export interface DriveSyncState {
  connected: boolean;
  user: GoogleUserProfile | null;
  lastSyncedAt: number | null;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage?: string | null;
}

const DRIVE_FOLDER_NAME = 'Anotações da Vanessa (Backup)';
const DRIVE_METADATA_FILE = 'vanessa-notes-db.json';
const STORAGE_KEY_CLIENT_ID = 'vanessa_google_client_id';
const STORAGE_KEY_LAST_SYNC = 'vanessa_last_drive_sync';
const STORAGE_KEY_USER = 'vanessa_google_user';

let accessTokenMemory: string | null = null;
let tokenExpiresAt = 0;

export function getConfiguredGoogleClientId(): string {
  if (typeof window === 'undefined') return '';
  return (
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    window.localStorage.getItem(STORAGE_KEY_CLIENT_ID) ||
    ''
  ).trim();
}

export function setConfiguredGoogleClientId(clientId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId.trim());
}

export function getSavedGoogleUser(): GoogleUserProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleUserProfile;
  } catch {
    return null;
  }
}

export function getLastSyncedTimestamp(): number | null {
  if (typeof window === 'undefined') return null;
  const val = window.localStorage.getItem(STORAGE_KEY_LAST_SYNC);
  return val ? Number(val) : null;
}

export function disconnectGoogleDrive(): void {
  accessTokenMemory = null;
  tokenExpiresAt = 0;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY_USER);
  }
}

export function hasValidAccessToken(): boolean {
  return Boolean(accessTokenMemory && Date.now() < tokenExpiresAt - 30000);
}

/**
 * Carrega o script oficial Google Identity Services (GIS) dinamicamente
 */
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Navegador indisponível'));
      return;
    }
    const win = window as unknown as { google?: { accounts?: unknown } };
    if (win.google?.accounts) {
      resolve();
      return;
    }
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Falha ao carregar Google Identity Services'));
    document.head.appendChild(script);
  });
}

interface GisTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

/**
 * Solicita autenticação OAuth2 com a conta Google da Vanessa (escopo drive.file + userinfo)
 */
export async function signInWithGoogleDrive(
  promptMode: '' | 'consent' | 'select_account' = 'select_account'
): Promise<GoogleUserProfile> {
  const clientId = getConfiguredGoogleClientId();
  if (!clientId) {
    throw new Error(
      'Configure o Google Client ID primeiro no modal da Conta Google.'
    );
  }

  await loadGisScript();

  const tokenResponse = await new Promise<GisTokenResponse>(
    (resolve, reject) => {
      const win = window as unknown as {
        google: {
          accounts: {
            oauth2: {
              initTokenClient: (cfg: {
                client_id: string;
                scope: string;
                prompt?: string;
                callback: (resp: GisTokenResponse) => void;
                error_callback?: (err: { message?: string }) => void;
              }) => { requestAccessToken: () => void };
            };
          };
        };
      };

      const client = win.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope:
          'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        prompt: promptMode,
        callback: (resp) => {
          if (resp.error || !resp.access_token) {
            reject(new Error(resp.error || 'Acesso negado'));
            return;
          }
          resolve(resp);
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'Falha ao abrir login do Google'));
        },
      });

      client.requestAccessToken();
    }
  );

  accessTokenMemory = tokenResponse.access_token!;
  tokenExpiresAt =
    Date.now() + (Number(tokenResponse.expires_in) || 3600) * 1000;

  // Busca dados do perfil Google (Nome, E-mail e Foto)
  const profileResp = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      headers: { Authorization: `Bearer ${accessTokenMemory}` },
    }
  );
  if (!profileResp.ok) {
    throw new Error('Não foi possível obter perfil da conta Google.');
  }
  const profileData = await profileResp.json();
  const user: GoogleUserProfile = {
    email: profileData.email || '',
    name: profileData.name || 'Vanessa',
    picture: profileData.picture,
  };

  window.localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  return user;
}

async function driveFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!accessTokenMemory) {
    throw new Error('Sessão do Google Drive expirada. Conecte novamente.');
  }
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${accessTokenMemory}`);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    accessTokenMemory = null;
    throw new Error('Sessão expirada. Clique para reconectar ao Google Drive.');
  }
  return response;
}

/**
 * Localiza ou cria a pasta "Anotações da Vanessa (Backup)" no Google Drive
 */
async function ensureDriveBackupFolderId(): Promise<string> {
  const q = encodeURIComponent(
    `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`
  );
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Cria a pasta se não existir
  const createRes = await driveFetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );
  const created = await createRes.json();
  return created.id;
}

/**
 * Lista todos os arquivos atualmente dentro da pasta do Google Drive
 */
async function listFilesInDriveFolder(
  folderId: string
): Promise<{ id: string; name: string; mimeType: string }[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&pageSize=500`
  );
  const data = await res.json();
  return data.files || [];
}

/**
 * Faz upload ou atualização (multipart/related) de um arquivo no Google Drive
 */
async function uploadOrUpdateDriveFile(params: {
  folderId: string;
  existingFileId?: string;
  name: string;
  mimeType: string;
  bodyBytes: Uint8Array | string;
}): Promise<string> {
  const metadata = params.existingFileId
    ? { name: params.name, mimeType: params.mimeType }
    : {
        name: params.name,
        mimeType: params.mimeType,
        parents: [params.folderId],
      };

  const boundary = '-------inkpad_drive_sync_boundary';
  const metaPart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${params.mimeType}\r\n\r\n`;
  const closePart = `\r\n--${boundary}--`;

  const encoder = new TextEncoder();
  const metaBytes = encoder.encode(metaPart);
  const contentBytes =
    typeof params.bodyBytes === 'string'
      ? encoder.encode(params.bodyBytes)
      : params.bodyBytes;
  const closeBytes = encoder.encode(closePart);

  const combined = new Uint8Array(
    metaBytes.length + contentBytes.length + closeBytes.length
  );
  combined.set(metaBytes, 0);
  combined.set(contentBytes, metaBytes.length);
  combined.set(closeBytes, metaBytes.length + contentBytes.length);

  const url = params.existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${params.existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await driveFetch(url, {
    method: params.existingFileId ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: combined,
  });

  if (!res.ok) {
    throw new Error(`Erro ao salvar ${params.name} no Google Drive.`);
  }
  const json = await res.json();
  return json.id;
}

/**
 * Sincroniza (Push) todas as pastas, cadernos, páginas e PDFs locais para o Google Drive da Vanessa
 */
export async function syncLocalToGoogleDrive(): Promise<number> {
  const folderId = await ensureDriveBackupFolderId();
  const existingFiles = await listFilesInDriveFolder(folderId);

  const [folders, notebooks, pages, assets] = await Promise.all([
    db.folders.toArray(),
    db.notebooks.toArray(),
    db.pages.toArray(),
    db.assets.toArray(),
  ]);

  // 1. Envia cada PDF binário apenas se ainda não existir na pasta do Google Drive
  const assetManifest: {
    id: string;
    name: string;
    mimeType: string;
    pageCount?: number;
    createdAt: number;
    driveFileName: string;
  }[] = [];

  for (const asset of assets) {
    const driveFileName = `asset_${asset.id}.pdf`;
    const alreadyOnDrive = existingFiles.find((f) => f.name === driveFileName);
    if (!alreadyOnDrive) {
      await uploadOrUpdateDriveFile({
        folderId,
        name: driveFileName,
        mimeType: asset.mimeType || 'application/pdf',
        bodyBytes: new Uint8Array(asset.data),
      });
    }
    assetManifest.push({
      id: asset.id,
      name: asset.name,
      mimeType: asset.mimeType,
      pageCount: asset.pageCount,
      createdAt: asset.createdAt,
      driveFileName,
    });
  }

  // 2. Salva o JSON consolidado de pastas, cadernos, páginas e índice de PDFs
  const existingMetaFile = existingFiles.find(
    (f) => f.name === DRIVE_METADATA_FILE
  );

  const payload = {
    version: 2,
    syncedAt: Date.now(),
    app: 'Anotações da Vanessa',
    folders,
    notebooks,
    pages,
    assetManifest,
  };

  await uploadOrUpdateDriveFile({
    folderId,
    existingFileId: existingMetaFile?.id,
    name: DRIVE_METADATA_FILE,
    mimeType: 'application/json',
    bodyBytes: JSON.stringify(payload),
  });

  const now = Date.now();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(now));
  }
  return now;
}

/**
 * Baixa e restaura (Pull/Merge) todas as notas e PDFs salvos no Google Drive da Vanessa para o tablet
 */
export async function restoreFromGoogleDrive(): Promise<{
  notebooksCount: number;
  pagesCount: number;
}> {
  const folderId = await ensureDriveBackupFolderId();
  const existingFiles = await listFilesInDriveFolder(folderId);
  const metaFile = existingFiles.find((f) => f.name === DRIVE_METADATA_FILE);

  if (!metaFile) {
    throw new Error(
      'Nenhum backup encontrado na pasta "Anotações da Vanessa (Backup)" do Google Drive.'
    );
  }

  const metaRes = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${metaFile.id}?alt=media`
  );
  if (!metaRes.ok) {
    throw new Error('Falha ao baixar dados do Google Drive.');
  }

  const parsed = (await metaRes.json()) as {
    folders?: FolderRecord[];
    notebooks?: NotebookRecord[];
    pages?: PageRecord[];
    assetManifest?: {
      id: string;
      name: string;
      mimeType: string;
      pageCount?: number;
      createdAt: number;
      driveFileName: string;
    }[];
  };

  // Baixa os PDFs que ainda não estejam no IndexedDB local
  if (Array.isArray(parsed.assetManifest)) {
    for (const item of parsed.assetManifest) {
      const localExists = await db.assets.get(item.id);
      if (!localExists) {
        const drivePdfFile = existingFiles.find(
          (f) => f.name === item.driveFileName
        );
        if (drivePdfFile) {
          const pdfRes = await driveFetch(
            `https://www.googleapis.com/drive/v3/files/${drivePdfFile.id}?alt=media`
          );
          if (pdfRes.ok) {
            const buffer = await pdfRes.arrayBuffer();
            await db.assets.put({
              id: item.id,
              name: item.name,
              mimeType: item.mimeType,
              data: buffer,
              pageCount: item.pageCount,
              createdAt: item.createdAt,
            });
          }
        }
      }
    }
  }

  await db.transaction('rw', db.folders, db.notebooks, db.pages, async () => {
    if (Array.isArray(parsed.folders)) {
      await db.folders.bulkPut(parsed.folders);
    }
    if (Array.isArray(parsed.notebooks)) {
      await db.notebooks.bulkPut(parsed.notebooks);
    }
    if (Array.isArray(parsed.pages)) {
      await db.pages.bulkPut(parsed.pages);
    }
  });

  const now = Date.now();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(now));
  }

  return {
    notebooksCount: parsed.notebooks?.length || 0,
    pagesCount: parsed.pages?.length || 0,
  };
}
