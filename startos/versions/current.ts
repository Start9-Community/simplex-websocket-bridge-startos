import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1:0',
  releaseNotes: {
    en_US:
      'Updated SimpleX Chat to 6.5.5. Highlights: initial support for supporter badges, and a fix for files without an extension being saved with a trailing dot. Full notes: https://github.com/simplex-chat/simplex-chat/releases/tag/v6.5.5. Also fixes file exchange, which 6.5.5 would otherwise have broken: received files are kept in the shared /simplex mount, where dependent services can reach them. Includes internal updates for start-sdk 2.0.',
    es_ES:
      'SimpleX Chat actualizado a 6.5.5. Novedades: compatibilidad inicial con insignias de patrocinador y corrección de archivos sin extensión que se guardaban con un punto final. Notas completas: https://github.com/simplex-chat/simplex-chat/releases/tag/v6.5.5. También corrige el intercambio de archivos, que 6.5.5 habría roto: los archivos recibidos se mantienen en el punto de montaje compartido /simplex, donde los servicios dependientes pueden acceder a ellos. Incluye actualizaciones internas para start-sdk 2.0.',
    de_DE:
      'SimpleX Chat auf 6.5.5 aktualisiert. Highlights: erste Unterstützung für Unterstützer-Abzeichen und eine Korrektur für Dateien ohne Erweiterung, die mit einem abschließenden Punkt gespeichert wurden. Vollständige Hinweise: https://github.com/simplex-chat/simplex-chat/releases/tag/v6.5.5. Behebt außerdem den Dateiaustausch, den 6.5.5 andernfalls beschädigt hätte: empfangene Dateien bleiben im gemeinsamen /simplex-Mount, wo abhängige Dienste sie erreichen können. Enthält interne Aktualisierungen für start-sdk 2.0.',
    pl_PL:
      'Zaktualizowano SimpleX Chat do 6.5.5. Najważniejsze zmiany: wstępna obsługa odznak wspierających oraz poprawka plików bez rozszerzenia zapisywanych z końcową kropką. Pełne informacje: https://github.com/simplex-chat/simplex-chat/releases/tag/v6.5.5. Naprawia również wymianę plików, którą 6.5.5 w przeciwnym razie by zepsuł: odebrane pliki pozostają we współdzielonym punkcie montowania /simplex, gdzie usługi zależne mogą je odczytać. Zawiera wewnętrzne aktualizacje dla start-sdk 2.0.',
    fr_FR:
      "SimpleX Chat mis à jour vers 6.5.5. Nouveautés : prise en charge initiale des badges de soutien et correction des fichiers sans extension enregistrés avec un point final. Notes complètes : https://github.com/simplex-chat/simplex-chat/releases/tag/v6.5.5. Corrige également l'échange de fichiers, que 6.5.5 aurait sinon cassé : les fichiers reçus restent dans le montage partagé /simplex, où les services dépendants peuvent y accéder. Inclut des mises à jour internes pour start-sdk 2.0.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
