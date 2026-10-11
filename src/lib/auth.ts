import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { wipeLocal } from './storage';
import { fetchWithTimeout } from './net';

WebBrowser.maybeCompleteAuthSession();

export const redirectUrl = () => Linking.createURL('/');

// Held in memory only (never persisted) so "Check verification status" can sign in once the email is confirmed
export const pending = { email: '', password: '' };

export const displayName = (u: User | null): string =>
  (u?.user_metadata?.name ?? u?.user_metadata?.full_name ?? '') as string;

// Turns an auth redirect URL (OAuth or email-confirmation link) into a session.
// Returns an error message, or null on success.
export async function sessionFromUrl(url: string): Promise<string | null> {
  const frag = new URLSearchParams(url.split('#')[1] ?? '');
  const query = new URLSearchParams(url.split('?')[1]?.split('#')[0] ?? '');
  const get = (k: string) => frag.get(k) ?? query.get(k);

  const access_token = get('access_token');
  const refresh_token = get('refresh_token');
  if (!access_token || !refresh_token) return get('error_description') ?? 'Sign-in failed.';

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return error?.message ?? null; // on success the root layout swaps stacks
}

// Supabase answers an unconfigured provider with a JSON 4xx instead of a redirect
async function providerError(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, {}, 8000);
    if (res.status < 400 || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    const body = await res.json();
    return body.msg ?? body.error_description ?? body.message ?? `Error ${res.status}`;
  } catch {
    return null; // offline or slow: let the browser sheet try
  }
}

// Returns an error message, or null on success or cancel. Never throws.
export async function signInWithProvider(provider: 'apple' | 'google'): Promise<string | null> {
  const name = provider === 'apple' ? 'Apple' : 'Google';
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUrl(), skipBrowserRedirect: true },
    });
    if (error || !data.url) return error?.message ?? 'Could not start sign-in.';

    const problem = await providerError(data.url);
    if (problem) {
      return /secret|unsupported provider|not enabled/i.test(problem)
        ? `${name} sign-in isn’t set up yet. Turn it on in the Supabase dashboard under Authentication → Providers.`
        : problem;
    }

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl());
    return res.type === 'success' ? sessionFromUrl(res.url) : null; // closed sheet = no error
  } catch (e) {
    return e instanceof Error ? e.message : 'Sign-in failed.';
  }
}


const withTimeout = <T,>(p: Promise<T>, ms: number, message: string) =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
// If sign-out fails (offline) the user is still signed in, so the cache is kept and nothing is lost
export async function signOutAndClear(): Promise<string | null> {
  try {
    const { error } = await withTimeout(
      supabase.auth.signOut({ scope: 'local' }), // this device only; removes the stored session on success
      10000,
      'Logging out took too long. Check your connection and try again.',
    );
    if (error) return error.message;
  } catch (e) {
    return e instanceof Error ? e.message : 'Could not log out.';
  }
  // Signed out. A cleanup failure isn't fatal: claimLocalCache() wipes a stale cache at the next sign-in
  pending.email = '';
  pending.password = '';
  try { await wipeLocal(); } catch {}
  return null;
}