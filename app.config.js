// Expo evaluates this in Node before bundling. Reject privileged keys early so
// a mistaken server secret never reaches a public client bundle.
module.exports = ({ config }) => {
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (key) {
    let allowed = key.startsWith('sb_publishable_');
    if (key.startsWith('eyJ')) {
      try { allowed = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'anon'; }
      catch { allowed = false; }
    }
    if (!allowed) throw new Error('Aura Tracker requires a Supabase publishable/anon key. Never use a service-role or secret key in the app.');
  }
  return config;
};
