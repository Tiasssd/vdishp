#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sqlite3
import re

def sanitize_filename(filename):
    """Удаляет недопустимые символы из имени файла"""
    return re.sub(r'[\\/*?:"<>|]', "_", filename)

def get_local_image_path(dish_name, images_folder):
    """Находит изображение по названию блюда в указанной папке"""
    sanitized_name = sanitize_filename(dish_name)
    
    # Проверяем все возможные расширения
    extensions = ['.jpg', '.jpeg', '.png', '.webp']
    
    # Сначала проверяем точное совпадение имени файла
    for ext in extensions:
        image_path = os.path.join(images_folder, f"{sanitized_name}{ext}")
        if os.path.exists(image_path):
            return f"/dishes_images/{sanitized_name}{ext}"
    
    # Если точного совпадения нет, ищем файл, который начинается с названия блюда
    for filename in os.listdir(images_folder):
        if filename.lower().startswith(sanitized_name.lower()):
            return f"/dishes_images/{filename}"
    
    # Если ничего не нашли, возвращаем None
    return None

def update_image_urls():
    # Путь к базе данных
    db_path = os.path.join('DB', 'main.db')
    
    # Папка с изображениями
    images_folder = 'dishes_images'
    
    if not os.path.exists(images_folder):
        print(f"Ошибка: папка {images_folder} не найдена")
        return
    
    # Подключаемся к БД
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Получаем все блюда с их текущими URL изображений
    cursor.execute("SELECT id, name, image_url FROM Dishes")
    dishes = cursor.fetchall()
    
    print(f"Найдено {len(dishes)} блюд. Начинаю обновление ссылок на изображения...")
    
    updated_count = 0
    not_found_count = 0
    
    # Обновляем ссылки на изображения
    for dish_id, dish_name, current_url in dishes:
        local_path = get_local_image_path(dish_name, images_folder)
        
        if local_path:
            # Обновляем URL в базе данных
            cursor.execute("UPDATE Dishes SET image_url = ? WHERE id = ?", (local_path, dish_id))
            print(f"Обновлено: '{dish_name}' -> {local_path}")
            updated_count += 1
        else:
            print(f"Внимание: Изображение для блюда '{dish_name}' не найдено в папке {images_folder}")
            not_found_count += 1
    
    # Сохраняем изменения
    conn.commit()
    conn.close()
    
    print(f"\nИтого:")
    print(f"Обновлено ссылок: {updated_count}")
    print(f"Не найдено изображений: {not_found_count}")
    print(f"Всего блюд в базе: {len(dishes)}")
    print("Обновление завершено!")

if __name__ == "__main__":
    update_image_urls() 