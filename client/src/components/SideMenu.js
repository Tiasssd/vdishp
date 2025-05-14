import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiLogIn, FiUserPlus, FiShoppingBag, FiInfo, FiX, FiLogOut, FiSettings, FiUser, FiPackage } from 'react-icons/fi';
import { isAuthenticated, logout, isAdmin } from '../services/auth';

const menuItems = [
  { label: 'Главная', path: '/', icon: FiHome },
  { label: 'Войти', path: '/login', icon: FiLogIn, authHide: true },
  { label: 'Регистрация', path: '/register', icon: FiUserPlus, authHide: true },
  { label: 'Сделать заказ', path: '/order', icon: FiShoppingBag },
  { label: 'Отследить заказ', path: '/track', icon: FiPackage, authHide: true },
  { label: 'О нас', path: '/about', icon: FiInfo },
];

function SideMenu({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuth, setIsAuth] = useState(isAuthenticated());
  const [isUserAdmin, setIsUserAdmin] = useState(isAdmin());
  const [animation, setAnimation] = useState(false);

  // Обновляем статус авторизации при изменении пути
  useEffect(() => {
    setIsAuth(isAuthenticated());
    setIsUserAdmin(isAdmin());
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      setAnimation(true);
      document.body.style.overflow = 'hidden';
      // Обновляем статус авторизации при открытии меню
      setIsAuth(isAuthenticated());
      setIsUserAdmin(isAdmin());
    } else {
      setTimeout(() => setAnimation(false), 300);
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    setIsAuth(false);
    onClose();
    navigate('/');
  };

  const filteredItems = menuItems.filter(item => !item.authHide || !isAuth);

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div 
      className={`side-menu ${open ? 'open' : ''} ${animation ? 'animate' : ''}`}
      onClick={onClose}
    >
      <div 
        className={`side-menu-content ${open ? 'open' : ''}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="side-menu-header">
          <h2 className="side-menu-title">Меню</h2>
          <button className="side-menu-close" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="side-menu-items">
          {filteredItems.map(item => (
            <div
              key={item.path}
              className={`side-menu-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              <item.icon className="side-menu-icon" />
              <span>{item.label}</span>
            </div>
          ))}
          
          {/* Пункт меню для администраторов */}
          {isUserAdmin && (
            <div
              className={`side-menu-item ${isActive('/admin') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin')}
            >
              <FiSettings className="side-menu-icon" />
              <span>Панель администратора</span>
            </div>
          )}
          
          {/* Пункт меню для профиля */}
          {isAuth && (
            <div
              className={`side-menu-item ${isActive('/profile') ? 'active' : ''}`}
              onClick={() => handleNavigation('/profile')}
            >
              <FiUser className="side-menu-icon" />
              <span>Личный кабинет</span>
            </div>
          )}
          
          {isAuth && (
            <div
              className="side-menu-item side-menu-logout"
              onClick={handleLogout}
            >
              <FiLogOut className="side-menu-icon" />
              <span>Выйти</span>
            </div>
          )}
        </div>
        
        <div className="side-menu-footer">
          <p>Рестик &copy; 2025</p>
        </div>
      </div>
    </div>
  );
}

export default SideMenu; 