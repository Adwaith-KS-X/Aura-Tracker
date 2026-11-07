// Browser preview sessions last for this tab. Passwords are never persisted here.
export const sessionStorage = {
  getItem: async (key: string) => globalThis.sessionStorage.getItem(key),
  setItem: async (key: string, value: string) => { globalThis.sessionStorage.setItem(key, value); },
  removeItem: async (key: string) => { globalThis.sessionStorage.removeItem(key); },
};
