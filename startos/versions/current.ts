import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '7.0.0:0',
  releaseNotes: {
    en_US: `Updated SimpleX Chat to 7.0.0, bringing SimpleX public names, improved channels, and profile descriptions. Also fixes relay switching, which 7.0.0 broke by adding a required field to every server entry.

**This package now tracks the bundled SimpleX Chat version.** The previous release was 0.3.0; nothing about the bridge is reset by the jump — it is the same package, renumbered so the version tells you which client it runs.

**Back up this service before updating.** 7.0.0 upgrades the SimpleX database in place, and the previous version cannot read it. Returning to 0.3.0 means uninstalling, reinstalling the older version, and restoring that backup.

[Full SimpleX Chat release notes](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.0)`,
    es_ES: `Actualiza SimpleX Chat a 7.0.0, con los nombres públicos de SimpleX, canales mejorados y descripciones de perfil. También corrige el cambio de relés, que la 7.0.0 rompió al añadir un campo obligatorio a cada entrada de servidor.

**Este paquete ahora sigue la versión de SimpleX Chat que incluye.** La versión anterior era la 0.3.0; el salto no reinicia nada del puente: es el mismo paquete, renumerado para que la versión indique qué cliente ejecuta.

**Haz una copia de seguridad de este servicio antes de actualizar.** La 7.0.0 actualiza la base de datos de SimpleX y la versión anterior no puede leerla. Volver a la 0.3.0 implica desinstalar, reinstalar la versión anterior y restaurar esa copia.

[Notas completas de SimpleX Chat](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.0)`,
    de_DE: `Aktualisiert SimpleX Chat auf 7.0.0, mit öffentlichen SimpleX-Namen, verbesserten Kanälen und Profilbeschreibungen. Behebt außerdem den Relay-Wechsel, den 7.0.0 durch ein neues Pflichtfeld in jedem Servereintrag brach.

**Dieses Paket folgt jetzt der Version des enthaltenen SimpleX Chat.** Die vorherige Veröffentlichung war 0.3.0; der Sprung setzt nichts an der Bridge zurück — es ist dasselbe Paket, neu nummeriert, damit die Version zeigt, welchen Client es ausführt.

**Sichere diesen Dienst vor dem Update.** 7.0.0 aktualisiert die SimpleX-Datenbank, und die vorherige Version kann sie nicht lesen. Eine Rückkehr zu 0.3.0 bedeutet Deinstallieren, die ältere Version neu installieren und diese Sicherung wiederherstellen.

[Vollständige SimpleX-Chat-Release-Notes](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.0)`,
    pl_PL: `Aktualizuje SimpleX Chat do 7.0.0, z publicznymi nazwami SimpleX, ulepszonymi kanałami i opisami profilu. Naprawia też przełączanie przekaźników, które 7.0.0 zepsuła, dodając wymagane pole do każdego wpisu serwera.

**Ten pakiet śledzi teraz wersję dołączonego SimpleX Chat.** Poprzednim wydaniem było 0.3.0; skok niczego nie resetuje w moście — to ten sam pakiet, przenumerowany tak, aby wersja wskazywała, którego klienta uruchamia.

**Wykonaj kopię zapasową tej usługi przed aktualizacją.** 7.0.0 aktualizuje bazę danych SimpleX, a poprzednia wersja nie potrafi jej odczytać. Powrót do 0.3.0 oznacza odinstalowanie, ponowną instalację starszej wersji i przywrócenie tej kopii.

[Pełne informacje o wydaniu SimpleX Chat](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.0)`,
    fr_FR: `Met à jour SimpleX Chat vers 7.0.0, avec les noms publics SimpleX, des canaux améliorés et les descriptions de profil. Corrige également le changement de relais, que la 7.0.0 a cassé en ajoutant un champ obligatoire à chaque entrée de serveur.

**Ce paquet suit désormais la version de SimpleX Chat qu'il embarque.** La version précédente était la 0.3.0 ; ce saut ne réinitialise rien du pont — c'est le même paquet, renuméroté pour que la version indique quel client il exécute.

**Sauvegardez ce service avant la mise à jour.** La 7.0.0 met à niveau la base de données SimpleX et la version précédente ne peut pas la lire. Revenir à la 0.3.0 implique de désinstaller, réinstaller l'ancienne version et restaurer cette sauvegarde.

[Notes de version complètes de SimpleX Chat](https://github.com/simplex-chat/simplex-chat/releases/tag/v7.0.0)`,
  },
  migrations: {
    // `down` is IMPOSSIBLE because that upstream migration is one-way: 6.5.6
    // will not start against a 7.0.0 database (verified). simplex-chat leaves
    // simplex_v1_*.db.bak snapshots beside the live files, but restoring them
    // discards everything since the upgrade, so it stays a documented manual
    // recovery rather than an automated rollback. See the README.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
