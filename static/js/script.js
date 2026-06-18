const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');
const volumeValue = document.getElementById('volumeValue');
const stationName = document.getElementById('stationName');
const stationStatus = document.getElementById('stationStatus');
const stationsList = document.getElementById('stationsList');
const stationLogo = document.getElementById('stationLogo');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-icon');
const visualizer = document.getElementById('visualizer');
const stationCount = document.getElementById('stationCount');

let currentStation = null;
let currentIndex = -1;
let isPlaying = false;
let stations = [];
let lastVolume = 80;

// === iOS DETECTION ===
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// === WEB AUDIO API ДЛЯ iOS ===
let audioContext = null;
let gainNode = null;
let sourceNode = null;
let isWebAudioReady = false;

function initWebAudio() {
    if (isWebAudioReady) return;
    
    try {
        // Создаем AudioContext
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Создаем GainNode для контроля громкости
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0.8; // Начальная громкость 80%
        
        // Создаем источник из audio элемента
        sourceNode = audioContext.createMediaElementSource(audioPlayer);
        
        // Соединяем: источник -> gain -> выход
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        isWebAudioReady = true;
        console.log('✅ Web Audio API инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации Web Audio:', error);
        isWebAudioReady = false;
    }
}

function setVolume(value) {
    value = Math.max(0, Math.min(100, value));
    
    if (isWebAudioReady && gainNode) {
        // Для iOS используем Web Audio API
        gainNode.gain.value = value / 100;
        console.log(`🔊 Громкость (Web Audio): ${value}%`);
    } else {
        // Для десктопа используем стандартный метод
        audioPlayer.volume = value / 100;
        console.log(`🔊 Громкость (стандарт): ${value}%`);
    }
    
    volumeSlider.value = value;
    updateVolumeIcon(value);
}

// === ЗАГРУЗКА СТАНЦИЙ ===
async function loadStations() {
    try {
        console.log('📡 Загрузка списка станций...');
        const response = await fetch('/api/stations');
        stations = await response.json();
        // Оставляем только рабочие (известные)
        stations = stations.filter(s => 
            ['Европа Плюс', 'DFM', 'Русское Радио'].includes(s.name)
        );
        renderStations(stations);
        stationCount.textContent = `(${stations.length})`;
        console.log('✅ Загружено станций:', stations.length);
        stations.forEach((s, i) => console.log(`  ${i+1}. ${s.name}`));
        
        // Показываем предупреждение для iOS
        if (isIOS) {
            console.log('📱 Обнаружено iOS устройство');
            const volumeSection = document.querySelector('.volume-section');
            if (volumeSection) {
                const hint = document.createElement('div');
                hint.className = 'ios-volume-hint';
                hint.innerHTML = '💡 <small>На iOS используйте кнопки громкости телефона</small>';
                hint.style.cssText = 'text-align: center; color: var(--text-secondary); font-size: 0.8rem; margin-top: 8px;';
                volumeSection.appendChild(hint);
            }
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки станций:', error);
    }
}

function renderStations(stationsData) {
    console.log('🎨 Отрисовка списка станций...');
    stationsList.innerHTML = '';
    stationsData.forEach((station, index) => {
        const item = document.createElement('div');
        item.className = 'station-item';
        item.dataset.index = index;
        item.innerHTML = `
            <div class="station-item-logo">${station.logo}</div>
            <div class="station-item-name">${station.name}</div>
            <div class="station-item-status" id="status-${index}"></div>
        `;
        item.addEventListener('click', () => {
            console.log(`🖱️ Клик по станции: ${station.name}`);
            selectStation(index);
            playStation();
        });
        stationsList.appendChild(item);
    });
    console.log('✅ Список отрисован');
}

function selectStation(index) {
    if (index < 0 || index >= stations.length) {
        console.warn('⚠️ Неверный индекс станции:', index);
        return;
    }
    
    console.log(`📻 Переключение на станцию ${index + 1}: ${stations[index].name}`);
    currentIndex = index;
    currentStation = stations[index];
    stationName.textContent = currentStation.name;
    stationLogo.textContent = currentStation.logo;
    
    document.querySelectorAll('.station-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
    
    // Скролл к активной станции
    const activeItem = document.querySelector('.station-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    console.log('✅ Станция выбрана:', currentStation.name);
}

function playStation() {
    if (!currentStation) {
        console.warn('⚠️ Нет выбранной станции для воспроизведения');
        stationStatus.textContent = 'Выберите станцию';
        return;
    }
    
    console.log('🎵 Попытка воспроизведения:', currentStation.name);
    console.log('🔗 URL потока:', currentStation.url);
    stationStatus.textContent = 'Загрузка...';
    
    // Инициализируем Web Audio при первом воспроизведении
    if (isIOS && !isWebAudioReady) {
        initWebAudio();
    }
    
    audioPlayer.src = currentStation.url;
    audioPlayer.load();
    
    const playPromise = audioPlayer.play();
    
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                console.log('✅ Воспроизведение началось:', currentStation.name);
                
                // Resume AudioContext если он suspended (требование iOS)
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('✅ AudioContext resumed');
                    });
                }
                
                isPlaying = true;
                playBtn.textContent = '⏸';
                playBtn.classList.add('playing');
                stationStatus.textContent = 'В эфире ●';
                visualizer.classList.add('active');
                updateStatusIndicator(currentIndex, 'working');
            })
            .catch(error => {
                console.error('❌ Ошибка воспроизведения:', error);
                console.error('📝 Тип ошибки:', audioPlayer.error);
                stationStatus.textContent = 'Не работает';
                isPlaying = false;
                playBtn.textContent = '▶';
                playBtn.classList.remove('playing');
                visualizer.classList.remove('active');
                updateStatusIndicator(currentIndex, 'error');
            });
    }
}

