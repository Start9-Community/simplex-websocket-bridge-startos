import { VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '7.0.2:2',
  releaseNotes: {
    en_US: `- Configure Client's fields explain what each choice does.
- Revoke API Key asks you to pick the key to revoke.
- When creating an invitation, viewing or resetting the address, or applying settings to the running client fails, the details appear in a copyable field.`,
    es_ES: `- Los campos de Configurar cliente explican qué hace cada opción.
- Revocar clave de API te pide que elijas la clave que quieres revocar.
- Cuando falla crear una invitación, ver o restablecer la dirección, o aplicar la configuración al cliente en ejecución, los detalles aparecen en un campo que se puede copiar.`,
    de_DE: `- Die Felder von „Client konfigurieren“ erklären, was jede Auswahl bewirkt.
- „API-Schlüssel widerrufen“ lässt dich den zu widerrufenden Schlüssel auswählen.
- Wenn das Erstellen einer Einladung, das Anzeigen oder Zurücksetzen der Adresse oder das Anwenden der Einstellungen auf den laufenden Client fehlschlägt, erscheinen die Details in einem kopierbaren Feld.`,
    pl_PL: `- Pola akcji Konfiguruj klienta wyjaśniają, co robi każdy wybór.
- Unieważnij klucz API prosi o wybranie klucza do unieważnienia.
- Gdy utworzenie zaproszenia, wyświetlenie lub zresetowanie adresu albo zastosowanie ustawień do działającego klienta się nie powiedzie, szczegóły pojawiają się w polu, które można skopiować.`,
    fr_FR: `- Les champs de Configurer le client expliquent ce que fait chaque choix.
- Révoquer une clé d’API vous demande de choisir la clé à révoquer.
- Lorsque la création d’une invitation, l’affichage ou la réinitialisation de l’adresse, ou l’application des paramètres au client en cours d’exécution échoue, les détails s’affichent dans un champ copiable.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async () => {},
  },
})
