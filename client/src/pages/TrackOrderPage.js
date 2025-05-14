import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPackage, FiChevronLeft, FiAlertCircle, FiCheckCircle, FiX, FiPhone, FiHash } from 'react-icons/fi';
import { ordersApi } from '../services/api';
import './TrackOrderPage.css';

function TrackOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manualOrderId, setManualOrderId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchMode, setSearchMode] = useState('id'); // 'id' или 'phone'
  const [orders, setOrders] = useState([]);
  const [showOrdersList, setShowOrdersList] = useState(false);

  // Загрузка данных заказа или проверка localStorage
  useEffect(() => {
    // Временно попробуем проверить доступность API-эндпоинта
    const checkApiEndpoint = async () => {
      try {
        // Проверим работу API и структуру маршрутов
        const response = await fetch(`${ordersApi.API_URL || 'http://localhost:3001/api'}`);
        console.log('API root response status:', response.status);
        
        // Получим и выведем доступные маршруты, если сервер поддерживает такой endpoint
        try {
          const apiInfo = await fetch(`${ordersApi.API_URL || 'http://localhost:3001/api'}/routes`);
          if (apiInfo.ok) {
            const routes = await apiInfo.json();
            console.log('Available API routes:', routes);
          }
        } catch (routesErr) {
          console.log('API routes info not available');
        }
      } catch (err) {
        console.error('Error checking API status:', err);
      }
    };
    
    // Запустим проверку API
    checkApiEndpoint();

    if (orderId) {
      console.log('Order ID from URL params:', orderId);
      
      // Проверяем, является ли orderId допустимым значением
      if (orderId.trim() === '') {
        setError('Указан пустой номер заказа');
        setLoading(false);
        return;
      }
      
      fetchOrderData(orderId);
    } else {
      // Проверяем наличие последнего заказа в localStorage
      const lastOrderId = localStorage.getItem('last_order_id');
      if (lastOrderId) {
        console.log('Found last order ID in localStorage:', lastOrderId);
        navigate(`/track/${lastOrderId}`);
        return;
      }
      
      setLoading(false);
    }
  }, [orderId, navigate]);

  // Функция загрузки данных заказа по ID
  const fetchOrderData = async (id) => {
    try {
      setLoading(true);
      setError('');
      console.log('Attempting to fetch order with ID:', id, 'Type:', typeof id);
      
      // Проверяем формат ID
      if (id && isNaN(Number(id))) {
        console.warn('Order ID is not a valid number:', id);
      }
      
      const response = await ordersApi.trackOrder(id);
      console.log('Server response:', response);

      // Обработка ответа - проверяем разные форматы
      if (response && (response.success === true) && response.order) {
        // Формат: {success: true, order: {...}}
        setOrderData(response.order);
      } else if (response && response.id && response.status) {
        // Если ответ сам по себе является заказом (нет обертки success/order)
        setOrderData(response);
      } else if (response && response.success === false) {
        // Если есть явная ошибка
        setError(response.message || 'Не удалось загрузить информацию о заказе.');
      } else {
        setError('Не удалось загрузить информацию о заказе. Проверьте правильность номера.');
      }
    } catch (err) {
      console.error('Ошибка при загрузке заказа:', err);
      setError('Ошибка при загрузке заказа: Заказ не найден или номер указан неправильно. Проверьте правильность номера.');
    } finally {
      setLoading(false);
    }
  };

  // Функция поиска заказов по номеру телефона
  const fetchOrdersByPhone = async (phone) => {
    try {
      setLoading(true);
      setError('');
      
      // Удаляем все нецифровые символы из номера телефона
      const formattedPhone = phone.replace(/\D/g, '');
      
      const response = await ordersApi.findOrdersByPhone(formattedPhone);
      console.log('Server response for phone search:', response);

      // Обработка разных форматов ответа
      if (response && response.success && Array.isArray(response.orders) && response.orders.length > 0) {
        // Стандартный формат с обёрткой
        setOrders(response.orders);
        setShowOrdersList(true);
      } else if (response && Array.isArray(response) && response.length > 0) {
        // Массив заказов без обёртки
        setOrders(response);
        setShowOrdersList(true);
      } else if (response && response.success === false) {
        // Явная ошибка
        setError(response.message || 'Не найдено заказов с указанным номером телефона.');
        setShowOrdersList(false);
      } else {
        setError('Не найдено заказов с указанным номером телефона.');
        setShowOrdersList(false);
      }
    } catch (err) {
      console.error('Ошибка при поиске заказов:', err);
      setError('Ошибка при поиске заказов. Пожалуйста, попробуйте позже.');
      setShowOrdersList(false);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик поиска заказа
  const handleSearch = (e) => {
    e.preventDefault();
    
    if (searchMode === 'id') {
      if (manualOrderId.trim()) {
        navigate(`/track/${manualOrderId.trim()}`);
      }
    } else {
      if (phoneNumber.trim()) {
        fetchOrdersByPhone(phoneNumber.trim());
      }
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Получить класс для статуса заказа
  const getStatusClass = (status) => {
    switch (status) {
      case 'Новый': return 'status-new';
      case 'Принят': return 'status-accepted';
      case 'Готовится': return 'status-preparing';
      case 'В пути': return 'status-delivery';
      case 'Доставлен': return 'status-completed';
      case 'Отменен': return 'status-cancelled';
      default: return '';
    }
  };

  // Получаем шаг прогресса выполнения заказа
  const getOrderProgress = (status) => {
    switch (status) {
      case 'Новый': return 1;
      case 'Принят': return 2;
      case 'Готовится': return 3;
      case 'В пути': return 4;
      case 'Доставлен': return 5;
      case 'Отменен': return 0;
      default: return 0;
    }
  };

  return (
    <div className="track-page-block">
      <div className="track-title">Отслеживание заказа</div>
      
      {error && (
        <div className="track-error-message">
          <FiAlertCircle className="track-error-icon" />
          <span>{error}</span>
          <button 
            className="track-close-error-btn" 
            onClick={() => setError('')}
          >
            <FiX />
          </button>
        </div>
      )}
      
      <div className="track-form-container">
        <div className="track-search-toggle">
          <button 
            className={`track-toggle-btn ${searchMode === 'id' ? 'active' : ''}`} 
            onClick={() => setSearchMode('id')}
          >
            <FiHash /> По номеру заказа
          </button>
          <button 
            className={`track-toggle-btn ${searchMode === 'phone' ? 'active' : ''}`} 
            onClick={() => setSearchMode('phone')}
          >
            <FiPhone /> По номеру телефона
          </button>
        </div>
        
        <form className="track-form" onSubmit={handleSearch}>
          {searchMode === 'id' ? (
            <>
              <label htmlFor="orderId">Номер заказа</label>
              <div className="track-input-wrapper">
                <input 
                  type="text" 
                  id="orderId" 
                  value={manualOrderId} 
                  onChange={(e) => setManualOrderId(e.target.value)} 
                  placeholder="Введите номер заказа" 
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  className="track-submit-btn" 
                  disabled={loading || !manualOrderId.trim()}
                >
                  Отследить
                </button>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="phoneNumber">Номер телефона</label>
              <div className="track-input-wrapper">
                <input 
                  type="text" 
                  id="phoneNumber" 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)} 
                  placeholder="Введите номер телефона" 
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  className="track-submit-btn" 
                  disabled={loading || !phoneNumber.trim()}
                >
                  Найти заказы
                </button>
              </div>
            </>
          )}
        </form>
      </div>
      
      {loading ? (
        <div className="track-loading">
          <div className="track-spinner"></div>
          <p>Загрузка информации о заказе...</p>
        </div>
      ) : showOrdersList && orders.length > 0 ? (
        <div className="track-orders-list">
          <h3>Найденные заказы:</h3>
          <ul className="orders-list">
            {orders.map(order => (
              <li key={order.id} className="order-list-item">
                <div className="order-list-header">
                  <span className="order-list-id">Заказ #{order.id}</span>
                  <span className={`order-list-status ${getStatusClass(order.status)}`}>{order.status}</span>
                </div>
                <div className="order-list-date">
                  {formatDate(order.order_date)}
                </div>
                <div className="order-list-total">
                  Сумма: {order.total_cost.toFixed(2)} BYN
                </div>
                <button 
                  className="view-order-btn"
                  onClick={() => navigate(`/track/${order.id}`)}
                >
                  Подробнее
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : orderData ? (
        <div className="track-order-container">
          <div className="track-order-header">
            <div className="track-order-title">
              <h2>Заказ #{orderData.id}</h2>
              <span className="track-order-date">{formatDate(orderData.order_date)}</span>
            </div>
            <div className={`track-order-status ${getStatusClass(orderData.status)}`}>
              {orderData.status}
            </div>
          </div>
          
          {orderData.status !== 'Отменен' && (
            <div className="track-progress-container">
              <div className="track-progress-bar">
                <div 
                  className="track-progress-fill" 
                  style={{ width: `${(getOrderProgress(orderData.status) / 5) * 100}%` }}
                ></div>
              </div>
              <div className="track-progress-steps">
                <div className={`track-progress-step ${getOrderProgress(orderData.status) >= 1 ? 'active' : ''}`}>
                  <div className="track-step-dot"></div>
                  <span>Новый</span>
                </div>
                <div className={`track-progress-step ${getOrderProgress(orderData.status) >= 2 ? 'active' : ''}`}>
                  <div className="track-step-dot"></div>
                  <span>Принят</span>
                </div>
                <div className={`track-progress-step ${getOrderProgress(orderData.status) >= 3 ? 'active' : ''}`}>
                  <div className="track-step-dot"></div>
                  <span>Готовится</span>
                </div>
                <div className={`track-progress-step ${getOrderProgress(orderData.status) >= 4 ? 'active' : ''}`}>
                  <div className="track-step-dot"></div>
                  <span>В пути</span>
                </div>
                <div className={`track-progress-step ${getOrderProgress(orderData.status) >= 5 ? 'active' : ''}`}>
                  <div className="track-step-dot"></div>
                  <span>Доставлен</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="track-order-details">
            <h3>Состав заказа</h3>
            <ul className="track-order-items">
              {orderData.items.map((item, index) => (
                <li key={index} className="track-order-item">
                  <div className="track-item-name">
                    {item.name} <span className="track-item-qty">x{item.quantity}</span>
                  </div>
                  <div className="track-item-composition">{item.composition}</div>
                </li>
              ))}
            </ul>
            <div className="track-order-total">
              <span>Итого:</span>
              <span>{orderData.total_cost.toFixed(2)} BYN</span>
            </div>
          </div>
          
          <div className="track-actions">
            <button 
              className="track-back-btn" 
              onClick={() => navigate('/order')}
            >
              <FiChevronLeft /> Вернуться к меню
            </button>
          </div>
        </div>
      ) : orderId ? (
        <div className="track-not-found">
          <FiPackage className="track-not-found-icon" />
          <h2>Заказ не найден</h2>
          <p>Проверьте номер заказа и попробуйте снова</p>
          <button 
            className="track-back-btn" 
            onClick={() => navigate('/order')}
          >
            <FiChevronLeft /> Вернуться к меню
          </button>
        </div>
      ) : (
        <div className="track-instructions">
          <FiPackage className="track-instructions-icon" />
          <h2>Отслеживание заказа</h2>
          <p>Введите номер вашего заказа или номер телефона, чтобы узнать статус заказа</p>
        </div>
      )}
    </div>
  );
}

export default TrackOrderPage; 