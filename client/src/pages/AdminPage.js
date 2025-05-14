import React, { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiX, FiAlertCircle, FiCheckCircle, FiPackage, FiList, FiRefreshCw, FiMoreVertical, FiFilter, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { dishesApi, categoriesApi, ordersApi } from '../services/api';
import { isAdmin, getUser } from '../services/auth';
import DishModal from '../components/DishModal';
import './AdminPage.css';

function AdminPage() {
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dishes'); // 'dishes' или 'orders'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' или 'edit'
  const [selectedDish, setSelectedDish] = useState(null);
  const [statusOptions, setStatusOptions] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [orderIdFilter, setOrderIdFilter] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const navigate = useNavigate();
  const adminUser = getUser();

  // Проверяем, является ли пользователь администратором
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
    } else {
      // Получаем возможные статусы заказа
      setStatusOptions(ordersApi.getValidStatuses());
    }
  }, [navigate]);

  // Добавляем обработчик изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Закрываем меню действий при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuOpen && !event.target.closest('.action-menu-container')) {
        setActionMenuOpen(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [actionMenuOpen]);

  // Загружаем данные блюд и категорий
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Загружаем категории
        const categoriesData = await categoriesApi.getAll();
        setCategories(categoriesData);
        
        // Загружаем все блюда
        const dishesData = await dishesApi.getAll();
        setDishes(dishesData);
        
        setLoading(false);
      } catch (err) {
        setError('Ошибка загрузки данных: ' + err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Загружаем данные заказов, когда активна вкладка заказов
  useEffect(() => {
    const fetchOrders = async () => {
      if (activeTab === 'orders' && adminUser && adminUser.role === 'admin' && orders.length === 0) {
        try {
          setOrdersLoading(true);
          const response = await ordersApi.getAllOrders('admin');
          if (response.success) {
            setOrders(response.orders);
          } else {
            setError('Ошибка при загрузке заказов: ' + (response.message || 'Неизвестная ошибка'));
          }
        } catch (err) {
          setError('Ошибка при загрузке заказов: ' + (err.message || 'Неизвестная ошибка'));
        } finally {
          setOrdersLoading(false);
        }
      }
    };
    
    fetchOrders();
  }, [activeTab, adminUser, orders.length]);

  // Автоматически скрываем уведомление об успехе через 5 секунд
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Функция для удаления блюда
  const handleDeleteDish = async (dishId) => {
    try {
      // Запрашиваем подтверждение
      if (!window.confirm('Вы уверены, что хотите удалить это блюдо?')) {
        return;
      }
      
      const response = await dishesApi.deleteDish(dishId, 'admin');
      
      if (response.success) {
        // Удаляем блюдо из списка
        setDishes(prevDishes => prevDishes.filter(dish => dish.id !== dishId));
        setError('');
        setSuccess('Блюдо успешно удалено');
      } else {
        setError(response.message || 'Произошла ошибка при удалении блюда');
      }
    } catch (err) {
      setError('Ошибка при удалении блюда: ' + (err.message || 'Неизвестная ошибка'));
    }
  };

  // Функция для редактирования блюда
  const handleEditDish = (dishId) => {
    const dish = dishes.find(d => d.id === dishId);
    if (dish) {
      setSelectedDish(dish);
      setModalMode('edit');
      setModalOpen(true);
    }
  };
  
  // Функция для открытия модального окна добавления блюда
  const handleOpenAddModal = () => {
    setSelectedDish(null);
    setModalMode('add');
    setModalOpen(true);
  };
  
  // Функция для сохранения блюда (создание или обновление)
  const handleSaveDish = async (dishData) => {
    try {
      let response;
      
      if (modalMode === 'edit') {
        // Обновляем существующее блюдо
        response = await dishesApi.updateDish(dishData.id, dishData, 'admin');
      } else {
        // Создаем новое блюдо
        response = await dishesApi.createDish(dishData, 'admin');
      }
      
      if (response.success) {
        setError('');
        setModalOpen(false);
        setSuccess(
          modalMode === 'edit' 
            ? `Блюдо "${dishData.name}" успешно обновлено` 
            : `Блюдо "${dishData.name}" успешно добавлено`
        );
        
        // Обновляем список блюд
        const updatedDishes = await dishesApi.getAll();
        setDishes(updatedDishes);
      } else {
        setError(response.message || 'Ошибка при сохранении блюда');
      }
    } catch (err) {
      setError('Ошибка при сохранении блюда: ' + (err.message || 'Неизвестная ошибка'));
    }
  };

  // Получаем название категории по ID
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Неизвестная категория';
  };
  
  // Функция для обновления статуса заказа
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await ordersApi.updateOrderStatus(orderId, newStatus, 'admin');
      
      if (response.success) {
        // Обновляем статус заказа в списке
        setOrders(prevOrders => prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
        
        setSuccess(`Статус заказа #${orderId} изменен на "${newStatus}"`);
      } else {
        setError(response.message || 'Ошибка при обновлении статуса заказа');
      }
    } catch (err) {
      setError('Ошибка при обновлении статуса: ' + (err.message || 'Неизвестная ошибка'));
    }
  };
  
  // Функция для обновления списка заказов
  const refreshOrders = async () => {
    try {
      setOrdersLoading(true);
      // Сбрасываем состояния UI элементов
      setExpandedOrderId(null);
      setActionMenuOpen(null);
      
      const response = await ordersApi.getAllOrders('admin');
      
      if (response.success) {
        setOrders(response.orders);
        setSuccess('Список заказов обновлен');
      } else {
        setError(response.message || 'Ошибка при обновлении списка заказов');
      }
    } catch (err) {
      setError('Ошибка при обновлении списка заказов: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setOrdersLoading(false);
    }
  };
  
  // Форматирование даты и времени
  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ru-RU', { 
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  // Функция для фильтрации заказов
  const filteredOrders = orders.filter(order => {
    if (!orderIdFilter) return true;
    return order.id.toString().includes(orderIdFilter);
  });
  
  // Функция для переключения развернутого состояния заказа (на мобильных)
  const toggleOrderExpand = (orderId) => {
    setExpandedOrderId(prevId => prevId === orderId ? null : orderId);
    setActionMenuOpen(null); // Закрываем меню действий при разворачивании
  };
  
  // Функция для отображения меню действий на мобильных
  const toggleActionMenu = (orderId, event) => {
    event.stopPropagation();
    setActionMenuOpen(prevId => prevId === orderId ? null : orderId);
  };

  // Функция для фильтрации заказов и обработки изменения фильтра
  const handleFilterChange = (e) => {
    setOrderIdFilter(e.target.value);
    setExpandedOrderId(null); // Сбрасываем развернутый заказ при изменении фильтра
  };

  // Рендер мобильной карточки заказа
  const renderMobileOrderCard = (order) => {
    const isExpanded = expandedOrderId === order.id;
    const isMenuOpen = actionMenuOpen === order.id;
    
    return (
      <div 
        key={order.id} 
        className={`mobile-order-card status-${order.status}`}
      >
        <div className="mobile-order-header">
          <div className="mobile-order-id">Заказ #{order.id}</div>
          <div className={`order-status status-${order.status}`}>
            {order.status}
          </div>
        </div>
        
        <div className="mobile-order-info">
          <div className="mobile-order-date">
            <strong>Дата:</strong> {formatDateTime(order.order_date)}
          </div>
          <div className="mobile-order-phone">
            <strong>Телефон:</strong> {order.phone}
          </div>
          <div className="mobile-order-total">
            <strong>Сумма:</strong> {order.total_cost.toFixed(2)} BYN
          </div>
        </div>
        
        <div className="mobile-order-actions">
          <button 
            className="mobile-expand-btn"
            onClick={() => toggleOrderExpand(order.id)}
          >
            {isExpanded ? "Свернуть" : "Подробнее"}
          </button>
          
          <div className="mobile-status-selector">
            <select 
              className="status-select mobile-status-select"
              value={order.status}
              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mobile-order-details">
            <div className="mobile-order-address">
              <strong>Адрес:</strong> {order.address || "—"}
            </div>
            {order.delivery_notes && (
              <div className="mobile-order-notes">
                <strong>Примечания:</strong> {order.delivery_notes}
              </div>
            )}
            
            <div className="mobile-order-items">
              <h4>Состав заказа:</h4>
              <ul>
                {order.items.map(item => (
                  <li key={item.id || `${order.id}-${item.name}`} className="mobile-order-item">
                    <span className="mobile-item-name">{item.name}</span>
                    <span className="mobile-item-qty">x{item.quantity}</span>
                    <span className="mobile-item-price">{item.price ? item.price.toFixed(2) : '0.00'} BYN</span>
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
    <div className="brand-block admin-page-block">
      <div className="brand-title">Панель администратора</div>
      <div className="main-content-wrapper admin-page-content">
        {error && (
          <div className="error-message">
            <FiAlertCircle className="error-icon" />
            <span>{error}</span>
            <button 
              className="close-error-btn" 
              aria-label="Закрыть"
              onClick={() => setError('')}
            >
              <FiX />
            </button>
          </div>
        )}
        
        {success && (
          <div className="success-message">
            <FiCheckCircle className="success-icon" />
            <span>{success}</span>
            <button 
              className="close-success-btn" 
              aria-label="Закрыть"
              onClick={() => setSuccess('')}
            >
              <FiX />
            </button>
          </div>
        )}
        
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'dishes' ? 'active' : ''}`}
            onClick={() => setActiveTab('dishes')}
          >
            <FiList className="tab-icon" />
            Блюда
          </button>
          <button 
            className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <FiPackage className="tab-icon" />
            Заказы
          </button>
        </div>
        
        {activeTab === 'dishes' ? (
          <>
            <div className="admin-header">
              <h2>Управление блюдами</h2>
              <div className="admin-header-actions">
                <button className="add-dish-btn" onClick={handleOpenAddModal}>
                  <FiPlus className="add-btn-icon" />
                  <span className="add-btn-text">Добавить блюдо</span>
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="loading-message">Загрузка данных...</div>
            ) : (
              <>
                {isMobile ? (
                  <div className="mobile-dishes-list">
                    {dishes.length === 0 ? (
                      <div className="no-data-mobile">
                        <FiAlertCircle className="no-data-icon" />
                        <span>Нет данных для отображения</span>
                      </div>
                    ) : (
                      dishes.map(dish => (
                        <div className="mobile-dish-card" key={dish.id}>
                          <div className="mobile-dish-info">
                            <h3 className="mobile-dish-name">{dish.name}</h3>
                            <div className="mobile-dish-category">{getCategoryName(dish.category_id)}</div>
                            <div className="mobile-dish-price">{dish.price.toFixed(2)} BYN</div>
                          </div>
                          <div className="mobile-dish-actions">
                            <button 
                              className="edit-btn" 
                              onClick={() => handleEditDish(dish.id)}
                              aria-label="Редактировать"
                            >
                              <FiEdit2 />
                            </button>
                            <button 
                              className="delete-btn" 
                              onClick={() => handleDeleteDish(dish.id)}
                              aria-label="Удалить"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Название</th>
                          <th>Категория</th>
                          <th>Цена</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dishes.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="no-data">
                              <FiAlertCircle className="no-data-icon" />
                              <span>Нет данных для отображения</span>
                            </td>
                          </tr>
                        ) : (
                          dishes.map(dish => (
                            <tr key={dish.id}>
                              <td>{dish.id}</td>
                              <td>{dish.name}</td>
                              <td>{getCategoryName(dish.category_id)}</td>
                              <td>{dish.price.toFixed(2)} BYN</td>
                              <td className="action-buttons">
                                <button 
                                  className="edit-btn" 
                                  onClick={() => handleEditDish(dish.id)}
                                  aria-label="Редактировать"
                                >
                                  <FiEdit2 />
                                </button>
                                <button 
                                  className="delete-btn" 
                                  onClick={() => handleDeleteDish(dish.id)}
                                  aria-label="Удалить"
                                >
                                  <FiTrash2 />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="admin-header orders-header">
              <h2>Управление заказами</h2>
            </div>
            
            <div className="orders-controls">
              <button className="refresh-orders-btn" onClick={refreshOrders}>
                <FiRefreshCw className="refresh-icon" />
                <span className="refresh-text">Обновить</span>
              </button>
            </div>
            
            {/* Фильтр заказов для мобильных устройств */}
            {isMobile && (
              <div className="mobile-orders-filter">
                <div className="filter-input-container">
                  <FiFilter className="filter-icon" />
                  <input
                    type="text"
                    placeholder="Номер заказа..."
                    value={orderIdFilter}
                    onChange={handleFilterChange}
                    className="order-filter-input"
                  />
                  {orderIdFilter && (
                    <button 
                      className="clear-filter-btn"
                      onClick={() => {
                        setOrderIdFilter('');
                        setExpandedOrderId(null);
                      }}
                    >
                      <FiX />
                    </button>
                  )}
                </div>
                <div className="orders-count">
                  Всего заказов: {filteredOrders.length}
                </div>
              </div>
            )}
            
            {ordersLoading ? (
              <div className="loading-message">Загрузка заказов...</div>
            ) : (
              <>
                {isMobile ? (
                  <div className="mobile-orders-list">
                    {filteredOrders.length === 0 ? (
                      <div className="no-data-mobile">
                        <FiAlertCircle className="no-data-icon" />
                        <span>Нет заказов для отображения</span>
                      </div>
                    ) : (
                      filteredOrders.map(order => renderMobileOrderCard(order))
                    )}
                  </div>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Дата</th>
                          <th>Телефон</th>
                          <th>Адрес</th>
                          <th>Сумма</th>
                          <th>Статус</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="no-data">
                              <FiAlertCircle className="no-data-icon" />
                              <span>Нет заказов для отображения</span>
                            </td>
                          </tr>
                        ) : (
                          orders.map(order => (
                            <tr key={order.id} className={`order-row status-${order.status}`}>
                              <td>{order.id}</td>
                              <td>{formatDateTime(order.order_date)}</td>
                              <td>{order.phone}</td>
                              <td>{order.address || "—"}</td>
                              <td>{order.total_cost.toFixed(2)} BYN</td>
                              <td>
                                <div className={`order-status status-${order.status}`}>
                                  {order.status}
                                </div>
                              </td>
                              <td>
                                <select 
                                  className="status-select"
                                  value={order.status}
                                  onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                >
                                  {statusOptions.map(status => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      
      {modalOpen && (
        <DishModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveDish}
          dish={selectedDish}
          categories={categories}
          mode={modalMode}
        />
      )}
    </div>
  );
}

export default AdminPage; 