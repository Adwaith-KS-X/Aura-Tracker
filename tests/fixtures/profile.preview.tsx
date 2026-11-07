// Development-only component QA entry. Not imported by the production app.
// It does not create an authenticated session or permit saving account data.
import React from 'react';
import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileScreen } from '../../src/account/ProfileScreen';
function Preview() {
  return <SafeAreaProvider><ProfileScreen userId="00000000-0000-4000-8000-000000000000" onSaved={() => { throw new Error('QA entry must not save data'); }} onSignOut={() => {}} /></SafeAreaProvider>;
}
registerRootComponent(Preview);
