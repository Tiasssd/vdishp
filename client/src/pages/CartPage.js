import React, { useState, useEffect } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import './CartPage.css';
import { ordersApi, cartApi } from '../services/api';
import { getUser, isAuthenticated } from '../services/auth';

function CartPage() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phone, setPhone] = useState('+375-');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderStatus, setOrderStatus] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Получаем данные пользователя и корзины при монтировании компонента
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      const isAuth = isAuthenticated();
      if (isAuth) {
        const userData = getUser();
        setUser(userData);
        
        // Загружаем корзину из API
        try {
          const response = await cartApi.getCart(userData.id);
          if (response.success) {
            setCart(response.cart);
          }
        } catch (err) {
          console.error('Ошибка при загрузке корзины:', err);
          setError('Не удалось загрузить корзину');
        }
      } else {
        // Для гостей загружаем из localStorage
        setCart(JSON.parse(localStorage.getItem('cart_guest') || '[]'));
      }
      setIsLoading(false);
    };
    
    loadCart();
    
    // Слушаем событие обновления корзины
    const handleCartUpdate = () => loadCart();
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('authChanged', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('authChanged', handleCartUpdate);
    };
  }, []);

  // Удаление товара из корзины
  const removeFromCart = async (dishId) => {
    if (user) {
      // Для авторизованных пользователей используем API
      try {
        const response = await cartApi.removeFromCart(user.id, dishId);
        if (response.success) {
          // Обновляем данные корзины
          const updatedCart = await cartApi.getCart(user.id);
          if (updatedCart.success) {
            setCart(updatedCart.cart);
          }
          // Генерируем событие для обновления всех компонентов
          window.dispatchEvent(new Event('cartUpdated'));
        }
      } catch (err) {
        console.error('Ошибка при удалении из корзины:', err);
        setError('Не удалось удалить товар из корзины');
      }
    } else {
      // Для гостей используем localStorage
      const guestCart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      const newCart = guestCart.filter(item => item.dish_id !== dishId);
      localStorage.setItem('cart_guest', JSON.stringify(newCart));
      setCart(newCart);
      window.dispatchEvent(new Event('cartUpdated'));
    }
  };

  // Изменение количества товара
  const changeQty = async (dishId, delta) => {
    if (user) {
      // Найдем элемент корзины для изменения
      const cartItem = cart.find(item => item.dish_id === dishId);
      if (!cartItem) return;
      
      const newQuantity = Math.max(1, cartItem.quantity + delta);
      
      try {
        // Обновляем количество через API
        const response = await cartApi.updateQuantity(cartItem.id, newQuantity);
        if (response.success) {
          // Обновляем данные корзины
          const updatedCart = await cartApi.getCart(user.id);
          if (updatedCart.success) {
            setCart(updatedCart.cart);
          }
          window.dispatchEvent(new Event('cartUpdated'));
        }
      } catch (err) {
        console.error('Ошибка при обновлении количества:', err);
        setError('Не удалось обновить количество товара');
      }
    } else {
      // Для гостей используем localStorage
      const guestCart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      const newCart = guestCart.map(item => 
        item.dish_id === dishId 
          ? { ...item, quantity: Math.max(1, item.quantity + delta) } 
          : item
      );
      localStorage.setItem('cart_guest', JSON.stringify(newCart));
      setCart(newCart);
      window.dispatchEvent(new Event('cartUpdated'));
    }
  };

  // Расчет общей стоимости
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Функция форматирования телефона
  const formatPhone = (value) => {
    if (!value.startsWith('+375-')) return '+375-';
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('375')) {
      digits = digits.substring(3); // Убираем код страны, если он уже есть
    }
    let formatted = '+375-';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += '-' + digits.slice(2, 5);
    if (digits.length > 5) formatted += '-' + digits.slice(5, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
    return formatted;
  };
  
  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  // Функция, которая открывает модальное окно и заполняет данные из профиля
  const openOrderModal = () => {
    // Если пользователь авторизован и у него есть данные профиля,
    // заполняем соответствующие поля
    if (user) {
      if (user.phone) {
        // Очищаем номер от всех нецифровых символов
        const phoneDigits = user.phone.replace(/\D/g, '');
        
        // Корректно форматируем номер
        if (phoneDigits.startsWith('375')) {
          // Если номер начинается с 375, отрезаем код страны и форматируем
          const digits = phoneDigits.substring(3);
          let formatted = '+375-';
          if (digits.length > 0) formatted += digits.slice(0, 2);
          if (digits.length > 2) formatted += '-' + digits.slice(2, 5);
          if (digits.length > 5) formatted += '-' + digits.slice(5, 7);
          if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
          setPhone(formatted);
        } else {
          // Если номер начинается с чего-то другого, просто форматируем
          setPhone(formatPhone('+375-' + phoneDigits));
        }
      }
      if (user.address) {
        setAddress(user.address);
      }
    }
    setIsPhoneModalOpen(true);
  };
  
  const handleSubmitOrder = async () => {
    if (phone.length < 17) return; // Неполный номер
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Преобразуем номер к формату для БД: +375-XX-XXX-XX-XX => +375XXXXXXXXX
      const phoneForDB = phone.replace(/\D/g, '');
      
      // Собираем элементы заказа
      const orderItems = cart.map(item => ({
        dish_id: item.dish_id,
        quantity: item.quantity,
        price: item.price
      }));
      
      // Подготовка данных заказа
      const orderData = {
        phone: phoneForDB,
        address: address.trim() || null,
        delivery_notes: notes.trim() || null,
        total_cost: total,
        items: orderItems
      };
      
      // Добавляем ID пользователя, если он авторизован
      if (user && user.id) {
        orderData.user_id = user.id;
      }
      
      // Отправка заказа на сервер
      const response = await ordersApi.create(orderData);
      
      if (response.success) {
        setOrderSuccess(true);
        setOrderId(response.orderId);
        setOrderStatus('Новый');
        
        // Если пользователь не авторизован, сохраняем ID заказа в localStorage
        if (!user) {
          localStorage.setItem('last_order_id', response.orderId);
          localStorage.setItem('last_order_phone', phoneForDB);
        }
        
        // Очищаем корзину после успешного заказа
        if (user && user.id) {
          await cartApi.clearCart(user.id);
        } else {
          localStorage.removeItem('cart_guest');
        }
        
        setCart([]);
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        setError(response.message || 'Ошибка при создании заказа');
      }
    } catch (err) {
      console.error('Ошибка при оформлении заказа:', err);
      setError(err.message || 'Не удалось отправить заказ');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const closeModal = () => {
    setIsPhoneModalOpen(false);
    setPhone('+375-');
    setAddress('');
    setNotes('');
    setOrderSuccess(false);
    setError('');
  };

  // Содержимое для успешного заказа
  const renderSuccessContent = () => (
    <div className="order-success-container">
      <div className="order-success-icon">
        <FiCheck size={window.innerWidth <= 480 ? 40 : 60} />
      </div>
      <h2>Заказ успешно оформлен!</h2>
      <div className="order-info">
        <p>Номер вашего заказа: <strong>#{orderId}</strong></p>
        <p>Статус заказа: <strong>{orderStatus}</strong></p>
        <p>Мы свяжемся с вами в ближайшее время для подтверждения.</p>
      </div>
      <div className="order-details">
        <p>Адрес доставки: {address || 'Не указан'}</p>
        <p>Номер телефона: {phone}</p>
        {notes && <p>Примечания к заказу: {notes}</p>}
      </div>
      <div className="order-tracking-info">
        {user ? (
          <p>Вы можете отслеживать статус вашего заказа в личном кабинете.</p>
        ) : (
          <>
            <p>Вы можете отслеживать статус вашего заказа, даже если вы не авторизованы.</p>
            <p>Просто сохраните номер заказа и используйте его для проверки статуса.</p>
          </>
        )}
      </div>
      <div className="order-success-buttons">
        <button 
          className="track-order-button"
          onClick={() => window.location.href = user ? '/profile' : `/track/${orderId}`}
        >
          {user ? 'Перейти в личный кабинет' : 'Отслеживать заказ'}
        </button>
        <button 
          className="return-button"
          onClick={() => window.location.href = '/'}
        >
          Вернуться на главную
        </button>
      </div>
    </div>
  );

  return (
    <div className="brand-block cart-page-block">
      <div className="brand-title">Рестик</div>
      <div className="main-content-wrapper">
        <h1 className="cart-title">Ваша корзина</h1>
        <div className="cart-total-block">
          <span className="cart-total-label">Итого:</span>
          <span className="cart-total-value">{total.toFixed(2)} BYN</span>
        </div>
        <div className="cart-cards">
          {cart.length === 0 && (
            <div className="empty-cart-message">
              <div className="empty-cart-icon">🛒</div>
              <h2>Корзина пуста</h2>
              <p>Добавьте что-нибудь вкусное из нашего меню</p>
            </div>
          )}
          {cart.map(item => (
            <div className="cart-item" key={item.dish_id}>
              {item.image_url && (
                <div className="cart-item-image">
                  <img src={item.image_url} alt={item.name} />
                </div>
              )}
              {!item.image_url && (
                <div className="cart-item-image cart-item-no-image">
                  <span>🍽️</span>
                </div>
              )}
              <div className="cart-item-details">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-composition">{item.composition}</div>
                <div className="cart-item-price-row">
                  <div className="cart-item-price">{item.price.toFixed(2)} BYN</div>
                  <div className="cart-item-subtotal">
                    Итого: {(item.price * item.quantity).toFixed(2)} BYN
                  </div>
                </div>
              </div>
              <div className="cart-item-controls">
                <div className="quantity-controls">
                  <button 
                    className="quantity-btn minus-btn"
                    onClick={() => changeQty(item.dish_id, -1)} 
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span className="quantity-value">{item.quantity}</span>
                  <button 
                    className="quantity-btn plus-btn"
                    onClick={() => changeQty(item.dish_id, 1)}
                  >
                    +
                  </button>
                </div>
                <button 
                  className="remove-item-btn"
                  onClick={() => removeFromCart(item.dish_id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button 
        className={`cart-order-btn ${cart.length > 0 ? 'active' : ''}`} 
        disabled={cart.length === 0}
        onClick={openOrderModal}
      >
        Оформить заказ
      </button>
      
      {/* Модальное окно для ввода телефона */}
      {isPhoneModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="order-modal phone-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeModal}>
              <FiX />
            </button>
            
            {!orderSuccess ? (
              <div className="order-form-container">
                <h2 className="modal-title">Оформление заказа</h2>
                {error && <div className="error-message">{error}</div>}
                <p className="phone-info">
                  {user ? 'Проверьте данные для заказа' : 'Введите номер телефона, и наш оператор свяжется с вами для уточнения деталей заказа'}
                </p>
                
                <div className="order-form-content">
                  <div className="order-form-left">
                    <div className="phone-input-container">
                      <label className="form-label">Номер телефона *</label>
                      <input
                        type="text"
                        className="phone-input"
                        placeholder="+375-XX-XXX-XX-XX"
                        value={phone}
                        onChange={handlePhoneChange}
                        maxLength={17}
                      />
                    </div>
                    
                    <div className="address-input-container">
                      <label className="form-label">Адрес доставки</label>
                      <textarea
                        className="address-input"
                        placeholder="Введите адрес доставки"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                    
                    <div className="notes-input-container">
                      <label className="form-label">Примечания к заказу</label>
                      <textarea
                        className="notes-input"
                        placeholder="Укажите пожелания к заказу"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="order-form-right">
                    <div className="order-summary">
                      <h3>Ваш заказ:</h3>
                      <ul className="order-items-list">
                        {cart.map(item => (
                          <li key={item.dish_id} className="order-item">
                            {item.image_url && (
                              <div className="order-item-image">
                                <img src={item.image_url} alt={item.name} />
                              </div>
                            )}
                            {!item.image_url && (
                              <div className="order-item-image order-item-no-image">
                                <span>🍽️</span>
                              </div>
                            )}
                            <div className="order-item-details">
                              <span className="order-item-name">{item.name}</span>
                              <div className="order-item-price-row">
                                <span className="order-item-qty">x{item.quantity}</span>
                                <span className="order-item-price">{(item.price * item.quantity).toFixed(2)} BYN</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="order-total">
                        <span>Итого:</span>
                        <span>{total.toFixed(2)} BYN</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  className={`submit-order-btn ${isSubmitting ? 'loading' : ''}`}
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || phone.length < 17}
                >
                  {isSubmitting ? (
                    <span className="submit-spinner">
                      <span className="spinner-dot"></span>
                      <span className="spinner-dot"></span>
                      <span className="spinner-dot"></span>
                      <span className="spinner-text">Оформление...</span>
                    </span>
                  ) : (
                    'Оформить заказ'
                  )}
                </button>
              </div>
            ) : (
              renderSuccessContent()
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CartPage; 