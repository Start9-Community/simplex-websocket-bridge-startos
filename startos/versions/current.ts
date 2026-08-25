import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '7.0.0:1',
  releaseNotes: {
    en_US: `Fixes self-hosted relays going stale. If using SimpleX Server, interface changes due to a reinstall now update the Websocket Bridge automatically.

**Upgrading from 0.3.0?** Back up this service first. 7.0.0 upgrades the SimpleX database in place and the older version cannot read it, so going back means uninstalling and restoring from backup.`,
    es_ES: `Corrige que los relés autoalojados quedaran obsoletos. Si usas SimpleX Server, los cambios de interfaz provocados por una reinstalación ahora actualizan el Websocket Bridge automáticamente.

**¿Actualizas desde la 0.3.0?** Haz antes una copia de seguridad de este servicio. La 7.0.0 actualiza la base de datos de SimpleX y la versión anterior no puede leerla, así que volver atrás implica desinstalar y restaurar desde la copia de seguridad.`,
    de_DE: `Behebt das Veralten selbst gehosteter Relays. Wenn du SimpleX Server nutzt, aktualisieren Schnittstellenänderungen durch eine Neuinstallation die Websocket Bridge jetzt automatisch.

**Update von 0.3.0?** Sichere diesen Dienst vorher. 7.0.0 aktualisiert die SimpleX-Datenbank, und die ältere Version kann sie nicht lesen — ein Rückschritt bedeutet Deinstallieren und Wiederherstellen aus der Sicherung.`,
    pl_PL: `Naprawia dezaktualizację własnych przekaźników. Jeśli używasz SimpleX Server, zmiany interfejsu spowodowane ponowną instalacją automatycznie aktualizują teraz Websocket Bridge.

**Aktualizujesz z 0.3.0?** Najpierw wykonaj kopię zapasową tej usługi. 7.0.0 aktualizuje bazę danych SimpleX, a starsza wersja nie potrafi jej odczytać, więc powrót oznacza odinstalowanie i przywrócenie z kopii zapasowej.`,
    fr_FR: `Corrige l'obsolescence des relais auto-hébergés. Si vous utilisez SimpleX Server, les changements d'interface dus à une réinstallation mettent désormais à jour le Websocket Bridge automatiquement.

**Vous mettez à jour depuis la 0.3.0 ?** Sauvegardez d'abord ce service. La 7.0.0 met à niveau la base de données SimpleX et la version antérieure ne peut pas la lire : revenir en arrière implique de désinstaller et de restaurer depuis la sauvegarde.`,
  },
  migrations: {
    // `down` is IMPOSSIBLE because the migration to 7.0.0 is one-way.
    // Downgrades to 7.x stay open, adjust if a breaking database migration occurs.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
    other: {
      '>=7.0.0:0 && <8.0.0:0': { down: async ({ effects }) => {} },
    },
  },
})