function pauseStation() {
    console.log('⏸️ Пауза');
    audioPlayer.pause();
    isPlaying = false;
    playBtn.textContent = '▶';
    playBtn.classList.remove('playing');
    stationStatus.textContent = 'Пауза';
    visualizer.classList.remove('active');
}

function togglePlay() {
    console.log('🎯 Toggle Play/Pause');
    if (isPlaying) {
        pauseStation();
    } else {
        if (currentIndex === -1 && stations.length > 0) {
            console.log('📻 Автовыбор первой станции');
            selectStation(0);
        }
        playStation();
    }
}

function nextStation() {
    if (stations.length === 0) {
        console.warn('⚠️ Нет доступных станций');
        return;
    }
    const nextIndex = (currentIndex + 1) % stations.length;
    console.log(`⏭️ Следующая станция: ${currentIndex + 1} → ${nextIndex + 1}`);
    selectStation(nextIndex);
    if (isPlaying) playStation();
}

function prevStation() {
    if (stations.length === 0) {
        console.warn('⚠️ Нет доступных станций');
        return;
    }
    const prevIndex = (currentIndex - 1 + stations.length) % stations.length;
    console.log(`⏮️ Предыдущая станция: ${currentIndex + 1} → ${prevIndex + 1}`);
    selectStation(prevIndex);
    if (isPlaying) playStation();
}

function updateStatusIndicator(index, status) {
    const el = document.getElementById(`status-${index}`);
    if (el) {
        el.className = 'station-item-status ' + status;
        console.log(`📊 Статус станции ${index}: ${status}`);
    }
}

// === ГРОМКОСТЬ ===
function updateVolumeIcon(value) {
    if (value == 0) {
        volumeIcon.textContent = '🔇';
    } else if (value < 30) {
        volumeIcon.textContent = '🔈';
    } else if (value < 70) {
        volumeIcon.textContent = '🔉';
    } else {
        volumeIcon.textContent = '🔊';
    }
    volumeValue.textContent = value + '%';
}

function toggleMute() {
    console.log('🔇 Toggle Mute');
    if (audioPlayer.volume > 0 || (gainNode && gainNode.gain.value > 0)) {
        lastVolume = volumeSlider.value;
        console.log(`💾 Сохранена громкость: ${lastVolume}%`);
        setVolume(0);
    } else {
        console.log(`♻️ Восстановлена громкость: ${lastVolume}%`);
        setVolume(lastVolume);
    }
}

// === ТЕМА ===
function loadTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    console.log('🎨 Загружена тема:', saved);
    document.documentElement.setAttribute('data-theme', saved);
    themeIcon.textContent = saved === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    console.log(`🌓 Смена темы: ${current} → ${next}`);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
}

