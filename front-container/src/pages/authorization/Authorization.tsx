import React, { useState } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setToken } from '../../store/authSlice';
import './Authorization.css';

interface AuthorizationProps {
  onEnterWithoutRegistration: () => void;
}

function Authorization({ onEnterWithoutRegistration }: AuthorizationProps) {
  const dispatch = useAppDispatch();
  const [isLogin, setIsLogin] = useState(true);
/*
тестовые логин и пароль 
{
  "username": "testuser",
  "password": "123456"
}
*/

  const[email, setEmail] = useState('');
  const[password, setPassword] = useState('');
  const[error, setError] = useState('');

  const API_URL = 'http://localhost:3001';

  async function handleLogin(e: React.FormEvent){
    e.preventDefault();
    setError('');

    try{
      const response = await fetch(API_URL+'/api/auth/login',{
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: email,
          password: password
        })
      })
      const data = await response.json();
      
      if (response.ok && data.token) {
        // Сохраняем полученный токен в Redux
        dispatch(setToken(data.token));
      } else {
        setError(data.message || 'Ошибка авторизации');
      }
    } catch(error:any){
      console.error('Error during login:', error);
      setError('Ошибка соединения с сервером');
    }
  }

  async function handleRegister(e: React.FormEvent){
    e.preventDefault();
    setError('');

    try{
      const response = await fetch(API_URL + 'api/auth/register',{
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: email,
          password: password
        })
      })
      const data = await response.json();
      
      if (response.ok && data.token) {
        // Сохраняем полученный токен в Redux
        dispatch(setToken(data.token));
      } else {
        setError(data.message || 'Ошибка регистрации');
      }
    } catch(error:any){
      console.error('Error during registration:', error);
      setError('Ошибка соединения с сервером');
    }
  }

  return (
    <div className="App">
      <div className="App-header">
         Добро пожаловать в дополненную реальность!
      </div>
      <div className='App-body'>
        <div className={`sliding-background ${isLogin ? 'login-active' : 'register-active'}`}></div>
        {error && <div className="error-message">{error}</div>}
        {isLogin ? (
          <>
            <div 
              className='App-body-login'
              key="login-form"
            >
              <h1>Авторизация</h1>
              <input 
                className='App-body-login-input'
                type="email"
                placeholder='Example@gmail.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                />
              <input 
                className='App-body-login-input'
                type="password"
                placeholder='********'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                />
              <button 
                className='App-body-login-button'
                onClick={handleLogin}
                >Войти</button>
            </div>
            <h1 
              className='App-body-register-2'
              onClick={() => setIsLogin(false)}
              key="login-prompt"
              style={{animation: 'slide-in-right 0.5s ease'}}
            >
              Еще не зарегистрированы?
              <div 
                style={{fontSize: '1.4vh', fontWeight: '550'}}
              >Нажмите, чтобы зарегистрироваться</div>
            </h1>
          </>
        ) : (
          <>
            <h1 
              className='App-body-register-2'
              onClick={() => {
                setEmail('')
                setPassword('')
                setIsLogin(true)
              }}
              key="register-prompt"
              style={{animation: 'slide-in-left 0.5s ease'}}
            >
              Уже зарегистрированы?
              <div 
                style={{fontSize: '1.4vh', fontWeight: '550'}}
              >Нажмите, чтобы войти</div>
            </h1>
            <div 
              className='App-body-register' 
              key="register-form"
            >
              <h1>Регистрация</h1>
              <input
                className='App-body-login-input'
                type="email"
                placeholder='Example@gmail.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                />
              <input
                className='App-body-login-input'
                type="password"
                placeholder='********'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                />
              <button
                className='App-body-login-button'
                onClick={handleRegister}
                >Зарегистрироваться</button>
            </div>
          </>
        )}
      </div>
      <button
        className='App-enter-without-registration'
        onClick={onEnterWithoutRegistration}
        >Войти без регистрации</button>
    </div>
  );
}

export default Authorization; 