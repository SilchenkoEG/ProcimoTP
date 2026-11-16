import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { baseApi } from '../api/baseApi';
import { authReducer, signedOut } from '../features/auth/authSlice';

const appReducer = combineReducers({
  auth: authReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

// Signing out also clears all cached API data, so the next user never sees the previous one's.
const rootReducer: typeof appReducer = (state, action) =>
  appReducer(signedOut.match(action) ? { auth: state?.auth } : state, action);

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
