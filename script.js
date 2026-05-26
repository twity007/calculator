document.addEventListener('DOMContentLoaded', () => {
    // --- Константы и Данные ---

    // Базовая потребность в воде (л/м²)
    const BASE_WATER_NEEDS = {
        tomato: 5,
        cucumber: 7,
        potato: 4,
        wheat: 3,
        cabbage: 6
    };

    // Ключи для работы с данными формы
    const CROP_KEY_MAP = {
        tomato: "tomato",
        cucumber: "cucumber",
        potato: "potato",
        wheat: "wheat",
        cabbage: "cabbage"
    };

    // Элементы DOM
    const form = document.getElementById('calcForm');
    const errorMsg = document.getElementById('errorMsg');
    const resultSection = document.getElementById('resultSection');

    const resVolumeEl = document.getElementById('resVolume');
    const resLevelEl = document.getElementById('resLevel');
    const resRecEl = document.getElementById('resRec');

    // --- Логика расчетов ---

    /**
     * Рассчитывает коэффициент корректировки на основе условий
     * @param {Object} data - Объект с данными формы (temp, soil, days)
     * @returns {number} - Итоговый процент надбавки (например, 0.35 для +35%)
     */
    function calculateAdjustmentFactor(data) {
        let adjustment = 0;

        // Температура
        if (data.temp > 30) {
            adjustment += 0.20; // +20%
        } else if (data.temp >= 25 && data.temp <= 30) {
            adjustment += 0.10; // +10%
        }

        // Почва
        if (data.soil === 'sand') {
            adjustment += 0.15; // +15%
        } else if (data.soil === 'clay') {
            adjustment -= 0.10; // -10%
        }

        // Осадки
        if (data.days > 5) {
            adjustment += 0.10; // +10%
        }

        return adjustment;
    }

    /**
     * Определяет уровень потребности во влаге (л/м²)
     * @param {number} litersPerSqm - Литры на квадратный метр
     * @returns {{level: string, className: string}} - Объект с уровнем и классом для бейджа
     */
    function getMoistureLevel(litersPerSqm) {
        if (litersPerSqm < 5) {
            return { level: "Низкий", className: "low" };
        } else if (litersPerSqm <= 10) {
            return { level: "Средний", className: "medium" };
        } else {
            return { level: "Высокий", className: "high" };
        }
    }

    /**
     * Генерирует текстовую рекомендацию для полива
     * @param {string} cropKey - Ключ выбранной культуры (например, 'tomato')
     * @param {{level: string, className: string}} moistureLevelObj - Объект с уровнем влаги
     * @returns {string} - Текстовая рекомендация
     */
    function getRecommendation(cropKey, moistureLevelObj) {
        let baseText = "";

        // Специфика культуры
        switch(cropKey) {
            case 'tomato':
                baseText = "Томаты не любят дождевание. Поливайте строго под корень теплой водой.";
                break;
            case 'cucumber':
                baseText = "Огурцы влаголюбивы. Поддерживайте постоянную влажность, избегайте пересыхания.";
                break;
            case 'potato':
                baseText = "Картофель чувствителен к застою воды. Убедитесь в хорошем дренаже.";
                break;
            case 'wheat':
                baseText = "Пшеница засухоустойчива, но нуждается в поливе в период колошения.";
                break;
            case 'cabbage':
                baseText = "Капуста требует обильного полива. Недостаток воды приводит к растрескиванию кочанов.";
                break;
            default:
                baseText = "Следуйте общим рекомендациям по поливу.";
        }

        // Добавление совета по времени
        const timeAdvice = " Желательно проводить полив ранним утром или поздним вечером, чтобы избежать испарения.";

        return baseText + timeAdvice;
    }

    // --- Обработчик событий ---

    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Предотвращаем стандартное поведение отправки формы

        // Сброс предыдущих сообщений и скрытие секции результатов
        errorMsg.style.display = 'none';
        resultSection.style.display = 'none';

        // Получение значений из полей формы
        const cropSelect = document.getElementById('crop');
        const soilSelect = document.getElementById('soil');
        const tempInput = document.getElementById('temp');
        const areaInput = document.getElementById('area');
        const daysInput = document.getElementById('days');

        const cropKey = cropSelect.value; // Ключ культуры
        const soil = soilSelect.value;
        const temp = parseFloat(tempInput.value);
        const area = parseFloat(areaInput.value);
        const days = parseInt(daysInput.value, 10);

        // Валидация полей (дополнительная к HTML5 required)
        if (!cropKey || !soil || isNaN(temp) || isNaN(area) || isNaN(days)) {
            errorMsg.textContent = "Ошибка: Пожалуйста, заполните все поля корректными значениями.";
            errorMsg.style.display = 'block';
            return;
        }

        if (area <= 0) {
            errorMsg.textContent = "Ошибка: Площадь участка должна быть больше 0.";
            errorMsg.style.display = 'block';
            return;
        }

        // Проверка, что выбранная культура есть в BASE_WATER_NEEDS
        if (!BASE_WATER_NEEDS[cropKey]) {
             errorMsg.textContent = "Ошибка: Неизвестная культура.";
             errorMsg.style.display = 'block';
             return;
        }

        // --- Основной расчет ---

        // 1. Базовая потребность на м²
        const baseNeedPerSqm = BASE_WATER_NEEDS[cropKey];

        // 2. Расчет коэффициента корректировки
        const factor = calculateAdjustmentFactor({ temp, soil, days });

        // 3. Итоговая потребность на м² с учетом корректировок
        // Формула: База * (1 + сумма_корректировок)
        let finalNeedPerSqm = baseNeedPerSqm * (1 + factor);

        // 4. Общий объем воды для всего участка
        let totalVolume = finalNeedPerSqm * area;

        // Округление: общий объем до 1 знака после запятой, потребность на м² до 1 знака
        totalVolume = Math.round(totalVolume * 10) / 10;
        finalNeedPerSqm = Math.round(finalNeedPerSqm * 10) / 10;

        // 5. Определение уровня потребности во влаге
        const levelData = getMoistureLevel(finalNeedPerSqm);

        // 6. Генерация текстовой рекомендации
        const recommendationText = getRecommendation(cropKey, levelData);

        // --- Вывод результатов на страницу ---

        resVolumeEl.textContent = `${totalVolume} л`;

        resLevelEl.textContent = `Уровень: ${levelData.level}`;
        // Обновляем классы для бейджа, чтобы установить правильный цвет
        resLevelEl.className = `badge ${levelData.className}`;

        resRecEl.textContent = recommendationText;

        // Показываем секцию результатов
        resultSection.style.display = 'block';

        // Плавный скролл к результату (полезно на мобильных устройствах)
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});