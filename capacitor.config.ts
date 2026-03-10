import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.driveworld.app',
  appName: 'Drive World',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
