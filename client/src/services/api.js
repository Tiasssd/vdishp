const API_URL = 'https://vdishp.onrender.com/api';

// Для сохранения найденных рабочих эндпоинтов
let workingTrackEndpoint = null;
let workingPhoneSearchEndpoint = null;

// Базовая функция для выполнения запросов
const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `Ошибка сервера (${response.status}: ${response.statusText})`
      }));
      throw new Error(errorData.message || `Ошибка соединения с сервером: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Ошибка API при обращении к ${endpoint}:`, error);
    // Если это ошибка сети (например, сервер недоступен)
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Не удалось соединиться с сервером. Проверьте подключение к интернету.');
    }
    throw error; // Передаем ошибку дальше
  }
};

// Функция для загрузки файлов (без Content-Type: application/json)
const uploadFile = async (endpoint, formData, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `Ошибка сервера при загрузке файла (${response.status}: ${response.statusText})`
      }));
      throw new Error(errorData.message || `Ошибка соединения с сервером при загрузке файла: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Ошибка API при загрузке файла на ${endpoint}:`, error);
    // Если это ошибка сети (например, сервер недоступен)
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Не удалось соединиться с сервером при загрузке файла. Проверьте подключение к интернету.');
    }
    throw error; // Передаем ошибку дальше
  }
};

// API для категорий блюд
export const categoriesApi = {
  // Получить все категории
  getAll: () => fetchApi('/categories'),
};

// API для блюд
export const dishesApi = {
  // Получить все блюда
  getAll: () => fetchApi('/dishes'),
  
  // Получить блюда по категории
  getByCategory: (categoryId) => fetchApi(`/dishes/category/${categoryId}`),
  
  // Удалить блюдо (только для администратора)
  deleteDish: (dishId, role) => fetchApi(`/dishes/${dishId}?role=${role}`, {
    method: 'DELETE',
  }),
  
  // Создать новое блюдо (только для администратора)
  createDish: (dishData, role) => fetchApi('/dishes?role=' + role, {
    method: 'POST',
    body: JSON.stringify(dishData),
  }),
  
  // Обновить существующее блюдо (только для администратора)
  updateDish: (dishId, dishData, role) => fetchApi(`/dishes/${dishId}?role=${role}`, {
    method: 'PUT',
    body: JSON.stringify(dishData),
  }),
  
  // Загрузить изображение блюда
  uploadImage: (file, role) => {
    const formData = new FormData();
    formData.append('image', file);
    return uploadFile(`/upload/dish-image?role=${role}`, formData);
  },
};

