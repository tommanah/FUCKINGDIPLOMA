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
  persistModels: boolean; // Флаг для управления сохранением моделей между сессиями
}

// Проверяем есть ли сохраненный токен в localStorage
const savedToken = localStorage.getItem('auth_token');

// Проверяем, нужно ли сохранять модели между сессиями
const shouldPersistModels = localStorage.getItem('persistModels') !== 'false';

// Получаем сохраненные модели, если их нужно сохранять между сессиями
const savedModels = shouldPersistModels ? JSON.parse(localStorage.getItem('userModels') || '[]') : [];

const initialState: AuthState = {
  token: savedToken,
  showAR: false,
  userModel: null,
  userModels: savedModels,
  persistModels: shouldPersistModels
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
      
      // При выходе также очищаем все модели
      clearUserModelsHelper(state);
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
      // Обновляем localStorage только если нужно сохранять между сессиями
      if (state.persistModels) {
        localStorage.setItem('userModels', JSON.stringify(state.userModels));
      }
      // Устанавливаем текущую модель
      state.userModel = action.payload;
    },
    removeUserModel: (state, action: PayloadAction<string>) => {
      // Находим модель для освобождения URL объекта
      const modelToRemove = state.userModels.find(model => model.id === action.payload);
      if (modelToRemove && modelToRemove.url) {
        try {
          URL.revokeObjectURL(modelToRemove.url);
        } catch (e) {
          console.error('Ошибка при освобождении URL объекта:', e);
        }
      }
      
      // Удаляем модель по id
      state.userModels = state.userModels.filter(model => model.id !== action.payload);
      
      // Обновляем localStorage только если нужно сохранять между сессиями
      if (state.persistModels) {
        localStorage.setItem('userModels', JSON.stringify(state.userModels));
      }
      
      // Если удаляем активную модель, сбрасываем её
      if (state.userModel && state.userModel.id === action.payload) {
        state.userModel = null;
      }
    },
    clearUserModels: (state) => {
      clearUserModelsHelper(state);
    },
    setPersistModels: (state, action: PayloadAction<boolean>) => {
      state.persistModels = action.payload;
      localStorage.setItem('persistModels', action.payload.toString());
      
      // Если отключаем сохранение между сессиями, удаляем данные из localStorage
      if (!action.payload) {
        localStorage.removeItem('userModels');
      } else {
        // Если включаем сохранение, сохраняем текущие модели
        localStorage.setItem('userModels', JSON.stringify(state.userModels));
      }
    }
  }
});

// Вспомогательная функция для очистки моделей
const clearUserModelsHelper = (state: AuthState) => {
  // Освобождаем URL объекты для всех моделей
  state.userModels.forEach(model => {
    if (model && model.url) {
      try {
        URL.revokeObjectURL(model.url);
      } catch (e) {
        console.error('Ошибка при освобождении URL объекта:', e);
      }
    }
  });
  
  // Очищаем массив моделей
  state.userModels = [];
  localStorage.removeItem('userModels');
  state.userModel = null;
};

// Селектор для проверки авторизации
export const isAuthorized = (state: { auth: AuthState }) => !!state.auth.token;

export const { 
  setToken, 
  logout, 
  setShowAR, 
  setUserModel,
  addUserModel,
  removeUserModel,
  clearUserModels,
  setPersistModels
} = authSlice.actions;

export default authSlice.reducer; 