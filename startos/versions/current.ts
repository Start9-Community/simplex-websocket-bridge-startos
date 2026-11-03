import { VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '7.0.2:3',
  releaseNotes: {
    en_US: `Services on this server, such as OpenClaw, can connect to the bridge again on StartOS 0.4.1. Update those services too once they support it.`,
    es_ES: `Los servicios de este servidor, como OpenClaw, vuelven a poder conectarse al puente en StartOS 0.4.1. Actualice también esos servicios cuando lo admitan.`,
    de_DE: `Dienste auf diesem Server wie OpenClaw können sich unter StartOS 0.4.1 wieder mit der Bridge verbinden. Aktualisieren Sie auch diese Dienste, sobald sie es unterstützen.`,
    pl_PL: `Usługi na tym serwerze, takie jak OpenClaw, znów mogą łączyć się z mostem w StartOS 0.4.1. Zaktualizuj również te usługi, gdy zaczną to obsługiwać.`,
    fr_FR: `Les services de ce serveur, comme OpenClaw, peuvent de nouveau se connecter au pont sous StartOS 0.4.1. Mettez aussi ces services à jour dès qu’ils le prennent en charge.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async () => {},
  },
})
