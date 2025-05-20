import React from 'react';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { setToken, setShowAR, isAuthorized } from './store/authSlice';
import Authorization from './pages/authorization/Authorization';
import Map from './pages/playground/Map';
import AR from './pages/playground/AR';
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
          )}
        </div>
      ) : (
        <div className="ar-view">
          <AR />
          <button
            onClick={handleExitAR}
            style={{
              position: 'fixed',
              top: '20px',
              left: '20px',
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              zIndex: 10000
            }}
          >
            Вернуться к карте
          </button>
        </div>
      )}
    </div>
  );
}

export default Main; 