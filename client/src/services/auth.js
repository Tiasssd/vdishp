import { authApi } from './api';
import { cartApi } from './api';

// Ключ для хранения данных пользователя в localStorage
const USER_STORAGE_KEY = 'user';

// Получение данных пользователя из localStorage
export const getUser = () => {
  const userJson = localStorage.getItem(USER_STORAGE_KEY);
  if (userJson) {
    try {
      return JSON.parse(userJson);
    } catch (error) {
      console.error('Ошибка при парсинге данных пользователя:', error);
      return null;
    }
  }
  return null;
};

// Проверка авторизации пользователя
export const isAuthenticated = () => {
  return !!getUser();
};

// Проверка, является ли пользователь администратором
export const isAdmin = () => {
  const user = getUser();
  return user && user.role === 'admin';
};

// Авторизация пользователя
export const login = async (credentials) => {
  try {
    const response = await authApi.login(credentials);
    if (response.success && response.user) {
      // Сохраняем данные пользователя
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      
      // Объединяем гостевую корзину с корзиной на сервере
      const userId = response.user.id;
      const guestCart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      
      // Если в гостевой корзине есть товары, добавляем их в корзину пользователя
      if (guestCart.length > 0) {
        for (const item of guestCart) {
          try {
            await cartApi.addToCart({
              user_id: userId,
              dish_id: item.dish_id,
              quantity: item.quantity
            });
          } catch (e) {
            console.error('Ошибка при синхронизации корзин:', e);
          }
        }
        
        // Удаляем гостевую корзину
        localStorage.removeItem('cart_guest');
      }
      
      // Генерируем события для обновления компонентов
      window.dispatchEvent(new Event('cartUpdated'));
      window.dispatchEvent(new Event('authChanged'));
      
      // Для синхронизации между вкладками
      try {
        // В некоторых браузерах localStorage может быть недоступен или ограничен
        localStorage.setItem('__last_action', 'login_' + Date.now());
        localStorage.removeItem('__last_action');
      } catch (e) {
        console.error('Ошибка синхронизации между вкладками:', e);
      }
      
      return response.user;
    }
    throw new Error(response.message || 'Ошибка при авторизации');
  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    throw error;
  }
};

// Регистрация пользователя
export const register = async (userData) => {
  try {
    return await authApi.register(userData);
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    throw error;
  }
};

// Выход из системы
export const logout = () => {
  // При выходе просто удаляем данные пользователя из localStorage
  // Корзина остается на сервере и будет доступна при следующем входе
  localStorage.removeItem(USER_STORAGE_KEY);
  
  // Генерируем события для обновления компонентов
  window.dispatchEvent(new Event('cartUpdated'));
  window.dispatchEvent(new Event('authChanged'));
};

// Обновление профиля пользователя
export const updateProfile = async (userId, profileData) => {
  try {
    const response = await authApi.updateProfile(userId, profileData);
    if (response.success) {
      // Обновляем данные пользователя в localStorage
      const user = getUser();
      if (user && user.id === userId) {
        // Дополняем обновление поддержкой email
        const updatedUser = { 
          ...user, 
          ...profileData,
          email: profileData.email || user.email // Добавляем email в обновляемые данные
        };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      }
      return response;
    } else {
      // Если сервер вернул ошибку, передаем её дальше
      throw new Error(response.message || 'Ошибка при обновлении профиля');
    }
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    throw error;
  }
};

export default {
  getUser,
  isAuthenticated,
  isAdmin,
  login,
  register,
  logout,
  updateProfile
}; 