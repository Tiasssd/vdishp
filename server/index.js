import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Статический маршрут для доступа к изображениям
const dishesImagesPath = path.join(__dirname, '..', 'client', 'public', 'dishes_images');
app.use('/dishes_images', express.static(dishesImagesPath));

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'client', 'public', 'dishes_images');
    // Создаем директорию, если она не существует
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, uniqueSuffix + fileExt);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Ограничение размера файла (5MB)
  fileFilter: function (req, file, cb) {
    // Проверяем тип файла
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error('Только изображения (jpeg, jpg, png, webp) разрешены для загрузки!'));
  }
});

// Маршрут для загрузки изображения блюда
app.post('/api/upload/dish-image', upload.single('image'), (req, res) => {
  const { role } = req.query;
  
  // Проверяем права администратора
  if (role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Доступ запрещен. Требуются права администратора.' 
    });
  }
  
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: 'Изображение не было загружено'
    });
  }
  
  // Формируем путь к файлу относительно публичной директории
  const relativePath = `/dishes_images/${req.file.filename}`;
  
  res.json({
    success: true,
    message: 'Изображение успешно загружено',
    imageUrl: relativePath
  });
});

// Пути к базе и дампу
const DB_DIR = path.resolve(__dirname, '..', 'DB');
const DB_FILE = path.join(DB_DIR, 'main.db');
const SQL_DUMP = path.join(DB_DIR, 'DB.sql');

// Проверка существования директории
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('Создана директория для базы данных');
}

// Инициализация базы, если файла нет
if (!fs.existsSync(DB_FILE)) {
  const dump = fs.readFileSync(SQL_DUMP, 'utf-8');
  const db = new sqlite3.Database(DB_FILE);
  db.exec(dump, (err) => {
    if (err) {
      console.error('Ошибка инициализации БД:', err);
    } else {
      console.log('База данных создана из дампа.');
    }
    db.close();
  });
}

// Подключение к базе
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err);
  } else {
    console.log('База данных подключена.');
    
    // Создание таблицы корзин, если её нет
    db.run(`
      CREATE TABLE IF NOT EXISTS Carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        dish_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id),
        FOREIGN KEY (dish_id) REFERENCES Dishes(id),
        UNIQUE(user_id, dish_id)
      )
    `, (err) => {
      if (err) {
        console.error('Ошибка создания таблицы корзин:', err);
      } else {
        console.log('Таблица корзин проверена/создана.');
      }
    });
  }
});

// Маршрут: получить все категории
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM Categories', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Маршрут: получить блюда по категории
app.get('/api/dishes/category/:categoryId', (req, res) => {
  const categoryId = req.params.categoryId;
  db.all('SELECT * FROM Dishes WHERE category_id = ?', [categoryId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Маршрут: получить все блюда
app.get('/api/dishes', (req, res) => {
  db.all('SELECT d.*, c.name as category_name FROM Dishes d JOIN Categories c ON d.category_id = c.id', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Маршрут: авторизация
app.post('/api/auth', (req, res) => {
  const { login, password } = req.body;
  const phone = login; // Используем параметр login как номер телефона для совместимости
  
  console.log('Попытка авторизации:', { phone, password });
  
  // Проверяем, если телефон начинается с +, ищем и так и так
  const phoneWithPlus = phone.startsWith('+') ? phone : `+${phone}`;
  const phoneWithoutPlus = phone.startsWith('+') ? phone.substring(1) : phone;
  
  db.get('SELECT * FROM Users WHERE (phone = ? OR phone = ?) AND password = ?', 
    [phoneWithPlus, phoneWithoutPlus, password], 
    (err, row) => {
      if (err) {
        console.error('Ошибка запроса к БД:', err);
        res.status(500).json({ error: err.message });
      } else if (row) {
        console.log('Пользователь найден:', row);
        res.json({ 
          success: true, 
          user: {
            id: row.id,
            phone: row.phone,
            name: row.name,
            address: row.address,
            role: row.role || 'user'
          } 
        });
      } else {
        console.log('Пользователь не найден');
        res.status(401).json({ success: false, message: 'Неверный номер телефона или пароль' });
      }
    }
  );
});

// Маршрут: регистрация пользователя
app.post('/api/register', (req, res) => {
  const { login, password, name, address } = req.body;
  const phone = login; // Используем параметр login как номер телефона для совместимости
  
  if (!phone || !password) {
    return res.status(400).json({ success: false, message: 'Не все обязательные поля заполнены' });
  }
  
  db.get('SELECT * FROM Users WHERE phone = ?', [phone], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
    if (row) {
      return res.status(409).json({ success: false, message: 'Пользователь уже существует' });
    }
    db.run('INSERT INTO Users (phone, password, name, address, role) VALUES (?, ?, ?, ?, ?)', 
      [phone, password, name || null, address || null, 'user'], 
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Ошибка при регистрации' });
        }
        res.json({ success: true, userId: this.lastID });
      });
  });
});

// Маршрут: создание заказа
app.post('/api/orders', (req, res) => {
  const { user_id, phone, address, total_cost, delivery_notes, items } = req.body;
  
  if (!phone || !total_cost || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Не все обязательные поля заполнены' });
  }
  
  // Начинаем транзакцию
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Создаем заказ
    db.run(
      'INSERT INTO Orders (user_id, phone, address, total_cost, delivery_notes, status) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id || null, phone, address || null, total_cost, delivery_notes || null, 'Новый'],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ success: false, message: 'Ошибка при создании заказа' });
        }
        
        const orderId = this.lastID;
        let processed = 0;
        let hasError = false;
        
        // Добавляем элементы заказа
        items.forEach(item => {
          db.run(
            'INSERT INTO OrderItems (order_id, dish_id, quantity, price) VALUES (?, ?, ?, ?)',
            [orderId, item.dish_id, item.quantity, item.price],
            function(err) {
              processed++;
              
              if (err && !hasError) {
                hasError = true;
                db.run('ROLLBACK');
                return res.status(500).json({ 
                  success: false, 
                  message: 'Ошибка при добавлении элементов заказа' 
                });
              }
              
              // Если все элементы обработаны
              if (processed === items.length && !hasError) {
                db.run('COMMIT');
                return res.json({ success: true, orderId: orderId });
              }
            }
          );
        });
      }
    );
  });
});

