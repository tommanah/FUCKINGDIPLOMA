import React, { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { setToken, setShowAR, isAuthorized, setUserModel, addUserModel } from './store/authSlice';
import Authorization from './pages/authorization/Authorization';
import Map from './pages/playground/Map';
// @ts-ignore Игнорируем ошибку импорта .jsx файла
import AR, { startARSession } from './pages/playground/AR.jsx';
import { v4 as uuidv4 } from 'uuid';
import './Main.css';

// Токен для неавторизованного входа (demo-доступ)
const DEMO_TOKEN = 'demo-token-no-permissions';

function Main() {
  const dispatch = useAppDispatch();
  const showAR = useAppSelector(state => state.auth.showAR);
  const authorized = useAppSelector(isAuthorized);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userModel = useAppSelector(state => state.auth.userModel);

  const handleEnterAR = () => {
    dispatch(setShowAR(true));
  };

  const handleExitAR = () => {
    dispatch(setShowAR(false));
  };

  const handleEnterWithoutRegistration = () => {
    // Выдаем демо-токен с ограниченными правами
    dispatch(setToken(DEMO_TOKEN));
  };

  // Функция для открытия диалога выбора файла
  const handleUploadModelClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Обработчик загрузки файла
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем формат файла
    const isValidFormat = file.name.toLowerCase().endsWith('.glb') || 
                          file.name.toLowerCase().endsWith('.gltf');
    if (!isValidFormat) {
      alert('Пожалуйста, выберите файл формата .glb или .gltf');
      return;
    }

    // Показываем индикатор загрузки
    const loadingNotification = document.createElement('div');
    loadingNotification.className = 'model-loading-notification';
    loadingNotification.textContent = `Загрузка модели "${file.name}"...`;
    document.body.appendChild(loadingNotification);

    const reader = new FileReader();
    
    reader.onload = function(e) {
      // Создаем URL из массива
      const contents = e.target?.result as ArrayBuffer;
      const blob = new Blob([contents]);
      const url = URL.createObjectURL(blob);
      
      // Сохраняем URL модели в Redux store с уникальным идентификатором
      dispatch(addUserModel({
        name: file.name,
        url: url,
        id: uuidv4()
      }));
      
      // Удаляем индикатор загрузки
      if (loadingNotification.parentNode) {
        loadingNotification.parentNode.removeChild(loadingNotification);
      }
      
      // Показываем уведомление об успешной загрузке
      const notification = document.createElement('div');
      notification.className = 'model-success-notification';
      notification.textContent = `Модель "${file.name}" успешно загружена`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    };
    
    reader.onerror = function(e) {
      console.error('Ошибка при чтении файла:', e);
      
      // Удаляем индикатор загрузки
      if (loadingNotification.parentNode) {
        loadingNotification.parentNode.removeChild(loadingNotification);
      }
      
      alert('Ошибка при чтении файла.');
    };
    
    reader.readAsArrayBuffer(file);
  };

  // Эффект для запуска AR сессии при переключении на AR режим
  useEffect(() => {
    if (showAR) {
      // Небольшая задержка, чтобы дать компоненту AR время на монтирование
      const timer = setTimeout(() => {
        // Запускаем AR сессию через экспортированную функцию
        startARSession();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [showAR]);

  return (
    <div className="Main">
      {!showAR ? (
        <div className="map-with-auth-overlay">
          <div className="background-map">
            <Map />
          </div>
          {!authorized && (
            <div className="auth-overlay">
              <Authorization onEnterWithoutRegistration={handleEnterWithoutRegistration} />
            </div>
          )}
          {authorized && (
            <>
              <div className="mode-toggle">
                <button className="mode-button active">3D Карта</button>
                <button className="mode-button" onClick={handleEnterAR}>Доп. реальность</button>
              </div>
              <div className="map-buttons">
                <button
                  onClick={handleEnterAR}
                  className="map-action-button"
                >
                  Включить AR
                </button>
                <button
                  onClick={handleUploadModelClick}
                  className="map-action-button upload-model-button"
                >
                  {userModel ? `Модель: ${userModel.name}` : 'Загрузить модель'}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  style={{ display: 'none' }} 
                  accept=".glb,.gltf" 
                  onChange={handleFileChange}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="ar-view">
          <AR />
          <div className="mode-toggle">
            <button className="mode-button" onClick={handleExitAR}>3D Карта</button>
            <button className="mode-button active">Доп. реальность</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Main; 