import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './RegisterLogin.css';
import { login as loginUser } from '../services/auth';

function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('+375-');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Предотвращение прокрутки
  useEffect(() => {
    // Добавляем правильный класс для root блока
    const rootElement = document.querySelector('.register-login-root');
    
    if (rootElement) {
      if (document.body.classList.contains('mobile-layout')) {
        rootElement.classList.add('mobile');
      } else {
        rootElement.classList.add('desktop');
      }
    }
    
    const checkScrollNeeded = () => {
      const contentHeight = document.querySelector('.register-login-root')?.scrollHeight || 0;
      const viewportHeight = window.innerHeight;
      
      if (contentHeight <= viewportHeight) {
        document.documentElement.classList.add('no-scroll');
        document.body.classList.add('no-scroll');
      } else {
        document.documentElement.classList.remove('no-scroll');
        document.body.classList.remove('no-scroll');
      }
    };

    checkScrollNeeded();
    window.addEventListener('resize', checkScrollNeeded);
    window.addEventListener('load', checkScrollNeeded);
    
    return () => {
      window.removeEventListener('resize', checkScrollNeeded);
      window.removeEventListener('load', checkScrollNeeded);
      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    };
  }, []);

  // Функция форматирования номера телефона
  function formatPhone(value) {
    // Если пользователь пытается удалить или изменить префикс, всегда возвращаем '+375-'
    if (!value.startsWith('+375-')) return '+375-';
    let digits = value.replace(/\D/g, '');
    // Оставляем только 9 цифр после кода страны
    digits = digits.slice(3, 12);
    let formatted = '+375-';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += '-' + digits.slice(2, 5);
    if (digits.length > 5) formatted += '-' + digits.slice(5, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
    return formatted;
  }

  // Функция для отправки данных на сервер
  const handleLogin = async () => {
    if (!phone || phone === '+375-' || !password) {
      setError('Пожалуйста, заполните обязательные поля');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Преобразуем номер к формату для БД: +375-XX-XXX-XX-XX => +375XXXXXXXXX
      const login = phone.replace(/\D/g, '');
      console.log('Отправляемые данные:', { login, password });
      
      // Используем сервис авторизации
      const userData = await loginUser({ login, password });
      
      navigate('/');
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      setError(error.message || 'Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка нажатия Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="register-login-root">
      <div className="register-login-logo">Рестик</div>
      <div className="login-container">
        <div className="login-form">
          <h2>Вход</h2>
          <input 
            className="login-input" 
            type="text" 
            placeholder="Номер телефона *" 
            value={phone} 
            onChange={e => setPhone(formatPhone(e.target.value))} 
            maxLength={17}
            onKeyPress={handleKeyPress}
          />
          <input 
            className="login-input" 
            type="password" 
            placeholder="Пароль *" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          {error && <div className="error-message">{error}</div>}
          <button 
            className="login-btn" 
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
          <div style={{marginTop: '20px', fontSize: '0.9rem', color: '#666'}}>
            Нет аккаунта? <Link to="/register" style={{color: '#e16b5c', textDecoration: 'none', fontWeight: 'bold'}}>Зарегистрироваться</Link>
          </div>
          <div style={{marginTop: '10px', fontSize: '0.8rem', color: '#777'}}>
            Тестовый аккаунт: телефон - +375-29-123-45-67, пароль - password
          </div>
        </div>
      </div>
      <div className="login-footer"></div>
    </div>
  );
}

export default LoginPage; 