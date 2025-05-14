import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { FiMenu } from 'react-icons/fi';
import MainPage from './pages/MainPage';
import AboutPage from './pages/AboutPage';
import OrderPage from './pages/OrderPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import SideMenu from './components/SideMenu';
import SideBar from './components/SideBar';
import { isAuthenticated, isAdmin } from './services/auth';
import TrackOrderPage from './pages/TrackOrderPage';
import './App.css';

// Компонент для защищенных маршрутов
function PrivateRoute({ children, isAuth }) {
  return isAuth ? children : <Navigate to="/login" />;
}

// Компонент для маршрутов, доступных только неавторизованным пользователям
function PublicOnlyRoute({ children, isAuth }) {
  return isAuth ? <Navigate to="/" /> : children;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAuth, setIsAuth] = useState(isAuthenticated());
  const location = useLocation();
  
  // Слушаем события аутентификации
  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuth(isAuthenticated());
    };
    
    window.addEventListener('authChanged', handleAuthChange);
    window.addEventListener('storage', function(e) {
      if (e.key === 'user' || e.key === null) {
        handleAuthChange();
      }
    });
    
    return () => {
      window.removeEventListener('authChanged', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);
  
  // Устанавливаем title страницы в зависимости от пути
  useEffect(() => {
    const titles = {
      '/': 'Рестик - Главная',
      '/about': 'О нас - Рестик',
      '/order': 'Заказать еду - Рестик',
      '/cart': 'Корзина - Рестик',
      '/login': 'Вход - Рестик',
      '/register': 'Регистрация - Рестик',
      '/admin': 'Админка - Рестик'
    };
    
    document.title = titles[location.pathname] || 'Рестик';
  }, [location]);
  
  // Отслеживаем размер окна для адаптивности
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      document.body.classList.toggle('mobile-layout', mobile);
      document.body.classList.toggle('desktop-layout', !mobile);
    };
    
    // Проверяем при монтировании
    checkMobile();
    
    // Добавляем слушатель на изменение размера
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`app-container ${isMobile ? 'mobile' : 'desktop'}`}>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main-wrapper">
        <header className="header">
          <span className="page-title">{document.title}</span>
        </header>
        <main className={menuOpen ? 'main-content blurred' : 'main-content'}>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/login" element={
              <PublicOnlyRoute isAuth={isAuth}>
                <LoginPage />
              </PublicOnlyRoute>
            } />
            <Route path="/register" element={
              <PublicOnlyRoute isAuth={isAuth}>
                <RegisterPage />
              </PublicOnlyRoute>
            } />
            <Route path="/admin" element={
              isAdmin() ? <AdminPage /> : <Navigate to="/" />
            } />
            <Route path="/profile" element={
              isAuth ? <ProfilePage /> : <Navigate to="/login" />
            } />
            <Route path="/track" element={<TrackOrderPage />} />
            <Route path="/track/:orderId" element={<TrackOrderPage />} />
          </Routes>
        </main>
      </div>
      <SideBar onMenuClick={() => setMenuOpen(!menuOpen)} />
    </div>
  );
}

export default App; 