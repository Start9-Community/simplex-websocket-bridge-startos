import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '7.0.0:2',
  releaseNotes: {
    en_US: `Fixes a crash loop after reinstalling SimpleX Server when your own application manages the profile. Changing message relays now applies without restarting the service, and a bridge whose self-hosted relays are unreachable reports unhealthy instead of quietly using SimpleX's public relays.

Also fixes self-hosted relays going stale. If you use SimpleX Server, reinstalling it now updates the Websocket Bridge automatically.

**Since 0.3.0:** SimpleX Chat is updated to 7.0.0, bringing SimpleX public names, improved channels, and profile descriptions. This package now tracks the bundled SimpleX Chat version — it is the same package, renumbered so the version tells you which client it runs. Back up this service before updating: 7.0.0 upgrades the SimpleX database in place and the older version cannot read it, so going back means uninstalling and restoring from backup.

[Full SimpleX Chat release notes](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.0)`,
    es_ES: `Corrige un ciclo de fallos tras reinstalar SimpleX Server cuando tu propia aplicación gestiona el perfil. Cambiar los relés de mensajes ya no reinicia el servicio, y un puente cuyos relés autoalojados no son accesibles se marca como no saludable en lugar de usar en silencio los relés públicos de SimpleX.

También corrige que los relés autoalojados quedaran obsoletos. Si usas SimpleX Server, reinstalarlo ahora actualiza el Websocket Bridge automáticamente.

**Desde la 0.3.0:** SimpleX Chat se actualiza a la 7.0.0, con los nombres públicos de SimpleX, canales mejorados y descripciones de perfil. Este paquete ahora sigue la versión de SimpleX Chat que incluye: es el mismo paquete, renumerado para que la versión indique qué cliente ejecuta. Haz una copia de seguridad de este servicio antes de actualizar: la 7.0.0 actualiza la base de datos de SimpleX y la versión anterior no puede leerla, así que volver atrás implica desinstalar y restaurar desde la copia de seguridad.

[Notas completas de SimpleX Chat](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.0)`,
    de_DE: `Behebt eine Neustartschleife nach einer Neuinstallation von SimpleX Server, wenn deine eigene Anwendung das Profil verwaltet. Das Ändern der Nachrichten-Relays startet den Dienst nicht mehr neu, und eine Bridge, deren selbst gehostete Relays nicht erreichbar sind, meldet sich als fehlerhaft, statt stillschweigend die öffentlichen SimpleX-Relays zu verwenden.

Behebt außerdem das Veralten selbst gehosteter Relays. Wenn du SimpleX Server nutzt, aktualisiert eine Neuinstallation die Websocket Bridge jetzt automatisch.

**Seit 0.3.0:** SimpleX Chat wird auf 7.0.0 aktualisiert, mit öffentlichen SimpleX-Namen, verbesserten Kanälen und Profilbeschreibungen. Dieses Paket folgt jetzt der Version des enthaltenen SimpleX Chat — es ist dasselbe Paket, neu nummeriert, damit die Version zeigt, welchen Client es ausführt. Sichere diesen Dienst vor dem Update: 7.0.0 aktualisiert die SimpleX-Datenbank, und die ältere Version kann sie nicht lesen — ein Rückschritt bedeutet Deinstallieren und Wiederherstellen aus der Sicherung.

[Vollständige SimpleX-Chat-Release-Notes](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.0)`,
    pl_PL: `Naprawia pętlę awarii po ponownej instalacji SimpleX Server, gdy profilem zarządza Twoja własna aplikacja. Zmiana przekaźników wiadomości nie restartuje już usługi, a mostek, którego własne przekaźniki są nieosiągalne, zgłasza się jako niesprawny zamiast po cichu korzystać z publicznych przekaźników SimpleX.

Naprawia również dezaktualizację własnych przekaźników. Jeśli używasz SimpleX Server, ponowna instalacja automatycznie aktualizuje teraz Websocket Bridge.

**Od wersji 0.3.0:** SimpleX Chat zostaje zaktualizowany do 7.0.0, z publicznymi nazwami SimpleX, ulepszonymi kanałami i opisami profilu. Ten pakiet śledzi teraz wersję dołączonego SimpleX Chat — to ten sam pakiet, przenumerowany tak, aby wersja wskazywała, którego klienta uruchamia. Wykonaj kopię zapasową tej usługi przed aktualizacją: 7.0.0 aktualizuje bazę danych SimpleX, a starsza wersja nie potrafi jej odczytać, więc powrót oznacza odinstalowanie i przywrócenie z kopii zapasowej.

[Pełne informacje o wydaniu SimpleX Chat](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.0)`,
    fr_FR: `Corrige une boucle de plantage après une réinstallation de SimpleX Server lorsque votre propre application gère le profil. Changer les relais de messages ne redémarre plus le service, et un pont dont les relais auto-hébergés sont injoignables se signale comme défaillant au lieu d'utiliser silencieusement les relais publics de SimpleX.

Corrige également l'obsolescence des relais auto-hébergés. Si vous utilisez SimpleX Server, une réinstallation met désormais à jour le Websocket Bridge automatiquement.

**Depuis la 0.3.0 :** SimpleX Chat passe à la 7.0.0, avec les noms publics SimpleX, des canaux améliorés et les descriptions de profil. Ce paquet suit désormais la version de SimpleX Chat qu'il embarque — c'est le même paquet, renuméroté pour que la version indique quel client il exécute. Sauvegardez ce service avant la mise à jour : la 7.0.0 met à niveau la base de données SimpleX et la version antérieure ne peut pas la lire, donc revenir en arrière implique de désinstaller et de restaurer depuis la sauvegarde.

[Notes de version complètes de SimpleX Chat](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.0)`,
  },
  migrations: {
    // 6.5.6 will not start against a 7.0.0 database, so `down` is IMPOSSIBLE;
    // the 7.0.0 revisions change the wrapper only, so falling back is safe.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
    other: {
      '=7.0.0:0': { down: async ({ effects }) => {} },
      '=7.0.0:1': { down: async ({ effects }) => {} },
    },
  },
})