// Маршрут: получить заказы пользователя
app.get('/api/orders/user/:userId', (req, res) => {
  const userId = req.params.userId;
  
  // Получаем все заказы пользователя
  db.all('SELECT * FROM Orders WHERE user_id = ? ORDER BY order_date DESC', [userId], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (orders.length === 0) {
      return res.json({ orders: [] });
    }
    
    // Для каждого заказа получаем его элементы
    let processed = 0;
    orders.forEach((order, index) => {
      db.all(
        `SELECT oi.*, d.name, d.composition FROM OrderItems oi 
         JOIN Dishes d ON oi.dish_id = d.id 
         WHERE oi.order_id = ?`,
        [order.id],
        (err, items) => {
          processed++;
          
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          orders[index].items = items;
          
          // Если все заказы обработаны, отправляем ответ
          if (processed === orders.length) {
            res.json({ orders });
          }
        }
      );
    });
  });
});

// Маршрут: получить информацию о конкретном заказе
app.get('/api/orders/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  
  db.get('SELECT * FROM Orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }
    
    db.all(
      `SELECT oi.*, d.name, d.composition FROM OrderItems oi 
       JOIN Dishes d ON oi.dish_id = d.id 
       WHERE oi.order_id = ?`,
      [orderId],
      (err, items) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        order.items = items;
        res.json(order);
      }
    );
  });
});

// Маршрут: Публичный доступ к информации о заказе по его номеру (для отслеживания)
app.get('/api/track-order/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  console.log(`Запрос на отслеживание заказа: ${orderId}`);
  
  db.get('SELECT id, order_date, status, total_cost FROM Orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      console.error('Ошибка в запросе к БД:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Ошибка при получении информации о заказе', 
        error: err.message 
      });
    }
    
    if (!order) {
      console.log(`Заказ с ID ${orderId} не найден`);
      return res.status(404).json({ 
        success: false, 
        message: 'Заказ не найден' 
      });
    }
    
    console.log(`Заказ найден: ${JSON.stringify(order)}`);
    
    db.all(
      `SELECT oi.quantity, d.name, d.composition FROM OrderItems oi 
       JOIN Dishes d ON oi.dish_id = d.id 
       WHERE oi.order_id = ?`,
      [orderId],
      (err, items) => {
        if (err) {
          console.error('Ошибка при получении элементов заказа:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Ошибка при получении деталей заказа', 
            error: err.message 
          });
        }
        
        console.log(`Найдено элементов заказа: ${items.length}`);
        
        // Возвращаем только основную информацию для публичного отслеживания
        res.json({ 
          success: true,
          order: {
            id: order.id,
            order_date: order.order_date,
            status: order.status,
            total_cost: order.total_cost,
            items: items
          }
        });
      }
    );
  });
});

