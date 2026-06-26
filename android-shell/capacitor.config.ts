/// <reference types="@capacitor-community/safe-area" />

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.inventari.app',
  appName: 'Inventari Im',
  webDir: '../frontend/dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    adjustMarginsForEdgeToEdge: 'disable',
  },
  plugins: {
    SafeArea: {
      detectViewportFitCoverChanges: true,
      initialViewportFitCover: true,
    },
  },
}

export default config
