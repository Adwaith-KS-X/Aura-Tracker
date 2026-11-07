import { Text } from '../Typography';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase, authStorageKey } from './client';
import { sessionStorage } from './sessionStorage';
import { loadProfile } from './repository';
import type { Profile } from './profile';
import { AuthScreen, UpdatePassword } from './AuthScreen';
import { AccountDetails, ProfileScreen } from './ProfileScreen';
import { AccountShell, AccountButton, a } from './ui';

export type TrackerAccount = { userId: string; profile: Profile; onOpenAccount: () => void };
const recoveryKey = 'aura-recovery';
export function AccountGate({ children }: { children: (account: TrackerAccount) => React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null), [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false), [signingOut, setSigningOut] = useState(false);
  const [sessionError, setSessionError] = useState(false), [attempt, setAttempt] = useState(0);
  const signOutInProgress = useRef(false);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true, revision = 0;
    setLoading(true); setSessionError(false);
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active || signOutInProgress.current) return;
      revision++;
      if (event === 'PASSWORD_RECOVERY') { setRecovery(true); void sessionStorage.setItem(recoveryKey, '1').catch(() => {}); }
      if (event === 'SIGNED_OUT') { setRecovery(false); void sessionStorage.removeItem(recoveryKey).catch(() => {}); }
      setSession(next);
    });
    const initialRevision = revision;
    Promise.all([supabase.auth.getSession(), sessionStorage.getItem(recoveryKey)]).then(([result, recovering]) => {
      if (!active) return;
      if (result.error) throw result.error;
      if (revision === initialRevision) setSession(result.data.session);
      if (recovering === '1' && result.data.session) setRecovery(true);
      setLoading(false);
    }).catch(() => { if (active) { setSessionError(true); setLoading(false); } });
    const subscription = Platform.OS !== 'web' ? AppState.addEventListener('change', state => {
      if (state === 'active') supabase!.auth.startAutoRefresh(); else supabase!.auth.stopAutoRefresh();
    }) : null;
    if (Platform.OS !== 'web' && AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    return () => { active = false; listener.subscription.unsubscribe(); subscription?.remove(); if (Platform.OS !== 'web') supabase!.auth.stopAutoRefresh(); };
  }, [attempt]);
  async function signOut() {
    if (signOutInProgress.current) return;
    signOutInProgress.current = true; setSigningOut(true); setSessionError(false);
    // Unmount every screen holding personal records before doing network work.
    setSession(null); setRecovery(false);
    try { await supabase?.auth.signOut({ scope: 'local' }); } catch { /* Local cleanup below still runs if the network is offline. */ }
    finally {
      const results = await Promise.allSettled([sessionStorage.removeItem(authStorageKey), sessionStorage.removeItem(`${authStorageKey}-code-verifier`), sessionStorage.removeItem(`${authStorageKey}-user`), sessionStorage.removeItem(recoveryKey)]);
      if (results.some(result => result.status === 'rejected')) setSessionError(true);
      signOutInProgress.current = false; setSigningOut(false);
    }
  }
  if (loading || signingOut) return <AccountShell><ActivityIndicator color="#F5F5F5" /><Text style={a.body}>{signingOut ? 'Signing out…' : 'Opening your account…'}</Text></AccountShell>;
  if (sessionError) return <AccountShell><Text style={a.title}>Couldn’t open your session</Text><AccountButton title="Try again" onPress={() => setAttempt(value => value + 1)} /><AccountButton title="Sign out" secondary onPress={signOut} /></AccountShell>;
  if (!session) return <AuthScreen />;
  if (recovery) return <UpdatePassword onDone={() => { void sessionStorage.removeItem(recoveryKey).then(() => setRecovery(false)); }} />;
  return <SignedInAccount key={session.user.id} userId={session.user.id} email={session.user.email ?? ''} onSignOut={signOut}>{children}</SignedInAccount>;
}
function SignedInAccount({ userId, email, onSignOut, children }: { userId: string; email: string; onSignOut: () => void; children: (account: TrackerAccount) => React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null), [loading, setLoading] = useState(true), [failed, setFailed] = useState(false), [showAccount, setShowAccount] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setFailed(false);
    loadProfile(userId).then(value => { if (active) { setProfile(value); setLoading(false); } }).catch(() => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, [userId, attempt]);
  if (loading) return <AccountShell><ActivityIndicator color="#F5F5F5" /><Text style={a.body}>Loading your profile…</Text></AccountShell>;
  if (failed) return <AccountShell><Text style={a.title}>Couldn’t load your account</Text><Text style={a.body}>Check your connection and try again.</Text><AccountButton title="Try again" onPress={() => setAttempt(value => value + 1)} /><AccountButton title="Sign out" secondary onPress={onSignOut} /></AccountShell>;
  if (!profile) return <ProfileScreen userId={userId} onSaved={setProfile} onSignOut={onSignOut} />;
  if (showAccount) return <AccountDetails profile={profile} email={email} onBack={() => setShowAccount(false)} onSignOut={onSignOut} />;
  return <>{children({ userId, profile, onOpenAccount: () => setShowAccount(true) })}</>;
}