// === ГОРЯЧИЕ КЛАВИШИ ===
document.addEventListener('keydown', (e) => {
    // Игнорируем если ввод в input
    if (e.target.tagName === 'INPUT') return;
    
    console.log(`⌨️ Клавиша: ${e.code}`);
    
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            console.log('⏯ Play/Pause (Space)');
            togglePlay();
            break;
        case 'ArrowUp':
            e.preventDefault();
            console.log('⏮ Предыдущая (↑)');
            prevStation();
            break;
        case 'ArrowDown':
            e.preventDefault();
            console.log('⏭ Следующая (↓)');
            nextStation();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            console.log('🔉 Громкость - (←)');
            setVolume(parseInt(volumeSlider.value) - 5);
            break;
        case 'ArrowRight':
            e.preventDefault();
            console.log('🔊 Громкость + (→)');
            setVolume(parseInt(volumeSlider.value) + 5);
            break;
        case 'KeyT':
            console.log('🌓 Смена темы (T)');
            toggleTheme();
            break;
        case 'KeyM':
            console.log('🔇 Mute (M)');
            toggleMute();
            break;
        case 'Digit1': case 'Digit2': case 'Digit3':
        case 'Digit4': case 'Digit5': case 'Digit6':
        case 'Digit7': case 'Digit8': case 'Digit9':
            const num = parseInt(e.code.replace('Digit', '')) - 1;
            if (num < stations.length) {
                console.log(`🔢 Быстрый выбор станции ${num + 1}`);
                selectStation(num);
                playStation();
            } else {
                console.warn(`⚠️ Станции ${num + 1} не существует`);
            }
            break;
        default:
            break;
    }
});

// === СОБЫТИЯ ===
playBtn.addEventListener('click', () => {
    console.log('🖱️ Клик по кнопке Play');
    togglePlay();
});

prevBtn.addEventListener('click', () => {
    console.log('🖱️ Клик по кнопке Prev');
    prevStation();
    if(isPlaying) playStation();
});

nextBtn.addEventListener('click', () => {
    console.log('🖱️ Клик по кнопке Next');
    nextStation();
    if(isPlaying) playStation();
});

volumeSlider.addEventListener('input', (e) => {
    setVolume(parseInt(e.target.value));
});

themeToggle.addEventListener('click', () => {
    console.log('🖱️ Клик по кнопке смены темы');
    toggleTheme();
});

audioPlayer.addEventListener('error', (e) => {
    console.error('🎧 Audio Error:', audioPlayer.error);
    let errorMsg = 'Ошибка потока';
    switch(audioPlayer.error.code) {
        case 1: errorMsg = 'MEDIA_ERR_ABORTED'; break;
        case 2: errorMsg = 'MEDIA_ERR_NETWORK'; break;
        case 3: errorMsg = 'MEDIA_ERR_DECODE'; break;
        case 4: errorMsg = 'MEDIA_ERR_SRC_NOT_SUPPORTED'; break;
    }
    console.error('📝 Описание:', errorMsg);
    stationStatus.textContent = errorMsg;
    visualizer.classList.remove('active');
});

audioPlayer.addEventListener('waiting', () => {
    console.log('⏳ Буферизация...');
    stationStatus.textContent = 'Буферизация...';
});

audioPlayer.addEventListener('playing', () => {
    console.log('▶️ Воспроизведение началось');
    stationStatus.textContent = 'В эфире ●';
    visualizer.classList.add('active');
});

audioPlayer.addEventListener('pause', () => {
    console.log('⏸️ Воспроизведение остановлено');
    visualizer.classList.remove('active');
});

audioPlayer.addEventListener('play', () => {
    console.log('🎵 Audio play event');
});

// === ИНИЦИАЛИЗАЦИЯ ===
console.log('🚀 Инициализация приложения...');
console.log('📱 iOS устройство:', isIOS ? 'Да' : 'Нет');
loadTheme();
setVolume(80);
loadStations();
console.log('✅ Приложение готово к работе');

// Service Worker
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    console.log('🔧 Регистрация Service Worker...');
    navigator.serviceWorker.register('/static/js/service-worker.js')
        .then(() => console.log('✅ Service Worker зарегистрирован'))
        .catch((err) => console.error('❌ Ошибка регистрации SW:', err));
} else {
    if (window.location.protocol === 'https:') {
        console.warn('⚠️ Service Worker не поддерживается браузером');
    } else {
        console.log('ℹ️ Service Worker требует HTTPS (не регистрируется на HTTP)');
    }
}

// Скрываем горячие клавиши на iOS
if (isIOS) {
    console.log('📱 Обнаружено iOS устройство, скрываем горячие клавиши');
    const hotkeysInfo = document.querySelector('.hotkeys-info');
    if (hotkeysInfo) {
        hotkeysInfo.style.display = 'none';
    }
}