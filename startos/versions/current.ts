import { access, copyFile, unlink } from 'node:fs/promises'
import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const legacyStore = sdk.volumes.main.subpath('store.json')
const privateStore = sdk.volumes.startos.subpath('store.json')

async function moveApiKeys(from: string, to: string): Promise<void> {
  try {
    await access(from)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  await copyFile(from, to)
  await unlink(from)
}

export const current = VersionInfo.of({
  version: '7.0.2:1',
  releaseNotes: {
    en_US: `Improves API credential security.

- API keys are generated in separate Create and Revoke actions, and each token is shown only when created.
- API keys are stored outside the upstream container and remain included in backup and restore.

**Since 0.3.0:** SimpleX Chat is updated to 7.0.2, bringing SimpleX public names, improved channels, profile descriptions, and upstream build fixes. This package now tracks the bundled SimpleX Chat version — it is the same package, renumbered so the version tells you which client it runs. Back up this service before updating: 7.0.0 upgrades the SimpleX database in place and the older version cannot read it, so going back means uninstalling and restoring from backup.

[Full SimpleX Chat release notes](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.2)`,
    es_ES: `Mejora la seguridad de las credenciales de la API.

- Las claves de API se generan mediante acciones separadas para crear y revocar, y cada token se muestra solo al crearlo.
- Las claves de API se almacenan fuera del contenedor de la aplicación y siguen incluidas en las copias de seguridad y la restauración.

**Desde la 0.3.0:** SimpleX Chat se actualiza a la 7.0.2, con los nombres públicos de SimpleX, canales mejorados, descripciones de perfil y correcciones de compilación. Este paquete ahora sigue la versión de SimpleX Chat que incluye: es el mismo paquete, renumerado para que la versión indique qué cliente ejecuta. Haz una copia de seguridad de este servicio antes de actualizar: la 7.0.0 actualiza la base de datos de SimpleX y la versión anterior no puede leerla, así que volver atrás implica desinstalar y restaurar desde la copia de seguridad.

[Notas completas de SimpleX Chat](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.2)`,
    de_DE: `Verbessert die Sicherheit der API-Zugangsdaten.

- API-Schlüssel werden über getrennte Aktionen zum Erstellen und Widerrufen erzeugt; jedes Token wird nur beim Erstellen angezeigt.
- API-Schlüssel werden außerhalb des Anwendungscontainers gespeichert und bleiben in Sicherung und Wiederherstellung enthalten.

**Seit 0.3.0:** SimpleX Chat wird auf 7.0.2 aktualisiert, mit öffentlichen SimpleX-Namen, verbesserten Kanälen, Profilbeschreibungen und Upstream-Build-Fixes. Dieses Paket folgt jetzt der Version des enthaltenen SimpleX Chat — es ist dasselbe Paket, neu nummeriert, damit die Version zeigt, welchen Client es ausführt. Sichere diesen Dienst vor dem Update: 7.0.0 aktualisiert die SimpleX-Datenbank, und die ältere Version kann sie nicht lesen — ein Rückschritt bedeutet Deinstallieren und Wiederherstellen aus der Sicherung.

[Vollständige SimpleX-Chat-Release-Notes](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.2)`,
    pl_PL: `Poprawia bezpieczeństwo danych dostępowych API.

- Klucze API są generowane w oddzielnych akcjach tworzenia i unieważniania, a każdy token jest wyświetlany tylko podczas tworzenia.
- Klucze API są przechowywane poza kontenerem aplikacji i nadal są uwzględniane w kopii zapasowej i przywracaniu.

**Od wersji 0.3.0:** SimpleX Chat zostaje zaktualizowany do 7.0.2, z publicznymi nazwami SimpleX, ulepszonymi kanałami, opisami profilu i poprawkami kompilacji. Ten pakiet śledzi teraz wersję dołączonego SimpleX Chat — to ten sam pakiet, przenumerowany tak, aby wersja wskazywała, którego klienta uruchamia. Wykonaj kopię zapasową tej usługi przed aktualizacją: 7.0.0 aktualizuje bazę danych SimpleX, a starsza wersja nie potrafi jej odczytać, więc powrót oznacza odinstalowanie i przywrócenie z kopii zapasowej.

[Pełne informacje o wydaniu SimpleX Chat](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.2)`,
    fr_FR: `Améliore la sécurité des identifiants d’API.

- Les clés d’API sont générées par des actions distinctes de création et de révocation, et chaque jeton n’est affiché qu’à sa création.
- Les clés d’API sont stockées hors du conteneur de l’application et restent incluses dans la sauvegarde et la restauration.

**Depuis la 0.3.0 :** SimpleX Chat passe à la 7.0.2, avec les noms publics SimpleX, des canaux améliorés, les descriptions de profil et des correctifs de compilation. Ce paquet suit désormais la version de SimpleX Chat qu’il embarque — c’est le même paquet, renuméroté pour que la version indique quel client il exécute. Sauvegardez ce service avant la mise à jour : la 7.0.0 met à niveau la base de données SimpleX et la version antérieure ne peut pas la lire, donc revenir en arrière implique de désinstaller et de restaurer depuis la sauvegarde.

[Notes de version complètes de SimpleX Chat](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.2)`,
  },
  migrations: {
    up: async () => moveApiKeys(legacyStore, privateStore),
    down: IMPOSSIBLE,
    other: {
      '=7.0.2:0': {
        down: async () => moveApiKeys(privateStore, legacyStore),
      },
      '=7.0.0:0': {
        down: async () => moveApiKeys(privateStore, legacyStore),
      },
      '=7.0.0:1': {
        down: async () => moveApiKeys(privateStore, legacyStore),
      },
      '=7.0.0:2': {
        down: async () => moveApiKeys(privateStore, legacyStore),
      },
    },
  },
})
