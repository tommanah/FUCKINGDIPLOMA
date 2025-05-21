import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { 
  setToken, 
  setShowAR, 
  isAuthorized, 
  setUserModel, 
  addUserModel,
  setPersistModels
} from './store/authSlice';
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
  const userModels = useAppSelector(state => state.auth.userModels);
  const persistModels = useAppSelector(state => (state.auth as any).persistModels) || false;
  const [isARSupported, setIsARSupported] = useState(true);

  // При первой загрузке проверяем, если это demo режим, отключаем сохранение моделей между сессиями
  useEffect(() => {
    if (authorized && authorized === (localStorage.getItem('token') === DEMO_TOKEN)) {
      // Для демо-режима устанавливаем хранение моделей только для текущей сессии
      try {
        dispatch(setPersistModels(false));
        console.log('Демо-режим: модели будут сохранены только для текущей сессии');
      } catch (error) {
        console.error('Ошибка при установке режима хранения моделей:', error);
        // Резервный вариант - используем localStorage напрямую
        localStorage.setItem('persistModels', 'false');
      }
    }
  }, [authorized, dispatch]);

  // Проверяем поддержку WebXR при загрузке компонента
  useEffect(() => {
    const checkXRSupport = async () => {
      try {
        if ('xr' in navigator) {
          const isSupported = await (navigator as any).xr?.isSessionSupported('immersive-ar');
          setIsARSupported(!!isSupported);
          console.log('WebXR AR поддержка:', isSupported);
        } else {
          setIsARSupported(false);
          console.log('WebXR не поддерживается в этом браузере');
        }
      } catch (error) {
        console.error('Ошибка при проверке поддержки WebXR:', error);
        setIsARSupported(false);
      }
    };
    
    checkXRSupport();
  }, []);

  // Очистка ресурсов и URL объектов при закрытии вкладки
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('Очистка ресурсов при закрытии вкладки...');
      
      // Освобождаем URL объекты для всех моделей перед закрытием вкладки
      userModels.forEach(model => {
        try {
          if (model && model.url) {
            URL.revokeObjectURL(model.url);
            console.log(`URL объект для модели ${model.name} освобожден`);
          }
        } catch (error) {
          console.error('Ошибка при освобождении URL объекта:', error);
        }
      });
      
      // Очищаем хранилище localStorage, если не нужно сохранять между сессиями
      if (!persistModels) {
        localStorage.removeItem('userModels');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userModels, persistModels]);

  const handleEnterAR = () => {
    if (!isARSupported) {
      alert('WebXR AR не поддерживается на вашем устройстве. Пожалуйста, попробуйте использовать другой браузер или устройство с поддержкой AR.');
      return;
    }
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

    // Проверяем формат файла более надежным способом
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    // На мобильных устройствах тип может быть пустым или некорректным,
    // поэтому в первую очередь проверяем по расширению
    const isGLB = fileName.endsWith('.glb') || fileType.includes('model/gltf-binary');
    const isGLTF = fileName.endsWith('.gltf') || fileType.includes('model/gltf+json');
    
    // Если это мобильное устройство, доверяем input[accept] и не блокируем загрузку
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isValidFormat = isGLB || isGLTF || (isMobile && file.type === '');
    
    console.log('Загрузка файла:', { 
      fileName, 
      fileType, 
      isGLB, 
      isGLTF,
      isMobile,
      isValidFormat 
    });
    
    // На мобильных устройствах пропускаем проверку, если имя файла заканчивается на .glb или .gltf
    if (!isValidFormat && !(isMobile && (fileName.endsWith('.glb') || fileName.endsWith('.gltf')))) {
      alert(`Пожалуйста, выберите файл формата .glb или .gltf. \nТекущий формат: ${fileType || 'неизвестен'}`);
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
      const blob = new Blob([contents], { 
        type: file.type || (fileName.endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json') 
      });
      const url = URL.createObjectURL(blob);
      
      console.log('Модель успешно подготовлена:', { url, name: file.name });
      
      try {
        // Сохраняем URL модели в Redux store с уникальным идентификатором
        const modelId = uuidv4();
        
        const newModel = {
          name: file.name,
          url: url,
          id: modelId
        };
        
        dispatch(addUserModel(newModel));
        console.log('Модель добавлена в хранилище:', newModel);
      
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
      } catch (error) {
        console.error('Ошибка при добавлении модели в хранилище:', error);
        
        // Удаляем индикатор загрузки
        if (loadingNotification.parentNode) {
          loadingNotification.parentNode.removeChild(loadingNotification);
        }
        
        alert('Произошла ошибка при загрузке модели. Попробуйте другой файл.');
      }
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