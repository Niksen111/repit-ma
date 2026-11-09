export function renderAbout(): string {
  return `<main class="about-page">
    <section class="about-intro" aria-labelledby="about-title">
      <p class="eyebrow">Repitma · учимся вместе</p>
      <h1 id="about-title">О проекте</h1>
      <p class="teacher-lead">Repitma объединяет преподавателей и учеников: помогает найти своего репетитора и держать всё для занятий в одном месте.</p>
      <ul class="about-features" aria-label="Возможности проекта">
        <li><h2>Расписание под рукой</h2><p>Ближайшие занятия, календарь и регулярные встречи — чтобы планировать учёбу было проще.</p></li>
        <li><h2>Материалы в одном месте</h2><p>Темы уроков, конспекты и файлы сохраняются в курсе и всегда доступны ученику.</p></li>
        <li><h2>Домашние задания и обратная связь</h2><p>Ученик отправляет решение, а преподаватель проверяет его и оставляет оценку, комментарий и файлы.</p></li>
        <li><h2>Понятный учёт занятий</h2><p>Проведённые уроки, отметки об оплате и чеки помогают следить за занятиями.</p></li>
      </ul>
    </section>
    <section class="about-teachers" aria-labelledby="about-teachers-title">
      <div class="section-title"><p class="eyebrow">Знакомьтесь</p><h2 id="about-teachers-title">Наши преподаватели</h2></div>
      <p class="about-teachers-lead">На личных страницах — подробнее о подходе к занятиям, опыте и способах связи.</p>
      <div class="about-teacher-grid">
        <article class="about-teacher-card">
          <div class="about-teacher-photo"><img src="/images/maria-vorobieva-graduation-cropped.webp" alt="Мария Александровна Воробьева" width="1200" height="900" loading="lazy"></div>
          <div class="about-teacher-copy"><p class="eyebrow">Математика</p><h3>Мария Александровна</h3><p>Школьная программа, олимпиады и ЕГЭ. Выпускница СПбГУ, помогает понять и полюбить математику.</p><a class="primary-button" href="https://repit-ma.ru/" aria-label="Страница Марии Александровны">Страница преподавателя <span aria-hidden="true">↗</span></a></div>
        </article>
        <article class="about-teacher-card">
          <div class="about-teacher-photo"><img src="/images/olga-koroleva.jpg" alt="Королева Ольга Евгеньевна" width="960" height="1280" loading="lazy"></div>
          <div class="about-teacher-copy"><p class="eyebrow">Математика</p><h3>Ольга Евгеньевна</h3><p>Подготовка к ЕГЭ с индивидуальной программой, понятными объяснениями и вниманием к прогрессу ученика.</p><a class="primary-button" href="https://okoroleva.repit-ma.ru/" aria-label="Страница Ольги Евгеньевны">Страница преподавателя <span aria-hidden="true">↗</span></a></div>
        </article>
        <article class="about-teacher-card">
          <div class="about-teacher-photo about-teacher-photo-egor"><img src="/images/egor.png" alt="Егор — преподаватель математики" width="960" height="1280" loading="lazy"></div>
          <div class="about-teacher-copy"><p class="eyebrow">Математика</p><h3>Егор</h3><p>Подготовка к ЕГЭ, ОГЭ и олимпиадам. Выпускник СПбГУ, объясняет сложные вещи доступным языком.</p><a class="primary-button" href="https://mathegor.repit-ma.ru/" aria-label="Страница Егора">Страница преподавателя <span aria-hidden="true">↗</span></a></div>
        </article>
      </div>
    </section>
  </main>`
}
