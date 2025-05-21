import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { setToken, setShowAR, isAuthorized } from './store/authSlice';
import Authorization from './pages/authorization/Authorization';
import Map from './pages/playground/Map';
// @ts-ignore Игнорируем ошибку импорта .jsx файла
import AR, { startARSession } from './pages/playground/AR.jsx';
import './Main.css';

// Токен для неавторизованного входа (demo-доступ)
const DEMO_TOKEN = 'demo-token-no-permissions';

function Main() {
  const dispatch = useAppDispatch();
  const showAR = useAppSelector(state => state.auth.showAR);
  const authorized = useAppSelector(isAuthorized);

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
              <button
                onClick={handleEnterAR}
                style={{
                  position: 'fixed',
                  bottom: '20px',
                  right: '20px',
                  padding: '12px 24px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  zIndex: 100
                }}
              >
                Включить AR
              </button>
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