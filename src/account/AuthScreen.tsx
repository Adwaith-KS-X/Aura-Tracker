import { Text } from '../Typography';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { backend, backendConfigured } from './client';
import { validateCredentials } from './profile';
import { AccountShell, AccountInput, AccountButton, AccountLink, ErrorText, a } from './ui';

type Mode = 'signup' | 'login' | 'verify' | 'forgot';
function friendly(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'invalid_credentials') return 'Email or password is incorrect.';
  if (code === 'email_not_confirmed') return 'Verify your email before signing in. Use the email verification option below.';
  if (code === 'otp_expired') return 'That code is invalid or expired. Request a new code.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Too many attempts. Please wait before trying again.';
  if (code === 'weak_password') return 'Choose a longer password that has not appeared in a known data breach.';
  if (code === 'user_already_exists') return 'Unable to create an account with these details. Try signing in.';
  if (error instanceof Error && !('status' in error) && !('code' in error) && !/fetch|network|timeout|abort|Account service/i.test(error.message)) return error.message;
  if (!backendConfigured) return 'Account service is not connected yet. Your details have not been submitted.';
  return 'Unable to complete the request. Check your connection and try again.';
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [code, setCode] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [verification, setVerification] = useState<'signup' | 'recovery'>('signup');
  const [cooldown, setCooldown] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => { setError(''); }, [email, password, confirm, code]);
  function changeMode(next: Mode) { if (inFlight.current) return; setMode(next); setError(''); setMessage(''); setPassword(''); setConfirm(''); setCode(''); }
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (failure) { setError(friendly(failure)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function submit() {
    await run(async () => {
      if (mode === 'verify') {
        if (!/^\d{6,10}$/.test(code.trim())) throw new Error('Enter the verification code from your email.');
        const { error } = await backend().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: verification === 'signup' ? 'email' : 'recovery' });
        if (error) throw error;
        setCode(''); return;
      }
      const normalized = validateCredentials(email, mode === 'forgot' ? 'recovery-request' : password, mode === 'signup');
      if (mode === 'forgot') {
        const { error } = await backend().auth.resetPasswordForEmail(normalized);
        if (error) throw error;
        setVerification('recovery'); setMode('verify'); setCooldown(Date.now() + 60000);
        setMessage('If an account exists for this address, you’ll receive a recovery code.'); return;
      }
      if (mode === 'signup') {
        if (password !== confirm) throw new Error('The passwords do not match.');
        const { data, error } = await backend().auth.signUp({ email: normalized, password });
        if (error) throw error;
        setPassword(''); setConfirm('');
        if (!data.session) { setVerification('signup'); setMode('verify'); setCooldown(Date.now() + 60000); setMessage('We’ve sent a verification code to your email.'); }
      } else {
        const { error } = await backend().auth.signInWithPassword({ email: normalized, password });
        if (error) throw error;
        setPassword('');
      }
    });
  }
  async function resend() {
    await run(async () => {
      if (Date.now() < cooldown) throw new Error('Please wait one minute before requesting another code.');
      const normalized = validateCredentials(email, 'verification-request', false);
      const response = verification === 'signup' ? await backend().auth.resend({ type: 'signup', email: normalized }) : await backend().auth.resetPasswordForEmail(normalized);
      if (response.error) throw response.error;
      setCooldown(Date.now() + 60000); setMessage('If eligible, a new code has been sent. Check your inbox and spam folder.');
    });
  }
  return <AccountShell>
    {(mode === 'signup' || mode === 'login') && <View accessibilityRole="tablist" style={a.tabs}>{(['signup', 'login'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: mode === item }} disabled={busy} onPress={() => changeMode(item)} style={[a.tab, mode === item && a.tabActive]}><Text style={[a.tabText, mode === item && a.tabTextActive]}>{item === 'signup' ? 'Create account' : 'Sign in'}</Text></Pressable>)}</View>}
    <View style={{ gap: 8 }}><Text style={a.step}>{mode === 'signup' ? '01 ACCOUNT · 02 YOUR PROFILE' : 'AURA ACCOUNT'}</Text><Text accessibilityRole="header" style={a.title}>{mode === 'signup' ? 'Create your account' : mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Reset your password' : verification === 'recovery' ? 'Check your email' : 'Verify your email'}</Text><Text style={a.body}>{mode === 'signup' ? 'Save your activity and keep your progress in one account.' : mode === 'login' ? 'Sign in to open your personal tracker.' : mode === 'forgot' ? 'We’ll email you a code to reset your password.' : `Enter the code sent to ${email.trim()}.`}</Text></View>
    {!backendConfigured && <View style={a.info}><Text style={a.note}>Account setup is still in progress. Sign-in and account creation will be available once the account service is connected. No details are being saved yet.</Text></View>}
    {mode !== 'verify' && <AccountInput label="Email" value={email} onChange={setEmail} email placeholder="you@gmail.com" maxLength={254} />}
    {(mode === 'signup' || mode === 'login') && <AccountInput label="Password" value={password} onChange={setPassword} password newPassword={mode === 'signup'} maxLength={128} />}
    {mode === 'signup' && <><Text style={[a.note, { marginTop: -10 }]}>Choose an Aura Tracker password with at least 12 characters.</Text><AccountInput label="Confirm password" value={confirm} onChange={setConfirm} password newPassword maxLength={128} /></>}
    {mode === 'verify' && <AccountInput label="Email verification code" value={code} onChange={setCode} numeric maxLength={10} placeholder="123456" />}
    {!!message && <View accessibilityLiveRegion="polite" style={a.info}><Text style={a.body}>{message}</Text></View>}
    <ErrorText>{error}</ErrorText>
    <AccountButton title={mode === 'signup' ? 'Create account' : mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send recovery code' : 'Verify email'} busy={busy} onPress={submit} />
    {mode === 'login' && <><AccountLink title="Forgot password?" onPress={() => changeMode('forgot')} disabled={busy} /><AccountLink title="Verify your email" onPress={() => { const value = email.trim(); if (!value) { setError('Enter your email first.'); return; } setVerification('signup'); changeMode('verify'); }} disabled={busy} /></>}
    {mode === 'verify' && <AccountLink title="Send a new code" onPress={resend} disabled={busy} />}
    {(mode === 'forgot' || mode === 'verify') && <AccountLink title="Back to sign in" onPress={() => changeMode('login')} disabled={busy} />}
    {mode === 'signup' && <Text style={a.note}>You’ll add your name and measurements after verifying your email.</Text>}
  </AccountShell>;
}

export function UpdatePassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function save() {
    if (inFlight.current) return; inFlight.current = true; setBusy(true); setError('');
    try {
      validateCredentials('account@example.com', password, true);
      if (password !== confirm) throw new Error('The passwords do not match.');
      const { error } = await backend().auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setConfirm(''); onDone();
    } catch (failure) { setError(friendly(failure)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <AccountShell><Text accessibilityRole="header" style={a.title}>Choose a new password</Text><Text style={a.body}>Use at least 12 characters.</Text><AccountInput label="New password" value={password} onChange={setPassword} password maxLength={128} /><AccountInput label="Confirm new password" value={confirm} onChange={setConfirm} password maxLength={128} /><ErrorText>{error}</ErrorText><AccountButton title="Save new password" onPress={save} busy={busy} /></AccountShell>;
}
