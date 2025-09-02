// Вспомогательные функции для работы с формами
async function selectOptionByText(options, answer) {
  const lowerAnswer = answer.toLowerCase();
  for (const option of options) {
    let labelText = '';
    const label = option.closest('label');
    if (label && label.textContent) {
        labelText = label.textContent.toLowerCase();
    }
    if (labelText.includes(lowerAnswer)) {
      option.click();
      console.log('Выбрана опция:', label.textContent.trim());
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    }
  }
  if (options.length > 0) {
    options[0].click();
    console.log('Выбрана первая опция по умолчанию');
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
  return false;
}

async function handleSelectField(select, answer) {
  const options = Array.from(select.options);
  const lowerAnswer = answer.toLowerCase();
  const matchingOption = options.find(opt => opt.text.toLowerCase().includes(lowerAnswer));
  if (matchingOption) {
    select.value = matchingOption.value;
  } else if (options.length > 1) {
    select.value = options[1].value; 
    console.log('Выбрана первая доступная опция по умолчанию');
  }
  select.dispatchEvent(new Event('change', { bubbles: true }));
  console.log('Выбрана опция в select:', select.value);
  return true;
}

// Улучшенный поиск релевантных разделов резюме
async function findRelevantSections(question, resumeText, topK = 2) {
  if (!resumeText) return [];
  
  try {
    // Разбиваем резюме на более мелкие смысловые блоки
    const sections = splitResumeIntoMeaningfulChunks(resumeText);
    const questionKeywords = extractKeywords(question);
    
    if (questionKeywords.length === 0) return [];
    
    // Считаем релевантность каждого раздела
    const scoredSections = sections.map(section => {
      const sectionKeywords = extractKeywords(section);
      const score = calculateRelevance(questionKeywords, sectionKeywords);
      return { section, score };
    });
    
    // Фильтруем только достаточно релевантные разделы (порог 0.2)
    const relevantSections = scoredSections
      .filter(item => item.score >= 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => item.section);
    
    console.log(`Найдено релевантных разделов: ${relevantSections.length}, лучший score: ${scoredSections[0]?.score || 0}`);
    return relevantSections;
  } catch (error) {
    console.error('Ошибка при поиске релевантных разделов:', error);
    return [];
  }
}

// Улучшенное разбиение резюме на смысловые блоки
function splitResumeIntoMeaningfulChunks(resumeText) {
  if (!resumeText) return [];
  
  // Разбиваем по заголовкам и подзаголовкам
  const chunks = [];
  const lines = resumeText.split('\n');
  let currentChunk = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Если строка похожа на заголовок (жирный, большой шрифт и т.д.)
    if (isLikelyHeading(trimmedLine)) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }
    
    if (trimmedLine) {
      currentChunk += (currentChunk ? ' ' : '') + trimmedLine;
    }
    
    // Если текущий чанк стал слишком большим, сохраняем его
    if (currentChunk.length > 300) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks.filter(chunk => chunk.length > 20); // Отфильтровываем слишком короткие чанки
}

