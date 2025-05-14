import React, { useEffect, useState } from 'react';
import { FiShoppingCart, FiSearch, FiFilter, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './OrderPage.css';
import { categoriesApi, dishesApi, cartApi } from '../services/api';
import { getUser, isAuthenticated, isAdmin } from '../services/auth';

function OrderPage() {
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterMin, setFilterMin] = useState('');
  const [filterMax, setFilterMax] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0); // 0 означает "все категории"
  const [sort, setSort] = useState('name-asc');
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const navigate = useNavigate();

  // Инициализация данных пользователя
  useEffect(() => {
    const loadUserAndCart = async () => {
      const isAuth = isAuthenticated();
      if (isAuth) {
        const userData = getUser();
        setUser(userData);
        // Проверяем, является ли пользователь администратором
        setIsUserAdmin(isAdmin());
        
        // Загружаем корзину пользователя из API
        try {
          const cartResponse = await cartApi.getCart(userData.id);
          if (cartResponse.success) {
            setCart(cartResponse.cart);
          }
        } catch (err) {
          console.error('Ошибка при загрузке корзины:', err);
        }
      } else {
        // Для неавторизованных пользователей храним корзину в localStorage
        setCart(JSON.parse(localStorage.getItem('cart_guest') || '[]'));
      }
    };
    
    loadUserAndCart();
    
    // Подписываемся на события обновления корзины и авторизации
    window.addEventListener('cartUpdated', loadUserAndCart);
    window.addEventListener('authChanged', loadUserAndCart);
    
    return () => {
      window.removeEventListener('cartUpdated', loadUserAndCart);
      window.removeEventListener('authChanged', loadUserAndCart);
    };
  }, []);

  // Загрузка категорий и блюд
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
        
        // Устанавливаем состояние expandedCategories для всех категорий
        const expanded = {};
        categoriesData.forEach(cat => {
          expanded[cat.id] = true; // По умолчанию все категории развернуты
        });
        setExpandedCategories(expanded);
        
        setLoading(false);
      } catch (err) {
        setError('Ошибка загрузки данных: ' + err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Функция добавления товара в корзину
  const addToCart = async (dish) => {
    if (user) {
      // Для авторизованных пользователей используем API
      try {
        const response = await cartApi.addToCart({
          user_id: user.id,
          dish_id: dish.id,
          quantity: 1
        });
        
        if (response.success) {
          // Обновляем данные корзины
          const updatedCart = await cartApi.getCart(user.id);
          if (updatedCart.success) {
            setCart(updatedCart.cart);
          }
          // Генерируем событие для обновления CartBar
          window.dispatchEvent(new Event('cartUpdated'));
        }
      } catch (err) {
        console.error('Ошибка при добавлении в корзину:', err);
        setError('Не удалось добавить товар в корзину');
      }
    } else {
      // Для гостей используем localStorage
      const guestCart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      const found = guestCart.find(item => item.dish_id === dish.id);
      
      if (found) {
        // Увеличиваем количество
        found.quantity += 1;
      } else {
        // Добавляем новый товар
        guestCart.push({
          dish_id: dish.id,
          name: dish.name,
          composition: dish.composition,
          price: dish.price,
          quantity: 1,
          image_url: dish.image_url || null
        });
      }
      
      localStorage.setItem('cart_guest', JSON.stringify(guestCart));
      setCart(guestCart);
      // Генерируем событие для обновления CartBar
      window.dispatchEvent(new Event('cartUpdated'));
    }
  };

  // Фильтрация блюд
  let filtered = dishes.filter(dish =>
    dish.name.toLowerCase().includes(filterName.toLowerCase()) &&
    (!filterMin || dish.price >= parseFloat(filterMin)) &&
    (!filterMax || dish.price <= parseFloat(filterMax)) &&
    (selectedCategory === 0 || dish.category_id === selectedCategory)
  );

  // Сортировка блюд
  if (sort === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'name-desc') filtered.sort((a, b) => b.name.localeCompare(a.name));
  if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);

  // Группировка блюд по категориям для отображения
  const groupedDishes = {};
  if (selectedCategory === 0) {
    // Если выбраны все категории - группируем
    filtered.forEach(dish => {
      if (!groupedDishes[dish.category_id]) {
        groupedDishes[dish.category_id] = [];
      }
      groupedDishes[dish.category_id].push(dish);
    });
  } else {
    // Если выбрана конкретная категория - помещаем всё в один массив
    groupedDishes[selectedCategory] = filtered;
  }

  // Изменение состояния развернутости категории
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Применяем функцию предотвращения прокрутки для всех страниц
  useEffect(() => {
    // Функция для определения необходимости прокрутки
    const checkScrollNeeded = () => {
      const contentHeight = document.querySelector('.order-page-block')?.scrollHeight || 0;
      const viewportHeight = window.innerHeight;
      
      if (contentHeight <= viewportHeight) {
        document.documentElement.classList.add('no-scroll');
        document.body.classList.add('no-scroll');
      } else {
        document.documentElement.classList.remove('no-scroll');
        document.body.classList.remove('no-scroll');
      }
    };

    // Вызываем сразу и добавляем слушатели событий
    checkScrollNeeded();
    window.addEventListener('resize', checkScrollNeeded);
    window.addEventListener('load', checkScrollNeeded);
    
    // При размонтировании компонента убираем классы и слушатели
    return () => {
      window.removeEventListener('resize', checkScrollNeeded);
      window.removeEventListener('load', checkScrollNeeded);
      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    };
  }, [dishes, loading]);

  return (
    <div className="brand-block order-page-block">
      <div className="brand-title restaurant-logo">Рестик</div>
      <div className="main-content-wrapper order-page-content">
        <div className="filters-bar-container">
          <div className="filters-bar">
            <div className="order-filters">
              <div className="search-container">
                <FiSearch className="search-icon" />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="" 
                  value={filterName} 
                  onChange={e => setFilterName(e.target.value)} 
                />
                {!filterName && (
                  <div className="custom-placeholder">
                    Поиск по названию
                  </div>
                )}
                {filterName && (
                  <button 
                    className="clear-search-btn" 
                    onClick={() => setFilterName('')}
                  >
                    <FiX />
                  </button>
                )}
              </div>
              <div className="category-selector">
                <select 
                  className="category-select" 
                  value={selectedCategory} 
                  onChange={e => setSelectedCategory(Number(e.target.value))}
                >
                  <option value={0}>Все категории</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="price-filter-container">
                <div className="price-inputs">
                  <div className="price-input-group">
                    <div className="price-input-label">От</div>
                    <div className="price-input-container">
                      <input 
                        type="number" 
                        min="0" 
                        className="price-input" 
                        placeholder="" 
                        value={filterMin} 
                        onChange={e => setFilterMin(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="price-input-group">
                    <div className="price-input-label">До</div>
                    <div className="price-input-container">
                      <input 
                        type="number" 
                        min="0" 
                        className="price-input" 
                        placeholder="" 
                        value={filterMax} 
                        onChange={e => setFilterMax(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="sort-container">
                <select 
                  className="sort-select" 
                  value={sort} 
                  onChange={e => setSort(e.target.value)}
                >
                  <option value="name-asc">По названию (А-Я)</option>
                  <option value="name-desc">По названию (Я-А)</option>
                  <option value="price-asc">Сначала дешевле</option>
                  <option value="price-desc">Сначала дороже</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="menu-content">
          <div className="menu-header">
            <h1 className="menu-title">Наше меню</h1>
          </div>
          <div className="order-cards">
            {loading ? (
              <div className="loading-message">Загрузка меню...</div>
            ) : (
              <>
                {error && (
                  <div className="error-message">
                    {error}
                    <button 
                      className="close-error-btn" 
                      onClick={() => setError('')}
                    >
                      <FiX />
                    </button>
                  </div>
                )}
                
                {Object.entries(groupedDishes).map(([categoryId, dishes]) => {
                  // Находим информацию о категории
                  const category = categories.find(c => c.id === Number(categoryId));
                  
                  return (
                    <div key={categoryId} className="category-section">
                      {selectedCategory === 0 && (
                        <div className="category-header">
                          <h2 
                            className="category-title" 
                            onClick={() => toggleCategory(Number(categoryId))}
                          >
                            {category?.name || 'Без категории'} 
                            {expandedCategories[categoryId] ? <FiChevronUp /> : <FiChevronDown />}
                          </h2>
                        </div>
                      )}
                      
                      {expandedCategories[categoryId] && (
                        <div className="dishes-grid">
                          {dishes.map(dish => (
                            <div key={dish.id} className="dish-card">
                              {dish.image_url && (
                                <div className="dish-image-container">
                                  <img 
                                    src={dish.image_url} 
                                    alt={dish.name} 
                                    className="dish-image"
                                  />
                                </div>
                              )}
                              <div className="dish-details">
                                <div className="dish-name">{dish.name}</div>
                                {dish.description && (
                                  <div className="dish-description">{dish.description}</div>
                                )}
                                <div className="dish-composition">{dish.composition}</div>
                                {dish.weight && (
                                  <div className="dish-weight">{dish.weight} г</div>
                                )}
                                <div className="dish-price-container">
                                  <div className="dish-price">{dish.price.toFixed(2)} BYN</div>
                                  <button 
                                    className="add-to-cart-btn" 
                                    onClick={() => addToCart(dish)}
                                  >
                                    <FiShoppingCart style={{ marginRight: '6px' }} /> В корзину
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {Object.keys(groupedDishes).length === 0 && (
                  <div className="empty-results">Ничего не найдено</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderPage; 