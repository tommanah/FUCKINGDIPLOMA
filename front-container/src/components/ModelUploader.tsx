import React, { useState, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { addUserModel, UserModel } from '../store/auth/authSlice';
import { v4 as uuidv4 } from 'uuid';
import './ModelUploader.css';

const ModelUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  
  const token = useAppSelector(state => state.auth.token);
  const userModels = useAppSelector(state => state.auth.userModels);
  
  const isDemoUser = token === 'demo-token-no-permissions';
  const MAX_DEMO_MODELS = 3;
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleClickUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFile = (file: File) => {
    // Сбрасываем предыдущие сообщения
    setErrorMessage(null);
    setSuccessMessage(null);
    
    // Проверяем ограничения для демо-пользователя
    if (isDemoUser && userModels.length >= MAX_DEMO_MODELS) {
      setErrorMessage(`Демо-режим: вы можете загрузить максимум ${MAX_DEMO_MODELS} моделей. Пожалуйста, зарегистрируйтесь для полного доступа.`);
      return;
    }
    
    // Проверяем формат файла
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      setErrorMessage('Поддерживаются только форматы GLB и GLTF');
      return;
    }
    
    // Проверяем размер файла (ограничение - 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage('Размер файла не должен превышать 10MB');
      return;
    }
    
    try {
      // Создаем URL для файла
      const url = URL.createObjectURL(file);
      
      // Создаем новую модель
      const newModel: UserModel = {
        name: file.name,
        url: url,
        id: uuidv4()
      };
      
      // Добавляем модель в хранилище
      dispatch(addUserModel(newModel));
      
      setSuccessMessage(`Модель "${file.name}" успешно загружена`);
    } catch (error) {
      console.error('Ошибка при загрузке модели:', error);
      setErrorMessage('Произошла ошибка при загрузке модели. Пожалуйста, попробуйте снова.');
    }
  };
  
  return (
    <div className="model-uploader-container">
      <h3>Загрузить 3D модель</h3>
      
      {isDemoUser && (
        <div className="model-limit-info">
          Загружено: {userModels.length}/{MAX_DEMO_MODELS} моделей (демо-режим)
        </div>
      )}
      
      <div 
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClickUpload}
      >
        <div className="drop-content">
          <i className="upload-icon">⬆️</i>
          <p>Перетащите модель сюда или кликните для выбора файла</p>
          <span>Поддерживаемые форматы: GLB, GLTF</span>
        </div>
        <input 
          type="file" 
          ref={fileInputRef}
          style={{ display: 'none' }} 
          accept=".glb,.gltf"
          onChange={handleFileSelect}
        />
      </div>
      
      {errorMessage && (
        <div className="upload-message error">
          {errorMessage}
        </div>
      )}
      
      {successMessage && (
        <div className="upload-message success">
          {successMessage}
        </div>
      )}
      
      {userModels.length > 0 && (
        <div className="uploaded-models">
          <h4>Загруженные модели:</h4>
          <div className="models-list">
            {userModels.map((model) => (
              <div key={model.id} className="model-item">
                <span className="model-name">{model.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelUploader; 