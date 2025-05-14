import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiShoppingCart, FiHome, FiInfo, FiUser, FiLogOut, FiPackage } from 'react-icons/fi';
import { isAuthenticated, logout } from '../services/auth';

function SideBar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const hideCart = location.pathname === '/login' || location.pathname === '/register';
  const [hover, setHover] = useState(false);
  const [isMobile, setIsMobile] = useState(document.body.classList.contains('mobile-layout'));
  const [isAuth, setIsAuth] = useState(isAuthenticated());
  const [lastOrderId, setLastOrderId] = useState(null);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(document.body.classList.contains('mobile-layout'));
    };
    
    // Проверяем наличие последнего заказа в localStorage
    const storedOrderId = localStorage.getItem('last_order_id');
    if (storedOrderId) {
      setLastOrderId(storedOrderId);
    }
    
    // Наблюдаем за изменениями классов на body
    const observer = new MutationObserver(checkMobile);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    // Обновляем статус авторизации при изменении маршрута
    setIsAuth(isAuthenticated());
    
    // Обработчик события изменения авторизации
    const handleAuthChange = () => {
      setIsAuth(isAuthenticated());
    };
    
    // Подписываемся на события аутентификации
    window.addEventListener('authChanged', handleAuthChange);
    window.addEventListener('storage', function(e) {
      if (e.key === 'user' || e.key === null) {
        handleAuthChange();
      }
      // Обновляем ID последнего заказа при изменении localStorage
      if (e.key === 'last_order_id') {
        setLastOrderId(e.newValue);
      }
    });
    
    return () => {
      observer.disconnect();
      window.removeEventListener('authChanged', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [location.pathname]);
  
  // Обработчик выхода из системы
  const handleLogout = () => {
    logout();
    setIsAuth(false);
    navigate('/');
  };
  
  // Обработчик для отслеживания заказа
  const handleTrackOrder = () => {
    if (lastOrderId) {
      navigate(`/track/${lastOrderId}`);
    } else {
      navigate('/track');
    }
  };
  
  return (
    <div 
      className={`side-bar ${hover ? 'hovered' : ''}`}
      onMouseEnter={() => !isMobile && setHover(true)}
      onMouseLeave={() => !isMobile && setHover(false)}
      style={{ zIndex: 1000 }}
    >
      {!isMobile ? (
        // Десктопный вид (вертикальный)
        <>
          <div className="sidebar-top">
            <button 
              className="menu-btn sidebar-button" 
              onClick={onMenuClick}
            >
              <FiMenu className="side-bar-icon" />
              <span className="sidebar-tooltip">Меню</span>
            </button>
            
            <button 
              className="sidebar-button" 
              onClick={() => navigate('/')}
            >
              <FiHome className="side-bar-icon" />
              <span className="sidebar-tooltip">Главная</span>
            </button>
            
            <button 
              className="sidebar-button" 
              onClick={() => navigate('/about')}
            >
              <FiInfo className="side-bar-icon" />
              <span className="sidebar-tooltip">О нас</span>
            </button>
            
            {!isAuth && (
              <button 
                className="sidebar-button" 
                onClick={handleTrackOrder}
              >
                <FiPackage className="side-bar-icon" />
                <span className="sidebar-tooltip">
                  {lastOrderId ? "Мой заказ" : "Отследить заказ"}
                </span>
              </button>
            )}
            
            {/* Кнопка профиля для авторизованных пользователей */}
            {isAuth && (
              <button 
                className="sidebar-button" 
                onClick={() => navigate('/profile')}
              >
                <FiUser className="side-bar-icon" />
                <span className="sidebar-tooltip">Профиль</span>
              </button>
            )}
            
            {/* Кнопка входа или выхода в зависимости от статуса авторизации */}
            {isAuth ? (
              <button 
                className="sidebar-button" 
                onClick={handleLogout}
              >
                <FiLogOut className="side-bar-icon" />
                <span className="sidebar-tooltip">Выйти</span>
              </button>
            ) : (
              <button 
                className="sidebar-button" 
                onClick={() => navigate('/login')}
              >
                <FiUser className="side-bar-icon" />
                <span className="sidebar-tooltip">Войти</span>
              </button>
            )}
          </div>
          
          {!hideCart && (
            <div className="sidebar-bottom">
              <button 
                className="cart-btn sidebar-button" 
                onClick={() => navigate('/cart')}
              >
                <FiShoppingCart className="side-bar-icon" />
                <span className="sidebar-tooltip">Корзина</span>
              </button>
            </div>
          )}
        </>
      ) : (
        // Мобильный вид (горизонтальный)
        <>
          <button 
            className="sidebar-button" 
            onClick={() => navigate('/')}
          >
            <FiHome className="side-bar-icon" />
            <span className="sidebar-tooltip">Главная</span>
          </button>
          
          {!hideCart && (
            <button 
              className="cart-btn sidebar-button" 
              onClick={() => navigate('/cart')}
            >
              <FiShoppingCart className="side-bar-icon" />
              <span className="sidebar-tooltip">Корзина</span>
            </button>
          )}
          
          {!isAuth && (
            <button 
              className="sidebar-button" 
              onClick={handleTrackOrder}
            >
              <FiPackage className="side-bar-icon" />
              <span className="sidebar-tooltip">
                {lastOrderId ? "Мой заказ" : "Отследить"}
              </span>
            </button>
          )}
          
          {/* Кнопка профиля для авторизованных пользователей */}
          {isAuth && (
            <button 
              className="sidebar-button" 
              onClick={() => navigate('/profile')}
            >
              <FiUser className="side-bar-icon" />
              <span className="sidebar-tooltip">Профиль</span>
            </button>
          )}
          
          {/* Кнопка входа в зависимости от статуса авторизации (без кнопки выхода) */}
          {!isAuth && (
            <button 
              className="sidebar-button" 
              onClick={() => navigate('/login')}
            >
              <FiUser className="side-bar-icon" />
              <span className="sidebar-tooltip">Войти</span>
            </button>
          )}
          
          <button 
            className="menu-btn sidebar-button" 
            onClick={onMenuClick}
          >
            <FiMenu className="side-bar-icon" />
            <span className="sidebar-tooltip">Меню</span>
          </button>
        </>
      )}
    </div>
  );
}

export default SideBar; 