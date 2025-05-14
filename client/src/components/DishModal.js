import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiUpload, FiImage } from 'react-icons/fi';
import { dishesApi } from '../services/api';
import './DishModal.css';

function DishModal({ isOpen, onClose, onSave, dish, categories, mode = 'edit' }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    composition: '',
    price: '',
    image_url: '',
    category_id: '',
    weight: '',
    is_available: true
  });
  
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const fileInputRef = useRef(null);

  // Инициализируем форму при открытии модального окна
  useEffect(() => {
    if (isOpen && mode === 'edit' && dish) {
      setFormData({
        name: dish.name || '',
        description: dish.description || '',
        composition: dish.composition || '',
        price: dish.price?.toString() || '',
        image_url: dish.image_url || '',
        category_id: dish.category_id?.toString() || '',
        weight: dish.weight?.toString() || '',
        is_available: dish.is_available !== false
      });
      
      // Устанавливаем предпросмотр, если есть изображение
      if (dish.image_url) {
        setPreviewUrl(dish.image_url);
      } else {
        setPreviewUrl('');
      }
    } else if (isOpen && mode === 'add') {
      // При добавлении нового блюда сбрасываем форму
      setFormData({
        name: '',
        description: '',
        composition: '',
        price: '',
        image_url: '',
        category_id: categories.length > 0 ? categories[0].id.toString() : '',
        weight: '',
        is_available: true
      });
      setPreviewUrl('');
    }
    
    // Сбрасываем ошибки и состояние загрузки изображения
    setErrors({});
    setImageFile(null);
    setIsUploading(false);
    setUploadError('');
  }, [isOpen, dish, mode, categories]);

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // При изменении поля, убираем ошибку для него
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Обработчик выбора файла изображения
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Проверяем тип файла
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      setUploadError('Выбранный файл не является изображением');
      return;
    }
    
    // Проверяем размер файла (не более 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Размер файла не должен превышать 5MB');
      return;
    }
    
    setImageFile(file);
    setUploadError('');
    
    // Создаем URL для предпросмотра
    const newPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(newPreviewUrl);
  };
  
  // Обработчик нажатия на кнопку "Выбрать файл"
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };
  
  // Загрузка изображения на сервер
  const uploadImage = async () => {
    if (!imageFile) return null;
    
    try {
      setIsUploading(true);
      const response = await dishesApi.uploadImage(imageFile, 'admin');
      setIsUploading(false);
      
      if (response.success) {
        // Устанавливаем URL загруженного изображения в форму
        setFormData(prev => ({
          ...prev,
          image_url: response.imageUrl
        }));
        return response.imageUrl;
      } else {
        setUploadError(response.message || 'Ошибка при загрузке изображения');
        return null;
      }
    } catch (error) {
      setIsUploading(false);
      setUploadError(error.message || 'Ошибка при загрузке изображения');
      return null;
    }
  };
  
  // Валидация формы
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Название блюда обязательно';
    }
    
    if (!formData.composition.trim()) {
      newErrors.composition = 'Состав блюда обязателен';
    }
    
    if (!formData.price.trim()) {
      newErrors.price = 'Цена обязательна';
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Цена должна быть положительным числом';
    }
    
    if (!formData.category_id) {
      newErrors.category_id = 'Выберите категорию';
    }
    
    if (formData.weight && (isNaN(parseInt(formData.weight)) || parseInt(formData.weight) <= 0)) {
      newErrors.weight = 'Вес должен быть положительным числом';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Загружаем изображение, если оно было выбрано
      let imageUrl = formData.image_url;
      if (imageFile) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          // Ошибка загрузки изображения, прерываем сохранение
          return;
        }
      }
      
      // Форматируем данные перед отправкой
      const formattedData = {
        ...formData,
        image_url: imageUrl,
        price: parseFloat(formData.price),
        category_id: parseInt(formData.category_id),
        weight: formData.weight ? parseInt(formData.weight) : null,
      };
      
      // Если это режим редактирования, сохраняем ID блюда и запрашиваем подтверждение
      if (mode === 'edit' && dish) {
        formattedData.id = dish.id;
        
        // Запрашиваем подтверждение только для редактирования
        if (window.confirm(`Вы уверены, что хотите сохранить изменения в блюде "${formattedData.name}"?`)) {
          onSave(formattedData);
        }
      } else {
        // Для добавления блюда подтверждение не требуется
        onSave(formattedData);
      }
    }
  };

  // Если модальное окно закрыто, не рендерим содержимое
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'edit' ? 'Редактирование блюда' : 'Добавление блюда'}</h2>
          <button className="modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="dish-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Название*</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <div className="error-message">{errors.name}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="category_id">Категория*</label>
              <select
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className={errors.category_id ? 'error' : ''}
              >
                <option value="">Выберите категорию</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && <div className="error-message">{errors.category_id}</div>}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="composition">Состав*</label>
            <textarea
              id="composition"
              name="composition"
              value={formData.composition}
              onChange={handleChange}
              rows="3"
              className={errors.composition ? 'error' : ''}
            />
            {errors.composition && <div className="error-message">{errors.composition}</div>}
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Цена (BYN)*</label>
              <input
                type="text"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className={errors.price ? 'error' : ''}
              />
              {errors.price && <div className="error-message">{errors.price}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="weight">Вес (г)</label>
              <input
                type="text"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className={errors.weight ? 'error' : ''}
              />
              {errors.weight && <div className="error-message">{errors.weight}</div>}
            </div>
          </div>
          
          <div className="form-group">
            <label>Изображение</label>
            <div className="image-upload-container">
              <input
                type="file"
                id="dish-image"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              
              <div className="image-upload-controls">
                <button 
                  type="button" 
                  className="browse-btn" 
                  onClick={handleBrowseClick}
                  disabled={isUploading}
                >
                  <FiUpload /> Выбрать файл
                </button>
                
                <span className="file-name">
                  {imageFile ? imageFile.name : 'Файл не выбран'}
                </span>
              </div>
              
              {uploadError && <div className="error-message">{uploadError}</div>}
              
              {isUploading && <div className="upload-progress">Загрузка изображения...</div>}
              
              {(previewUrl || formData.image_url) && (
                <div className="image-preview">
                  <img src={previewUrl || formData.image_url} alt="Предпросмотр" />
                </div>
              )}
              
              {!previewUrl && !formData.image_url && (
                <div className="no-image">
                  <FiImage /> Нет изображения
                </div>
              )}
            </div>
          </div>
          
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_available"
                checked={formData.is_available}
                onChange={handleChange}
              />
              <span>Доступно для заказа</span>
            </label>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="save-btn" disabled={isUploading}>
              {mode === 'edit' ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DishModal; 