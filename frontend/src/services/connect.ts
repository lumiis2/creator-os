import { apiFetch } from './api';

export type ConnectResponse = {
  url: string;
};

export async function getYouTubeConnectUrl(): Promise<string> {
  const result = await apiFetch<ConnectResponse>('/connect/youtube');
  return result.url;
}

export async function getMetaConnectUrl(): Promise<string> {
  const result = await apiFetch<ConnectResponse>('/connect/meta');
  return result.url;
}