// Маршрут: изменить профиль пользователя
app.put('/api/users/:userId', (req, res) => {
  const userId = req.params.userId;
  const { name, phone, address, email } = req.body;
  
  console.log(`Попытка обновления профиля пользователя ${userId}:`, { name, phone, address, email });
  
  // Сначала проверим, существует ли поле email в таблице Users
  db.all("PRAGMA table_info(Users)", (err, columns) => {
    if (err) {
      console.error('Ошибка при проверке структуры таблицы Users:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Ошибка при проверке структуры базы данных',
        error: err.message 
      });
    }
    
    // Проверяем наличие поля email
    const hasEmailField = columns.some(column => column.name === 'email');
    console.log(`Поле email ${hasEmailField ? 'найдено' : 'НЕ НАЙДЕНО'} в таблице Users`);
    
    // Если поля email нет, добавляем его
    if (!hasEmailField) {
      console.log('Добавление поля email в таблицу Users...');
      db.run('ALTER TABLE Users ADD COLUMN email TEXT', (alterErr) => {
        if (alterErr) {
          console.error('Ошибка при добавлении поля email:', alterErr);
          return res.status(500).json({ 
            success: false, 
            message: 'Ошибка при изменении структуры базы данных',
            error: alterErr.message 
          });
        }
        console.log('Поле email успешно добавлено в таблицу Users');
        // После успешного добавления поля продолжаем обновление профиля
        performUpdate();
      });
    } else {
      // Если поле email уже существует, просто обновляем профиль
      performUpdate();
    }
  });
  
  // Функция для обновления профиля пользователя
  function performUpdate() {
    try {
      console.log('Выполняем SQL-запрос для обновления профиля...');
      console.log('SQL: UPDATE Users SET name = ?, phone = ?, address = ?, email = ? WHERE id = ?');
      console.log('Параметры:', [name || null, phone || null, address || null, email || null, userId]);
      
      db.run(
        'UPDATE Users SET name = ?, phone = ?, address = ?, email = ? WHERE id = ?',
        [name || null, phone || null, address || null, email || null, userId],
        function(err) {
          if (err) {
            console.error('Ошибка SQL при обновлении профиля:', err);
            console.error('Код ошибки SQLite:', err.code);
            console.error('Сообщение ошибки SQLite:', err.message);
            
            return res.status(500).json({ 
              success: false, 
              message: 'Ошибка при обновлении профиля',
              error: err.message,
              error_code: err.code
            });
          }
          
          if (this.changes === 0) {
            console.warn(`Пользователь ${userId} не найден при попытке обновления профиля`);
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
          }
          
          console.log(`Профиль пользователя ${userId} успешно обновлен`);
          res.json({ success: true });
        }
      );
    } catch (error) {
      console.error('Неожиданная ошибка при обновлении профиля:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Неожиданная ошибка при обновлении профиля',
        error: error.message 
      });
    }
  }
});

// Для поддержки старых запросов
app.get('/api/menu', (req, res) => {
  // Преобразуем данные из новой структуры к старой
  db.all('SELECT * FROM Dishes', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      const formattedRows = rows.map(row => ({
        id: row.id,
        dish: row.name
      }));
      res.json(formattedRows);
    }
  });
});

