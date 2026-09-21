import { sdk } from './sdk'

export const { createBackup, restoreInit } = sdk.setupBackups([
  'main',
  'startos',
])
