import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserModel {
  name: string;
  url: string;
  id: string;
}

interface AuthState {
  token: string | null;
  userModel: UserModel | null;
  userModels: UserModel[];
}

const initialState: AuthState = {
  token: localStorage.getItem('token') || null,
  userModel: null,
  userModels: JSON.parse(localStorage.getItem('userModels') || '[]'),
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      if (action.payload) {
        localStorage.setItem('token', action.payload);
      } else {
        localStorage.removeItem('token');
      }
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

export const { setToken, setUserModel, addUserModel, removeUserModel, clearUserModels } = authSlice.actions;

export default authSlice.reducer; 