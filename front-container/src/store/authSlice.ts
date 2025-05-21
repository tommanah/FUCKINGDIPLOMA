import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserModel {
  name: string;
  url: string;
  id: string;
}

interface AuthState {
  token: string | null;
  showAR: boolean;
  userModel: UserModel | null;
  userModels: UserModel[];
}

// Проверяем есть ли сохраненный токен в localStorage
const savedToken = localStorage.getItem('auth_token');

// Проверяем наличие сохраненных моделей в localStorage
const savedModels = localStorage.getItem('userModels');
const parsedModels = savedModels ? JSON.parse(savedModels) : [];

const initialState: AuthState = {
  token: savedToken,
  showAR: false,
  userModel: null,
  userModels: parsedModels
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
    setUserModel: (state, action: PayloadAction<UserModel | null>) => {
      state.userModel = action.payload;
    },
    addUserModel: (state, action: PayloadAction<UserModel>) => {
      // Сохраняем модель в массив моделей
      state.userModels.push(action.payload);
      // Обновляем localStorage
      localStorage.setItem('userModels', JSON.stringify(state.userModels));
      // Устанавливаем текущую модель
      state.userModel = action.payload;
    },
    removeUserModel: (state, action: PayloadAction<string>) => {
      // Удаляем модель по id
      state.userModels = state.userModels.filter(model => model.id !== action.payload);
      // Обновляем localStorage
      localStorage.setItem('userModels', JSON.stringify(state.userModels));
      // Если удаляем активную модель, сбрасываем её
      if (state.userModel && state.userModel.id === action.payload) {
        state.userModel = null;
      }
    },
    clearUserModels: (state) => {
      state.userModels = [];
      localStorage.removeItem('userModels');
      state.userModel = null;
    }
  }
});

// Селектор для проверки авторизации
export const isAuthorized = (state: { auth: AuthState }) => !!state.auth.token;

export const { 
  setToken, 
  logout, 
  setShowAR, 
  setUserModel, 
  addUserModel, 
  removeUserModel, 
  clearUserModels 
} = authSlice.actions;

export default authSlice.reducer; 