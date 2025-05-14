import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './RegisterLogin.css';

function RegisterPage() {
  const [phone, setPhone] = useState('+375-');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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

  const handleRegister = async () => {
    setError('');
    if (!phone || phone === '+375-' || !name || !address || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    
    setIsLoading(true);
    
    // Преобразуем номер к формату для БД: +375-XX-XXX-XX-XX => +375XXXXXXXXX
    const login = phone.replace(/\D/g, '');
    try {
      const res = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password, address, name })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('auth', '1');
        navigate('/login');
      } else {
        setError(data.message || 'Ошибка регистрации');
      }
    } catch (e) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка нажатия Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRegister();
    }
  };

  return (
    <div className="register-login-root">
      <div className="register-login-logo">Рестик</div>
      <div className="login-container">
        <div className="register-form">
          <h2>Регистрация</h2>
          <input 
            className="login-input" 
            type="text" 
            placeholder="Номер телефона" 
            value={phone} 
            onChange={e => setPhone(formatPhone(e.target.value))} 
            maxLength={17}
            onKeyPress={handleKeyPress}
          />
          <input 
            className="login-input" 
            type="text" 
            placeholder="Имя" 
            value={name} 
            onChange={e => setName(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <input 
            className="login-input" 
            type="text" 
            placeholder="Адрес" 
            value={address} 
            onChange={e => setAddress(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <input 
            className="login-input" 
            type="password" 
            placeholder="Пароль" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          {error && <div className="error-message">{error}</div>}
          <button 
            className="login-btn" 
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
          <div style={{marginTop: '20px', fontSize: '0.9rem', color: '#666'}}>
            Уже есть аккаунт? <Link to="/login" style={{color: '#e16b5c', textDecoration: 'none', fontWeight: 'bold'}}>Войти</Link>
          </div>
        </div>
      </div>
      <div className="login-footer"></div>
    </div>
  );
}

export default RegisterPage; 