import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.inventari.app',
  appName: 'Inventari Im',
  webDir: '../frontend/dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
