import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  showAR: boolean;
  userModel: {
    name: string;
    url: string;
  } | null;
}

// Проверяем есть ли сохраненный токен в localStorage
const savedToken = localStorage.getItem('auth_token');

const initialState: AuthState = {
  token: savedToken,
  showAR: false,
  userModel: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      // Сохраняем токен в localStorage для сохранения при перезагрузке страницы
      if (action.payload) {
        localStorage.setItem('auth_token', action.payload);
      } else {
        localStorage.removeItem('auth_token');
      }
    },
    logout: (state) => {
      state.token = null;
      localStorage.removeItem('auth_token');
    },
    setShowAR: (state, action: PayloadAction<boolean>) => {
      state.showAR = action.payload;
    },
    setUserModel: (state, action: PayloadAction<{ name: string; url: string } | null>) => {
      state.userModel = action.payload;
    }
  }
});

// Селектор для проверки авторизации
export const isAuthorized = (state: { auth: AuthState }) => !!state.auth.token;

export const { setToken, logout, setShowAR, setUserModel } = authSlice.actions;
export default authSlice.reducer; 