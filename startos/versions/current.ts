import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1:0',
  releaseNotes: {
    en_US:
      'Updated SimpleX Chat to 6.5.5. Highlights: initial support for supporter badges, and a fix for files without an extension being saved with a trailing dot. Full notes: https://github.com/simplex-chat/simplex-chat/releases/tag/v6.5.5. Also includes internal updates for start-sdk 2.0.',
    es_ES:
      'SimpleX Chat actualizado a 6.5.5. Novedades: compatibilidad inicial con insignias de patrocinador y corrección de archivos sin extensión que se guardaban con un punto final. Notas completas: https://github.com/simplex-chat/simplex-chat/releases/tag/v6.5.5. También incluye actualizaciones internas para start-sdk 2.0.',
    de_DE:
      'SimpleX Chat auf 6.5.5 aktualisiert. Highlights: erste Unterstützung für Unterstützer-Abzeichen und eine Korrektur für Dateien ohne Erweiterung, die mit einem abschließenden Punkt gespeichert wurden. Vollständige Hinweise: https://github.com/simplex-chat/simplex-chat/releases/tag/v6.5.5. Enthält außerdem interne Aktualisierungen für start-sdk 2.0.',
    pl_PL:
      'Zaktualizowano SimpleX Chat do 6.5.5. Najważniejsze zmiany: wstępna obsługa odznak wspierających oraz poprawka plików bez rozszerzenia zapisywanych z końcową kropką. Pełne informacje: https://github.com/simplex-chat/simplex-chat/releases/tag/v6.5.5. Zawiera również wewnętrzne aktualizacje dla start-sdk 2.0.',
    fr_FR:
      'SimpleX Chat mis à jour vers 6.5.5. Nouveautés : prise en charge initiale des badges de soutien et correction des fichiers sans extension enregistrés avec un point final. Notes complètes : https://github.com/simplex-chat/simplex-chat/releases/tag/v6.5.5. Inclut également des mises à jour internes pour start-sdk 2.0.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
