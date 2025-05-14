import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderModal from '../components/OrderModal';
import { isAuthenticated, getUser } from '../services/auth';

function MainPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(isAuthenticated());
  const [user, setUser] = useState(getUser());
  const navigate = useNavigate();
  
  // Обновляем состояние авторизации при монтировании
  useEffect(() => {
    setIsAuth(isAuthenticated());
    setUser(getUser());
  }, []);
  
  // Обработчик перехода к меню
  const handleOrderClick = () => {
    if (isAuth) {
      // Если пользователь авторизован, сразу переходим к меню
      navigate('/order');
    } else {
      // Иначе показываем модальное окно с выбором
      setModalOpen(true);
    }
  };
  
  return (
    <div className="brand-block main-page-block">
      <div className="brand-title">Рестик</div>
      <div className="main-content-wrapper">
        <div className="brand-features">
          <div>Самые лучшие блюда</div>
          <div>Самая быстрая сеть доставки еды</div>
          <div>Лучшие цены</div>
        </div>
        
        {isAuth ? (
          <div className="welcome-block">
            <div className="welcome-text">Добро пожаловать, {user?.name || 'Гость'}!</div>
            <button 
              className="order-button"
              onClick={() => navigate('/order')}
            >
              Перейти к меню
            </button>
          </div>
        ) : (
          <button 
            className="order-button"
            onClick={handleOrderClick}
          >
            Сделать заказ
          </button>
        )}
        
        <div className="order-block">
          <div>Сделать заказ по телефону:</div>
          <a className="order-phone" href="tel:+375257777899">+375 25-7777-88-99</a>
          <div className="order-operator">MTS life A1</div>
        </div>
      </div>
      <div className="footer-block">
        <div>С уважением:</div>
        <div>ЗАО «RestikGroup» © 2025</div>
      </div>
      
      <OrderModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

export default MainPage; 