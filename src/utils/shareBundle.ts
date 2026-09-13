import { Project, PlanningSession, Card, Role } from '../types';

export interface ShareWorkshopBundle {
  v: 1;
  p: Project;
  s: PlanningSession;
  c: Card[];
  r: Role;
  by: string;
  ts: string;
}

export async function createShareHash(
  project: Project,
  session: PlanningSession,
  cards: Card[],
  role: Role = 'contributor',
  invitedBy: string = 'Facilitator'
): Promise<string> {
  const payload: ShareWorkshopBundle = {
    v: 1,
    p: project,
    s: session,
    c: cards,
    r: role,
    by: invitedBy,
    ts: new Date().toISOString(),
  };

  const json = JSON.stringify(payload);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
      const compressedBlob = await new Response(stream).blob();
      const buffer = await compressedBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return 'gz.' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      console.warn('CompressionStream failed, falling back to base64 encoding:', e);
    }
  }

  return 'b64.' + btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function parseShareHash(hashOrParam: string): Promise<ShareWorkshopBundle | null> {
  try {
    let clean = hashOrParam.trim();
    if (clean.startsWith('#')) clean = clean.substring(1);
    if (clean.startsWith('workshop=')) clean = clean.substring(9);
    if (clean.startsWith('pkg=')) clean = clean.substring(4);

    if (clean.startsWith('gz.')) {
      const rawBase64 = clean.substring(3).replace(/-/g, '+').replace(/_/g, '/');
      let padded = rawBase64;
      while (padded.length % 4) padded += '=';

      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      if (typeof DecompressionStream !== 'undefined') {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        const decompressedBlob = await new Response(stream).blob();
        const text = await decompressedBlob.text();
        return JSON.parse(text) as ShareWorkshopBundle;
      }
    }

    if (clean.startsWith('b64.')) {
      const rawBase64 = clean.substring(4).replace(/-/g, '+').replace(/_/g, '/');
      let padded = rawBase64;
      while (padded.length % 4) padded += '=';
      const text = decodeURIComponent(escape(atob(padded)));
      return JSON.parse(text) as ShareWorkshopBundle;
    }

    const rawBase64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    let padded = rawBase64;
    while (padded.length % 4) padded += '=';
    const text = decodeURIComponent(escape(atob(padded)));
    return JSON.parse(text) as ShareWorkshopBundle;
  } catch (err) {
    console.warn('Failed to parse share bundle:', err);
    return null;
  }
}
