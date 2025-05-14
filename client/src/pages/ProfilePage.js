import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiClock, FiPackage, FiSettings, FiChevronDown, FiChevronUp, FiAlertCircle, FiCheckCircle, FiX, FiEdit2 } from 'react-icons/fi';
import { getUser, isAuthenticated, updateProfile } from '../services/auth';
import { ordersApi } from '../services/api';
import './ProfilePage.css';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'history', 'profile'
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    address: '',
    email: ''
  });
  const navigate = useNavigate();

  // Проверяем авторизацию
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const userData = getUser();
    setUser(userData);
    setProfileData({
      name: userData.name || '',
      phone: userData.phone || '',
      address: userData.address || '',
      email: userData.email || ''
    });

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await ordersApi.getUserOrders(userData.id);
        
        // Обрабатываем ответ от API
        // Ваш реальный API возвращает orders без поля success
        if (response.orders) {
          // Сортируем заказы - сначала новые
          const sortedOrders = response.orders.sort((a, b) => 
            new Date(b.order_date) - new Date(a.order_date)
          );
          setOrders(sortedOrders);
        } else if (response.success === false) {
          // Явная ошибка от API
          setError('Не удалось загрузить заказы: ' + (response.message || 'Неизвестная ошибка'));
        } else {
          // Неожиданный формат ответа
          setError('Получен неверный формат данных от сервера');
          console.error('Неожиданный формат ответа:', response);
        }
      } catch (err) {
        console.error('Ошибка при загрузке заказов:', err);
        setError('Ошибка загрузки заказов: ' + (err.message || 'Неизвестная ошибка'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  // Обработчик изменения профиля
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(''); // Очищаем предыдущие ошибки
      setSuccess(''); // Очищаем предыдущие сообщения об успехе
      
      const response = await updateProfile(user.id, profileData);
      if (response.success) {
        setSuccess('Профиль успешно обновлен');
        setEditMode(false);
        
        // Обновляем локальные данные пользователя
        const updatedUser = { ...user, ...profileData };
        setUser(updatedUser);
      } else {
        setError('Не удалось обновить профиль: ' + (response.message || 'Неизвестная ошибка'));
      }
    } catch (err) {
      setError('Ошибка обновления профиля: ' + (err.message || 'Неизвестная ошибка'));
    }
  };

  // Обработчик изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Фильтрация активных заказов и истории
  const activeOrders = orders.filter(order => 
    ['Новый', 'Принят', 'Готовится', 'В пути'].includes(order.status)
  );
  
  const historyOrders = orders.filter(order => 
    ['Доставлен', 'Отменен'].includes(order.status)
  );

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

  // Раскрытие/сворачивание деталей заказа
  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  // Рендеринг карточки заказа
  const renderOrderCard = (order) => {
    const isExpanded = expandedOrderId === order.id;
    
    return (
      <div 
        key={order.id} 
        className={`profile-order-card status-${order.status}`}
      >
        <div className="profile-order-header" onClick={() => toggleOrderDetails(order.id)}>
          <div className="profile-order-title">
            <span className="profile-order-id">Заказ #{order.id}</span>
            <span className="profile-order-date">{formatDate(order.order_date)}</span>
          </div>
          <div className="profile-order-info">
            <span className={`profile-order-status status-${order.status}`}>{order.status}</span>
            <span className="profile-order-total">{order.total_cost.toFixed(2)} ₽</span>
          </div>
          <div className="profile-order-toggle">
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        
        {isExpanded && (
          <div className="profile-order-details">
            <div className="profile-order-address">
              <strong>Адрес доставки:</strong> {order.address || "—"}
            </div>
            
            {order.delivery_notes && (
              <div className="profile-order-notes">
                <strong>Примечания:</strong> {order.delivery_notes}
              </div>
            )}
            
            <div className="profile-order-items">
              <h4>Состав заказа:</h4>
              <ul>
                {order.items.map(item => (
                  <li key={item.id} className="profile-order-item">
                    <span className="profile-item-name">{item.name}</span>
                    <div className="profile-item-info">
                      <span className="profile-item-qty">x{item.quantity}</span>
                      <span className="profile-item-price">{item.price.toFixed(2)} ₽</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="profile-page-block">
      <div className="profile-title">Личный кабинет</div>
      
      {error && (
        <div className="profile-error-message">
          <FiAlertCircle className="profile-error-icon" />
          <span>{error}</span>
          <button 
            className="profile-close-error-btn" 
            onClick={() => setError('')}
          >
            <FiX />
          </button>
        </div>
      )}
      
      {success && (
        <div className="profile-success-message">
          <FiCheckCircle className="profile-success-icon" />
          <span>{success}</span>
          <button 
            className="profile-close-success-btn" 
            onClick={() => setSuccess('')}
          >
            <FiX />
          </button>
        </div>
      )}
      
      <div className="profile-tabs">
        <button 
          className={`profile-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <FiPackage className="profile-tab-icon" />
          <span>Активные заказы</span>
          {activeOrders.length > 0 && <span className="profile-tab-badge">{activeOrders.length}</span>}
        </button>
        
        <button 
          className={`profile-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <FiClock className="profile-tab-icon" />
          <span>История заказов</span>
        </button>
        
        <button 
          className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <FiSettings className="profile-tab-icon" />
          <span>Настройки</span>
        </button>
      </div>
      
      <div className="profile-content">
        {loading ? (
          <div className="profile-loading">Загрузка данных...</div>
        ) : (
          <>
            {activeTab === 'active' && (
              <div className="profile-section">
                <h2 className="profile-section-title">Активные заказы</h2>
                {activeOrders.length === 0 ? (
                  <div className="profile-empty-message">
                    <FiPackage className="profile-empty-icon" />
                    <p>У вас нет текущих заказов</p>
                    <button className="profile-order-now-btn" onClick={() => navigate('/order')}>
                      Сделать заказ
                    </button>
                  </div>
                ) : (
                  <div className="profile-orders-list">
                    {activeOrders.map(order => renderOrderCard(order))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'history' && (
              <div className="profile-section">
                <h2 className="profile-section-title">История заказов</h2>
                {historyOrders.length === 0 ? (
                  <div className="profile-empty-message">
                    <FiClock className="profile-empty-icon" />
                    <p>У вас пока нет истории заказов</p>
                  </div>
                ) : (
                  <div className="profile-orders-list">
                    {historyOrders.map(order => renderOrderCard(order))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'profile' && (
              <div className="profile-section">
                <div className="profile-header">
                  <h2 className="profile-section-title">
                    Настройки профиля
                    {!editMode && (
                      <button 
                        className="profile-edit-btn" 
                        onClick={() => setEditMode(true)}
                      >
                        <FiEdit2 />
                      </button>
                    )}
                  </h2>
                </div>
                
                {!editMode ? (
                  <div className="profile-info">
                    <div className="profile-info-item">
                      <span className="profile-info-label">Имя:</span>
                      <span className="profile-info-value">{user?.name || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Email:</span>
                      <span className="profile-info-value">{user?.email || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Телефон:</span>
                      <span className="profile-info-value">{user?.phone || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Адрес доставки:</span>
                      <span className="profile-info-value">{user?.address || '—'}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="profile-form">
                    <div className="profile-form-group">
                      <label htmlFor="name">Имя</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={profileData.name}
                        onChange={handleInputChange}
                        placeholder="Ваше имя"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label htmlFor="email">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleInputChange}
                        placeholder="Ваш email"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label htmlFor="phone">Телефон</label>
                      <input
                        type="text"
                        id="phone"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleInputChange}
                        placeholder="+375-XX-XXX-XX-XX"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label htmlFor="address">Адрес доставки</label>
                      <textarea
                        id="address"
                        name="address"
                        value={profileData.address}
                        onChange={handleInputChange}
                        placeholder="Ваш адрес доставки"
                        rows="3"
                      ></textarea>
                    </div>
                    
                    <div className="profile-form-actions">
                      <button type="submit" className="profile-save-btn">Сохранить</button>
                      <button 
                        type="button" 
                        className="profile-cancel-btn"
                        onClick={() => {
                          setEditMode(false);
                          setProfileData({
                            name: user?.name || '',
                            phone: user?.phone || '',
                            address: user?.address || '',
                            email: user?.email || ''
                          });
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProfilePage; 