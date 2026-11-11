// O que este servidor oferece. Chega de /api/config junto com o catálogo, antes de renderizar.
export interface ServerConfig {
  /** Reprodução no navegador (precisa de ffmpeg no servidor; desligada na hospedagem). */
  webPlayback: boolean
  apk: { available: boolean; version: string | null; sizeMB: number | null; url: string; shortUrl: string }
}

export let serverConfig: ServerConfig = {
  webPlayback: false,
  apk: { available: false, version: null, sizeMB: null, url: '/download/PixelTV.apk', shortUrl: '' },
}

export function setServerConfig(c: Partial<ServerConfig>) {
  serverConfig = { ...serverConfig, ...c, apk: { ...serverConfig.apk, ...c.apk } }
}
