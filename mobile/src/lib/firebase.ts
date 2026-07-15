import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/** Same Firebase project as deergayu.com — shared users / carts / orders / appointments */
const firebaseConfig = {
  apiKey: 'AIzaSyBzMjfN55p3pu43krCTHHm7wjVwA6FoUmw',
  authDomain: 'deergayu-9de41.firebaseapp.com',
  projectId: 'deergayu-9de41',
  storageBucket: 'deergayu-9de41.firebasestorage.app',
  messagingSenderId: '877453663161',
  appId: '1:877453663161:web:616aab4b23f752b26eb468',
  measurementId: 'G-2RVE05YSNJ',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth() {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  try {
    // RN persistence lives on auth internals; types vary across firebase major versions
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require('@firebase/auth/dist/rn/index.js') as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
    };
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as any,
    });
  } catch {
    // Already initialized (Fast Refresh) or persistence unavailable
    return getAuth(app);
  }
}

export const auth = createAuth();
export { app };
