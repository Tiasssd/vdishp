#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sqlite3
import urllib.request
import urllib.parse
import re

def sanitize_filename(filename):
    """Удаляет недопустимые символы из имени файла"""
    # Заменяем недопустимые символы на "_"
    return re.sub(r'[\\/*?:"<>|]', "_", filename)

def download_images():
    # Путь к базе данных
    db_path = os.path.join('DB', 'main.db')
    
    # Создаем папку для изображений, если она не существует
    images_folder = 'dishes_images'
    if not os.path.exists(images_folder):
        os.makedirs(images_folder)
    
    # Подключаемся к БД
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Получаем все блюда с их URL изображений
    cursor.execute("SELECT name, image_url FROM Dishes")
    dishes = cursor.fetchall()
    
    print(f"Найдено {len(dishes)} блюд. Начинаю скачивание изображений...")
    
    # Скачиваем изображения
    for dish_name, image_url in dishes:
        if not image_url:
            print(f"У блюда '{dish_name}' отсутствует URL изображения. Пропускаю.")
            continue
        
        # Получаем расширение файла из URL
        extension = os.path.splitext(urllib.parse.urlparse(image_url).path)[1]
        if not extension:
            extension = '.jpg'  # Если расширение не определено, используем .jpg по умолчанию
        
        # Формируем имя файла
        sanitized_name = sanitize_filename(dish_name)
        filename = f"{sanitized_name}{extension}"
        file_path = os.path.join(images_folder, filename)
        
        try:
            # Скачиваем изображение
            print(f"Скачиваю изображение для блюда '{dish_name}'...")
            urllib.request.urlretrieve(image_url, file_path)
            print(f"Изображение для '{dish_name}' успешно сохранено как '{filename}'")
        except Exception as e:
            print(f"Ошибка при скачивании изображения для '{dish_name}': {e}")
    
    conn.close()
    print("Скачивание завершено!")

if __name__ == "__main__":
    download_images() 