// API для аутентификации
export const authApi = {
  // Войти в систему
  login: (credentials) => {
    console.log('authApi.login вызван с данными:', credentials);
    return fetchApi('/auth', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  
  // Зарегистрироваться
  register: (userData) => fetchApi('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  
  // Обновить профиль пользователя
  updateProfile: (userId, profileData) => {
    console.log('authApi.updateProfile вызван с данными:', { userId, profileData });
    return fetchApi(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// API для заказов
export const ordersApi = {
  // Создать новый заказ
  create: (orderData) => fetchApi('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  }),
  
  // Получить заказы пользователя
  getUserOrders: (userId) => fetchApi(`/orders/user/${userId}`),
  
  // Получить детали заказа
  getOrderDetails: (orderId) => fetchApi(`/orders/${orderId}`),
  
  // Получить все заказы (только для администратора)
  getAllOrders: (role) => fetchApi(`/orders?role=${role}`),
  
  // Обновить статус заказа (только для администратора)
  updateOrderStatus: (orderId, status, role) => fetchApi(`/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, role }),
  }),
  
  // Получить возможные статусы заказа
  getValidStatuses: () => {
    return [
      'Новый',
      'Принят',
      'Готовится',
      'В пути', 
      'Доставлен',
      'Отменен'
    ];
  },
  
  // Отслеживание заказа (публичный доступ без авторизации)
  trackOrder: async (orderId) => {
    try {
      // Проверяем и преобразуем orderId
      const sanitizedOrderId = String(orderId).trim();
      console.log('Tracking order with sanitized ID:', sanitizedOrderId);
      
      // Если у нас уже есть рабочий эндпоинт, используем его сразу
      if (workingTrackEndpoint) {
        console.log(`Using previously found working endpoint: ${workingTrackEndpoint}`);
        const directEndpoint = workingTrackEndpoint.replace(':id', sanitizedOrderId);
        try {
          const response = await fetch(`${API_URL}${directEndpoint}`);
          if (response.ok) {
            const data = await response.json();
            console.log('Server response for order tracking:', data);
            return data;
          }
        } catch (err) {
          console.log('Previously saved endpoint no longer works, trying alternatives');
          workingTrackEndpoint = null; // Сбрасываем, если перестал работать
        }
      }
      
      // Попробуем возможные варианты эндпоинтов (на случай если маршрут неправильный)
      let response = null;
      let endpointSuccess = false;
      let successfulEndpoint = '';
      
      // Массив возможных маршрутов для проверки
      const possibleEndpoints = [
        `/orders/track/${sanitizedOrderId}`,
        `/track/${sanitizedOrderId}`,
        `/orders/${sanitizedOrderId}`,
        `/orders/${sanitizedOrderId}/track`,
        `/track/order/${sanitizedOrderId}`
      ];
      
      // Пробуем каждый маршрут по очереди
      for (const endpoint of possibleEndpoints) {
        console.log(`Trying endpoint: ${API_URL}${endpoint}`);
        try {
          response = await fetch(`${API_URL}${endpoint}`);
          
          // Если получили успешный ответ с JSON, используем его
          if (response.ok && 
              response.headers.get('content-type') && 
              response.headers.get('content-type').includes('application/json')) {
            endpointSuccess = true;
            successfulEndpoint = endpoint;
            console.log(`Found working endpoint: ${endpoint}`);
            break;
          }
        } catch (endpointErr) {
          console.log(`Endpoint ${endpoint} failed:`, endpointErr.message);
        }
      }
      
      if (!endpointSuccess || !response) {
        return { 
          success: false, 
          message: 'Не удалось найти работающий API-эндпоинт для отслеживания заказа. Обратитесь к администратору.' 
        };
      }
      
      // Сохраняем рабочий эндпоинт для будущих запросов
      // Приводим к шаблонному виду для последующего использования
      workingTrackEndpoint = successfulEndpoint.replace(sanitizedOrderId, ':id');
      console.log('Saving endpoint template for future use:', workingTrackEndpoint);
      
      const data = await response.json();
      console.log('Server response for order tracking:', data);
      return data;
    } catch (error) {
      console.error('Error tracking order:', error);
      return { 
        success: false, 
        message: 'Ошибка при отслеживании заказа. Проверьте работу сервера.' 
      };
    }
  },

  // Поиск заказов по номеру телефона
  findOrdersByPhone: async (phone) => {
    try {
      // Если у нас уже есть рабочий эндпоинт для поиска по телефону, используем его
      if (workingPhoneSearchEndpoint) {
        console.log(`Using previously found phone search endpoint: ${workingPhoneSearchEndpoint}`);
        const directEndpoint = workingPhoneSearchEndpoint.replace(':phone', phone);
        try {
          const response = await fetch(`${API_URL}${directEndpoint}`);
          if (response.ok) {
            const data = await response.json();
            console.log('Server response for phone search:', data);
            return data;
          }
        } catch (err) {
          console.log('Previously saved phone search endpoint no longer works, trying alternatives');
          workingPhoneSearchEndpoint = null;
        }
      }

      // Попробуем возможные варианты эндпоинтов для поиска по телефону
      let response = null;
      let endpointSuccess = false;
      let successfulEndpoint = '';
      
      // Массив возможных маршрутов для проверки
      const possibleEndpoints = [
        `/orders/by-phone/${phone}`,
        `/orders/phone/${phone}`,
        `/orders/search?phone=${phone}`,
        `/search/orders?phone=${phone}`,
        `/orders?phone=${phone}`
      ];
      
      for (const endpoint of possibleEndpoints) {
        console.log(`Trying phone search endpoint: ${API_URL}${endpoint}`);
        try {
          response = await fetch(`${API_URL}${endpoint}`);
          
          if (response.ok && 
              response.headers.get('content-type') && 
              response.headers.get('content-type').includes('application/json')) {
            endpointSuccess = true;
            successfulEndpoint = endpoint;
            console.log(`Found working phone search endpoint: ${endpoint}`);
            break;
          }
        } catch (endpointErr) {
          console.log(`Phone search endpoint ${endpoint} failed:`, endpointErr.message);
        }
      }
      
      if (!endpointSuccess || !response) {
        return { 
          success: false, 
          message: 'Не удалось найти работающий API для поиска заказов по телефону' 
        };
      }
      
      // Сохраняем рабочий эндпоинт для будущих запросов
      if (successfulEndpoint.includes(phone)) {
        workingPhoneSearchEndpoint = successfulEndpoint.replace(phone, ':phone');
        console.log('Saving phone search endpoint template:', workingPhoneSearchEndpoint);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error finding orders by phone:', error);
      return { success: false, message: 'Ошибка при поиске заказов' };
    }
  },
};

// API для корзины
export const cartApi = {
  // Получить корзину пользователя
  getCart: (userId) => fetchApi(`/cart/${userId}`),
  
  // Добавить товар в корзину
  addToCart: (cartData) => fetchApi('/cart', {
    method: 'POST',
    body: JSON.stringify(cartData),
  }),
  
  // Изменить количество товара в корзине
  updateQuantity: (cartId, quantity) => fetchApi(`/cart/${cartId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  }),
  
  // Удалить товар из корзины
  removeFromCart: (userId, dishId) => fetchApi(`/cart/${userId}/${dishId}`, {
    method: 'DELETE',
  }),
  
  // Очистить всю корзину пользователя
  clearCart: (userId) => fetchApi(`/cart/${userId}`, {
    method: 'DELETE',
  }),
};

export default {
  categories: categoriesApi,
  dishes: dishesApi,
  auth: authApi,
  orders: ordersApi,
  cart: cartApi,
}; 