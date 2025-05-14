import React from 'react';

function AboutPage() {
  return (
    <div className="brand-block about-page-block">
      <div className="brand-title">Рестик</div>
      <div className="main-content-wrapper">
        <div className="about-section">
          <h2>О нас</h2>
          <div className="about-text">Небольшая доставка еды в г. Новополоцк специализируемся на вкусных и полезных блюдах.</div>
          <h2>Доставка</h2>
          <div className="about-text">Доставка доступна: только по Витебской области.<br/>Доставка осуществляется: с 08:00 до 22:00<br/>Расчётное время доставки: около 25 - 50 минут.</div>
          <h2>Стоимость доставки</h2>
          <div className="about-text">Полоцк/Новополоцк: бесплатно.<br/>До 50км от Полоцка: 3 BYN.<br/>Другие города: 6 BYN.</div>
        </div>
      </div>
      <div className="footer-block">
        <div>С уважением:</div>
        <div>ЗАО «RestikGroup» © 2025</div>
      </div>
    </div>
  );
}

export default AboutPage; 