// Маршрут: Получить корзину пользователя
app.get('/api/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all(`
    SELECT c.id, c.user_id, c.dish_id, c.quantity, d.name, d.price, d.composition, d.image_url
    FROM Carts c
    JOIN Dishes d ON c.dish_id = d.id
    WHERE c.user_id = ?
    ORDER BY c.date_added DESC
  `, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Ошибка при получении корзины', error: err.message });
    }
    res.json({ success: true, cart: rows });
  });
});

// Маршрут: Добавить товар в корзину
app.post('/api/cart', (req, res) => {
  const { user_id, dish_id, quantity, dish_data } = req.body;
  
  if (!user_id || !dish_id) {
    return res.status(400).json({ success: false, message: 'Не указан ID пользователя или ID блюда' });
  }
  
  // Проверяем наличие товара в корзине
  db.get('SELECT * FROM Carts WHERE user_id = ? AND dish_id = ?', [user_id, dish_id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Ошибка при проверке корзины', error: err.message });
    }
    
    if (row) {
      // Товар уже есть в корзине, обновляем количество
      const newQuantity = row.quantity + (quantity || 1);
      db.run('UPDATE Carts SET quantity = ? WHERE user_id = ? AND dish_id = ?',
        [newQuantity, user_id, dish_id],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка при обновлении корзины', error: err.message });
          }
          res.json({ success: true, message: 'Количество товара обновлено', cart_id: row.id, quantity: newQuantity });
        }
      );
    } else {
      // Добавляем новый товар в корзину
      db.run('INSERT INTO Carts (user_id, dish_id, quantity) VALUES (?, ?, ?)',
        [user_id, dish_id, quantity || 1],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка при добавлении в корзину', error: err.message });
          }
          res.json({ success: true, message: 'Товар добавлен в корзину', cart_id: this.lastID });
        }
      );
    }
  });
});

// Маршрут: Изменить количество товара в корзине
app.put('/api/cart/:cartId', (req, res) => {
  const { cartId } = req.params;
  const { quantity } = req.body;
  
  if (!quantity || quantity < 1) {
    return res.status(400).json({ success: false, message: 'Неверное количество товара' });
  }
  
  db.run('UPDATE Carts SET quantity = ? WHERE id = ?', [quantity, cartId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Ошибка при обновлении корзины', error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Товар не найден в корзине' });
    }
    
    res.json({ success: true, message: 'Количество товара обновлено' });
  });
});

// Маршрут: Удалить товар из корзины
app.delete('/api/cart/:userId/:dishId', (req, res) => {
  const { userId, dishId } = req.params;
  
  db.run('DELETE FROM Carts WHERE user_id = ? AND dish_id = ?', [userId, dishId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Ошибка при удалении из корзины', error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Товар не найден в корзине' });
    }
    
    res.json({ success: true, message: 'Товар удален из корзины' });
  });
});

// Маршрут: Очистить корзину пользователя
app.delete('/api/cart/:userId', (req, res) => {
  const { userId } = req.params;
  
  db.run('DELETE FROM Carts WHERE user_id = ?', [userId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Ошибка при очистке корзины', error: err.message });
    }
    
    res.json({ success: true, message: 'Корзина очищена', itemsRemoved: this.changes });
  });
});

// Маршрут: Удаление блюда администратором
app.delete('/api/dishes/:dishId', (req, res) => {
  const { dishId } = req.params;
  const { role } = req.query; // Получаем роль из параметров запроса
  
  // Проверяем права администратора
  if (role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Доступ запрещен. Требуются права администратора.' 
    });
  }
  
  // Начинаем транзакцию
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Сначала удаляем блюдо из всех корзин
    db.run('DELETE FROM Carts WHERE dish_id = ?', [dishId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          message: 'Ошибка при удалении блюда из корзин', 
          error: err.message 
        });
      }
      
      // Теперь удаляем само блюдо
      db.run('DELETE FROM Dishes WHERE id = ?', [dishId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ 
            success: false, 
            message: 'Ошибка при удалении блюда', 
            error: err.message 
          });
        }
        
        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ 
            success: false, 
            message: 'Блюдо не найдено' 
          });
        }
        
        db.run('COMMIT');
        res.json({ 
          success: true, 
          message: 'Блюдо успешно удалено' 
        });
      });
    });
  });
});

// Маршрут: Создание нового блюда администратором
app.post('/api/dishes', (req, res) => {
  const { role } = req.query; // Получаем роль из параметров запроса
  
  // Проверяем права администратора
  if (role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Доступ запрещен. Требуются права администратора.' 
    });
  }
  
  const { 
    name, description, composition, price, 
    image_url, category_id, weight, is_available 
  } = req.body;
  
  // Проверяем обязательные поля
  if (!name || !composition || !price || !category_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Не все обязательные поля заполнены' 
    });
  }
  
  // Вставляем новое блюдо
  db.run(
    `INSERT INTO Dishes 
     (name, description, composition, price, image_url, category_id, weight, is_available) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name, 
      description || null, 
      composition, 
      price, 
      image_url || null, 
      category_id, 
      weight || null, 
      is_available !== false ? 1 : 0
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Ошибка при создании блюда', 
          error: err.message 
        });
      }
      
      const dishId = this.lastID;
      
      // Получаем созданное блюдо и возвращаем его
      db.get('SELECT * FROM Dishes WHERE id = ?', [dishId], (err, dish) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            message: 'Блюдо создано, но не удалось получить его данные', 
            error: err.message 
          });
        }
        
        res.json({ 
          success: true, 
          message: 'Блюдо успешно создано', 
          dish: dish 
        });
      });
    }
  );
});

