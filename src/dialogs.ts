import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

// Native dialogs and browser dialogs share the same small UI API.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (Platform.OS !== 'web') { NativeAlert.alert(title, message, buttons); return; }
    const text = [title, message].filter(Boolean).join('\n\n');
    if (buttons) {
      const action = buttons.find(button => button.style !== 'cancel');
      if (window.confirm(text)) action?.onPress?.();
    } else {
      window.alert(text);
    }
  },
};
