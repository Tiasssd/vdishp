import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к базе данных
const DB_FILE = path.join(__dirname, '..', 'DB', 'main.db');

// Подключение к базе
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err);
    process.exit(1);
  }
  console.log('База данных подключена для проверки.');
  
  // Получение информации о структуре таблицы Users
  db.all("PRAGMA table_info(Users)", (err, rows) => {
    if (err) {
      console.error('Ошибка при получении информации о таблице:', err);
      db.close();
      process.exit(1);
    }
    
    console.log('Структура таблицы Users:');
    rows.forEach(column => {
      console.log(`${column.name} (${column.type}) ${column.notnull ? 'NOT NULL' : ''}`);
    });
    
    // Проверяем наличие поля email
    const emailField = rows.find(column => column.name === 'email');
    if (emailField) {
      console.log('\nПоле email существует в таблице Users.');
    } else {
      console.log('\nПоле email ОТСУТСТВУЕТ в таблице Users!');
      
      // Добавляем поле email, если его нет
      db.run('ALTER TABLE Users ADD COLUMN email TEXT', (err) => {
        if (err) {
          console.error('Ошибка при добавлении поля email:', err);
        } else {
          console.log('Поле email успешно добавлено в таблицу Users.');
        }
        
        // Проверяем данные пользователя с ID 2
        db.get('SELECT * FROM Users WHERE id = 2', (err, user) => {
          if (err) {
            console.error('Ошибка при получении данных пользователя:', err);
          } else {
            console.log('\nДанные пользователя с ID 2:');
            console.log(user);
          }
          db.close();
        });
      });
    }
    
    if (emailField) {
      // Если поле email существует, проверяем данные пользователя
      db.get('SELECT * FROM Users WHERE id = 2', (err, user) => {
        if (err) {
          console.error('Ошибка при получении данных пользователя:', err);
        } else {
          console.log('\nДанные пользователя с ID 2:');
          console.log(user);
        }
        db.close();
      });
    }
  });
}); 