// Маршрут: Обновление блюда администратором
app.put('/api/dishes/:dishId', (req, res) => {
  const { dishId } = req.params;
  const { role } = req.query; // Получаем роль из параметров запроса
  
  // Проверяем права администратора
  if (role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Доступ запрещен. Требуются права администратора.' 
    });
  }
  
  const { 
    name, description, composition, price, 
    image_url, category_id, weight, is_available 
  } = req.body;
  
  // Проверяем обязательные поля
  if (!name || !composition || !price || !category_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Не все обязательные поля заполнены' 
    });
  }
  
  // Обновляем блюдо
  db.run(
    `UPDATE Dishes 
     SET name = ?, description = ?, composition = ?, price = ?, 
         image_url = ?, category_id = ?, weight = ?, is_available = ? 
     WHERE id = ?`,
    [
      name, 
      description || null, 
      composition, 
      price, 
      image_url || null, 
      category_id, 
      weight || null, 
      is_available !== false ? 1 : 0,
      dishId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Ошибка при обновлении блюда', 
          error: err.message 
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Блюдо не найдено' 
        });
      }
      
      // Получаем обновленное блюдо и возвращаем его
      db.get('SELECT * FROM Dishes WHERE id = ?', [dishId], (err, dish) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            message: 'Блюдо обновлено, но не удалось получить его данные', 
            error: err.message 
          });
        }
        
        res.json({ 
          success: true, 
          message: 'Блюдо успешно обновлено', 
          dish: dish 
        });
      });
    }
  );
});

// Маршрут: обновить статус заказа (только для администратора)
app.put('/api/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status, role } = req.body;
  
  // Допустимые статусы заказа
  const validStatuses = [
    'Новый',
    'Принят',
    'Готовится',
    'В пути', 
    'Доставлен',
    'Отменен'
  ];
  
  // Проверяем права администратора
  if (role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Доступ запрещен. Требуются права администратора.' 
    });
  }
  
  // Проверяем корректность статуса
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Указан некорректный статус заказа',
      validStatuses: validStatuses
    });
  }
  
  // Обновляем статус заказа
  db.run(
    'UPDATE Orders SET status = ? WHERE id = ?',
    [status, orderId],
    function(err) {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Ошибка при обновлении статуса заказа',
          error: err.message
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Заказ не найден' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Статус заказа успешно обновлен',
        orderId: orderId,
        status: status
      });
    }
  );
});

// Маршрут: получить все заказы (только для администратора)
app.get('/api/orders', (req, res) => {
  const { role } = req.query;
  
  // Проверяем права администратора
  if (role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Доступ запрещен. Требуются права администратора.' 
    });
  }
  
  // Получаем все заказы, сортируя по дате (новые сверху)
  db.all('SELECT * FROM Orders ORDER BY order_date DESC', (err, orders) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Ошибка при получении списка заказов',
        error: err.message 
      });
    }
    
    if (orders.length === 0) {
      return res.json({ 
        success: true, 
        orders: [] 
      });
    }
    
    // Для каждого заказа получаем его элементы
    let processed = 0;
    orders.forEach((order, index) => {
      db.all(
        `SELECT oi.*, d.name, d.composition, d.image_url FROM OrderItems oi 
         JOIN Dishes d ON oi.dish_id = d.id 
         WHERE oi.order_id = ?`,
        [order.id],
        (err, items) => {
          processed++;
          
          if (err) {
            return res.status(500).json({ 
              success: false, 
              message: 'Ошибка при получении элементов заказа',
              error: err.message 
            });
          }
          
          orders[index].items = items;
          
          // Если все заказы обработаны, отправляем ответ
          if (processed === orders.length) {
            res.json({ 
              success: true, 
              orders: orders 
            });
          }
        }
      );
    });
  });
});

// Поиск заказов по номеру телефона (публичный)
app.get('/api/orders/by-phone/:phone', (req, res) => {
  const phone = req.params.phone;
  db.all('SELECT * FROM Orders WHERE phone = ?', [phone], (err, orders) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Ошибка при поиске заказов', error: err.message });
    }
    if (orders.length === 0) {
      return res.json({ success: true, orders: [] });
    }
    // Для каждого заказа получаем его элементы
    let processed = 0;
    orders.forEach((order, index) => {
      db.all(
        `SELECT oi.*, d.name, d.composition FROM OrderItems oi 
         JOIN Dishes d ON oi.dish_id = d.id 
         WHERE oi.order_id = ?`,
        [order.id],
        (err, items) => {
          processed++;
          if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка при получении элементов заказа', error: err.message });
          }
          orders[index].items = items;
          if (processed === orders.length) {
            res.json({ success: true, orders });
          }
        }
      );
    });
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
}); 