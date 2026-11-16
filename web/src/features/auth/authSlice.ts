import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../api/types';

export interface AuthState {
  token: string | null;
  user: User | null;
}

const STORAGE_KEY = 'courtly.session';

// The session survives a page reload. Trade-off: a token in localStorage is readable by
// any script on the page (XSS); an httpOnly cookie would avoid that at the cost of CSRF
// handling — noted as a "next step" in the README.
function loadSession(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuthState;
  } catch {
    // corrupted or unavailable storage → start signed out
  }
  return { token: null, user: null };
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadSession,
  reducers: {
    signedIn(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    signedOut(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const { signedIn, signedOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