// Проверка, похожа ли строка на заголовок
function isLikelyHeading(line) {
  if (line.length > 50) return false;
  
  // Паттерны заголовков
  const headingPatterns = [
    /^[A-ZА-Я][A-ZА-Я\s]+$/u, // Все слова в верхнем регистре
    /^[#*_-]{3,}/, // Разделители
    /^(Опыт работы|Образование|Навыки|Проекты|Достижения|Курсы|Рекомендации)/i,
    /^[0-9]{4}\s*[-–]\s*[0-9]{4}/, // Даты периода
  ];
  
  return headingPatterns.some(pattern => pattern.test(line));
}

// Извлечение ключевых слов с улучшенной фильтрацией
function extractKeywords(text) {
  if (!text) return [];
  
  // Убираем специальные символы, но сохраняем важные (например, # для языков программирования)
  const cleanedText = text.toLowerCase()
    .replace(/[^\w\s#+]/g, '') // Убираем все, кроме букв, цифр, пробелов и #
    .replace(/\s+/g, ' ');
  
  const words = cleanedText.split(/\s+/)
    .filter(word => {
      // Фильтруем стоп-слова и слишком короткие слова
      return word.length > 3 && 
             !isStopWord(word) && 
             !isCommonWord(word);
    });
  
  return [...new Set(words)]; // Убираем дубликаты
}

// Проверка на стоп-слова
function isStopWord(word) {
  const stopWords = [
    'который', 'которая', 'которое', 'которые', 'очень', 'какой', 'какая', 
    'какое', 'какие', 'это', 'того', 'тому', 'такой', 'такая', 'такое', 'такие',
    'также', 'всего', 'после', 'перед', 'когда', 'потому', 'чтобы', 'может',
    'можно', 'нужно', 'свои', 'свой', 'своей', 'своих', 'наш', 'наша', 'наше', 'наши'
  ];
  return stopWords.includes(word);
}

// Проверка на общеупотребительные слова, не несущие смысловой нагрузки
function isCommonWord(word) {
  const commonWords = [
    'работа', 'опыт', 'проект', 'компания', 'задача', 'разработка', 'время',
    'год', 'лет', 'месяц', 'неделя', 'день', 'раз', 'рубль', 'доллар', 'евро',
    'процент', 'количество', 'уровень', 'стаж', 'резюме', 'кандидат', 'сотрудник'
  ];
  return commonWords.includes(word);
}

// Улучшенный расчет релевантности
function calculateRelevance(questionKeywords, sectionKeywords) {
  if (questionKeywords.length === 0 || sectionKeywords.length === 0) return 0;
  
  // Взвешиваем ключевые слова вопроса
  const questionWeights = {};
  questionKeywords.forEach(keyword => {
    questionWeights[keyword] = 1.0;
    
    // Повышаем вес для специфических терминов
    if (isSpecificTerm(keyword)) {
      questionWeights[keyword] = 2.0;
    }
  });
  
  // Считаем взвешенные совпадения
  let totalWeight = 0;
  let matchedWeight = 0;
  
  for (const [keyword, weight] of Object.entries(questionWeights)) {
    totalWeight += weight;
    if (sectionKeywords.includes(keyword)) {
      matchedWeight += weight;
    }
  }
  
  if (totalWeight === 0) return 0;
  
  return matchedWeight / totalWeight;
}

// Проверка, является ли слово специфическим термином
function isSpecificTerm(word) {
  // Специфические термины (можно расширить)
  const specificTerms = [
    'javascript', 'python', 'java', 'php', 'html', 'css', 'react', 'angular', 'vue',
    'node', 'express', 'django', 'flask', 'mysql', 'postgresql', 'mongodb', 'redis',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'jenkins', 'webpack',
    'photoshop', 'figma', 'sketch', 'marketing', 'seo', 'smm', 'crm', 'erp',
    'analytics', 'bigdata', 'machinelearning', 'ai', 'nlp', 'computer vision'
  ];
  
  return specificTerms.includes(word);
}

// Функция для пост-обработки ответов ИИ
function humanizeAIResponse(response, style = 'professional') {
  if (!response) return response;
  
  let humanized = response;
  
  // Общие улучшения для всех стилей
  const generalReplacements = [
    [/Да, у меня есть опыт работы с/gi, 'Работал с'],
    [/Я имею опыт в/gi, 'Занимался'],
    [/Я обладаю навыками/gi, 'Владею'],
    [/Я являюсь специалистом в/gi, 'Специализируюсь на'],
    [/осуществлял настройку и оптимизацию/gi, 'настраивал и оптимизировал'],
    [/для достижения коммерческих целей/gi, 'для бизнес-задач'],
    [/Мои ключевые навыки включают/gi, 'Знаю'],
    [/эффективное использование инструментов/gi, 'работал с'],
    [/привлечения лидов и повышения ROI/gi, 'привлекал клиентов и увеличивал эффективность'],
    [/Вели ли ранее/gi, 'Вел ли'],
    [/осуществлял продвижение и организацию публикаций/gi, 'продвигал и публиковал'],
    [/для повышения вовлеченности и охвата/gi, 'чтобы увеличить аудиторию и вовлечение'],
    [/у меня есть/gi, 'есть'],
    [/я могу/gi, 'могу'],
    [/я умею/gi, 'умею']
  ];
  
  generalReplacements.forEach(([pattern, replacement]) => {
    humanized = humanized.replace(pattern, replacement);
  });
  
  // Стилевые улучшения
  if (style === 'concise') {
    // Сделать ответ более кратким
    humanized = humanized
      .replace(/\s*\.\s*/g, '. ')
      .replace(/\s*,/g, ',')
      .replace(/\s{2,}/g, ' ');
  } 
  else if (style === 'natural') {
    // Сделать ответ более разговорным
    const naturalReplacements = [
      [/Работал с/gi, 'Работал с'],
      [/Занимался/gi, 'Занимался'],
      [/Владею/gi, 'Владею'],
      [/Специализируюсь на/gi, 'Работаю с'],
      [/настраивал и оптимизировал/gi, 'занимался настройкой и оптимизацией'],
      [/Знаю/gi, 'Работал с']
    ];
    
    naturalReplacements.forEach(([pattern, replacement]) => {
      humanized = humanized.replace(pattern, replacement);
    });
  }
  
  // Убираем двойные пробелы
  humanized = humanized.replace(/\s{2,}/g, ' ');
  
  return humanized.trim();
}