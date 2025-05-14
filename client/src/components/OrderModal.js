import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiUser, FiShoppingBag } from 'react-icons/fi';
import './OrderModal.css';

function OrderModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  
  const handleLoginRedirect = () => {
    onClose();
    navigate('/login');
  };
  
  const handleOrderRedirect = () => {
    onClose();
    navigate('/order');
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="order-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <FiX />
        </button>
        
        <h2>Как вы хотите сделать заказ?</h2>
        <div className="order-options">
          <button 
            className="order-option-btn login-option" 
            onClick={handleLoginRedirect}
          >
            <FiUser className="option-icon" />
            <span>Войти в аккаунт</span>
            <p className="option-desc">
              Войдите в систему, что бы не заполнять форму заказа каждый раз
            </p>
          </button>
          
          <div className="option-divider">или</div>
          
          <button 
            className="order-option-btn menu-option" 
            onClick={handleOrderRedirect}
          >
            <FiShoppingBag className="option-icon" />
            <span>Перейти к меню</span>
            <p className="option-desc">
              Выберите блюда из нашего меню и сделайте заказ по номеру телефона
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderModal; 