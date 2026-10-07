import { renderReviews, type Review } from './reviews.ts'
import { renderTeacherContacts, teacherSites } from './teacher-site.ts'

export const olgaReviews: readonly Review[] = [
  {
    author: 'София', role: 'Ученица', source: 'Переписка с учениками',
    text: 'Тоже очень хочу поблагодарить за ваш труд ❤️ Все занятия проходили безумно комфортно и интересно, не думала, что мне когда-то понравится математика)) Буду очень скучать по нашим занятиям 😭',
  },
  {
    author: 'Ученик', role: 'Ученик', source: 'Переписка с учениками',
    text: 'Здравствуйте, сегодня я поступил в СПБГЭУ и я хотел бы сказать вам спасибо, за то что подготавливали меня к ЕГЭ, вы все очень понятно мне рассказывали и на самом экзамене я чувствовал себя достаточно уверенно, ещё раз спасибо вам за помощь в подготовке.',
  },
  {
    author: 'Родитель ученика', role: 'Родитель', source: 'Отзыв с другой площадки',
    text: 'Отличный педагог, знает свое дело. Помогает разобраться во многих темах по математике при подготовке к ЕГЭ. Занятия индивидуальные, что очень важно. Уроки проходят в приятной обстановке, учитель располагает к себе. Занятиями довольны. Планируем продолжить заниматься. Спасибо Ольге Евгеньевне!',
  },
  {
    author: 'Ученица', role: 'Ученица', source: 'Переписка с учениками',
    text: 'Я хотела сказать огромное спасибо за то что вы весь год помогали мне с математикой, уроки были очень интересными и весёлыми, а главное всё было очень понятно!!! 💗 Я буду скучать 😭',
  },
  {
    author: 'Ученица', role: 'Ученица', source: 'Переписка с учениками',
    text: 'Привет!! Я с новостями, я писала полугодовую контрольную и исписала 6 листов, у меня все правильно) Без тебя бы такого не было, спасибо большое ❤️',
  },
  {
    author: 'Ученица', role: 'Ученица', source: 'Переписка с учениками',
    text: 'Я все написалаа, был очень легкий вариант, думаю 4 точно получу. Спасибо вам большое, вы лучший репетитор!! 💗',
  },
]

const lessonPrinciples = [
  ['Индивидуальная программа', 'Учитываю уровень, цели и темп каждого ученика.'],
  ['Понимание математики', 'Учимся рассуждать и решать новые задачи, а не действовать по шаблону.'],
  ['Подготовка к реальному экзамену', 'Разбираем все основные типы заданий и учимся избегать типичных ошибок.'],
  ['Контроль прогресса', 'Регулярно отслеживаем результат и корректируем план.'],
  ['Комфортная атмосфера', 'Можно ошибаться, задавать вопросы и не бояться сказать «я не понял».'],
]

export function renderOlgaHome(escape: (text: string) => string): string {
  return `<main class="teacher-page olga-page">
    <section class="teacher-hero">
      <div class="teacher-intro">
        <p class="eyebrow">Репетитор по математике</p>
        <h1>Королева Ольга Евгеньевна</h1>
        <p class="teacher-lead olga-question">Думаете, что математика — просто не ваш предмет?</p>
        <p class="olga-hero-copy">А что, если проблема не в способностях, а в том, что вам так и не объяснили её понятным способом?</p>
        ${renderTeacherContacts(teacherSites.olga, escape)}
      </div>
      <figure class="teacher-photo olga-photo"><div class="teacher-photo-frame"><img src="/images/olga-koroleva.jpg" alt="Королева Ольга Евгеньевна — репетитор по математике" width="960" height="1280" fetchpriority="high"></div><figcaption>Понятная математика · подготовка к ЕГЭ</figcaption></figure>
    </section>
    <section class="teacher-results olga-about">
      <div class="section-title"><p class="eyebrow">Обо мне</p><h2>Опыт, на который<br>можно опереться</h2></div>
      <article class="olga-education"><span class="result-label">Образование</span><h3>Санкт-Петербургский политехнический университет имени Петра Великого</h3></article>
      <div class="olga-stats">
        <article><strong>4 года</strong><p>опыта подготовки к ЕГЭ</p></article>
        <article><strong>4000+</strong><p>часов занятий</p></article>
        <article><strong>80+</strong><p>подготовленных учеников</p></article>
        <article><strong>100</strong><p>баллов — личный результат ЕГЭ 2026</p></article>
      </div>
    </section>
    <section class="teacher-experience olga-results"><div class="teacher-experience-inner">
      <div class="section-title"><p class="eyebrow">Результаты учеников</p><h2>Уверенность в знаниях.<br>Результат на экзамене.</h2></div>
      <div class="results-grid">
        <article class="result-card olga-score"><strong>78 <span>баллов</span></strong><p>Средний балл учеников<br>по профильной математике</p></article>
        <article class="result-card olga-score"><strong>4,7 <span>из 5</span></strong><p>Средняя оценка учеников<br>по базовой математике</p></article>
      </div>
    </div></section>
    <section class="olga-lessons">
      <div class="section-title"><p class="eyebrow">Занятия</p><h2>Понимать, рассуждать<br>и двигаться вперёд</h2></div>
      <div class="olga-principles">${lessonPrinciples.map(([title, text], index) => `<article><span class="principle-number" aria-hidden="true">0${index + 1}</span><div><h3>${escape(title)}</h3><p>${escape(text)}</p></div></article>`).join('')}</div>
    </section>
    ${renderReviews(olgaReviews, teacherSites.olga.withName, escape)}
  </main>`
}
