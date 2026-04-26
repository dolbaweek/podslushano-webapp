// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// API URL (замени на свой Render URL)
const API_URL = 'https://podslush.onrender.com';

// Показываем основной контент
document.querySelector('.container').style.display = 'block';

// Загружаем дашборд при старте
loadDashboard();

// Навигация по табам
function showTab(tabName) {
    // Скрываем все табы
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Убираем active со всех кнопок
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем выбранный таб
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Загружаем данные
    switch(tabName) {
        case 'dashboard': loadDashboard(); break;
        case 'moderation': loadPendingMessages(); break;
        case 'settings': loadSettings(); break;
    }
}

// ========== ДАШБОРД ==========

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/api/dashboard`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const data = await response.json();
        
        // Обновляем статистику
        document.getElementById('todayPosts').textContent = data.today_posts;
        document.getElementById('pendingCount').textContent = data.pending_count;
        document.getElementById('totalUsers').textContent = data.total_users;
        document.getElementById('totalPosts').textContent = data.total_posts;
        
        // Режим работы
        const modeIcon = document.getElementById('modeIcon');
        const modeText = document.getElementById('modeText');
        const intervalText = document.getElementById('intervalText');
        
        if (data.current_mode === 'night' || data.current_mode === 'night_disabled') {
            modeIcon.textContent = '🌙';
            modeText.textContent = 'Ночной режим';
        } else {
            modeIcon.textContent = '☀️';
            modeText.textContent = 'Дневной режим';
        }
        
        intervalText.textContent = `(${data.interval} мин)`;
        
        // Последние действия
        const actionsHtml = data.recent_actions.map(action => {
            const date = new Date(action.created_at);
            const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="action-item">
                    ${getActionEmoji(action.action)} ${action.action}
                    ${action.target_id ? ` #${action.target_id}` : ''}
                    <br><small style="color: #98989e">${time} | Админ ${action.admin_id}</small>
                </div>
            `;
        }).join('');
        
        document.getElementById('recentActions').innerHTML = actionsHtml || 'Нет действий';
        
    } catch (error) {
        showNotification('Ошибка загрузки дашборда', 'error');
    }
}

// ========== МОДЕРАЦИЯ ==========

async function loadPendingMessages() {
    try {
        const response = await fetch(`${API_URL}/api/pending`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const data = await response.json();
        
        const messagesHtml = data.messages.map(msg => {
            return `
                <div class="message-item">
                    <div class="message-preview">
                        <div>${getTypeEmoji(msg.type)} ${msg.preview}</div>
                        <div class="message-meta">
                            ${msg.has_links ? '<span class="badge badge-links">🔗</span>' : ''}
                            ${msg.insult_count >= 4 ? `<span class="badge badge-insults">🤬${msg.insult_count}</span>` : ''}
                            ${msg.type === 'poll' ? '<span class="badge badge-poll">📊 Опрос</span>' : ''}
                        </div>
                    </div>
                    <div class="message-actions">
                        <button class="btn btn-approve" onclick="approveMessage(${msg.id})">✅</button>
                        <button class="btn btn-reject" onclick="rejectMessage(${msg.id})">❌</button>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('pendingMessages').innerHTML = messagesHtml || 'Нет сообщений';
        
    } catch (error) {
        showNotification('Ошибка загрузки очереди', 'error');
    }
}

async function approveMessage(msgId) {
    try {
        const response = await fetch(`${API_URL}/api/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ msg_id: msgId, admin_id: getUserId() })
        });
        
        if (response.ok) {
            showNotification('✅ Сообщение одобрено', 'success');
            loadPendingMessages();
        } else {
            throw new Error('Ошибка');
        }
    } catch (error) {
        showNotification('Ошибка одобрения', 'error');
    }
}

async function rejectMessage(msgId) {
    try {
        const response = await fetch(`${API_URL}/api/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ msg_id: msgId, admin_id: getUserId() })
        });
        
        if (response.ok) {
            showNotification('❌ Сообщение отклонено', 'success');
            loadPendingMessages();
        } else {
            throw new Error('Ошибка');
        }
    } catch (error) {
        showNotification('Ошибка отклонения', 'error');
    }
}

// ========== НАСТРОЙКИ ==========

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/api/settings`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const data = await response.json();
        
        document.getElementById('nightMode').checked = data.night_mode === '1';
        document.getElementById('autoMode').checked = data.auto_mode === '1';
        document.getElementById('maintenance').checked = data.maintenance === '1';
        
    } catch (error) {
        showNotification('Ошибка загрузки настроек', 'error');
    }
}

async function toggleSetting(setting) {
    const checkbox = event.target;
    const value = checkbox.checked ? '1' : '0';
    
    try {
        const response = await fetch(`${API_URL}/api/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ [setting]: value })
        });
        
        if (!response.ok) throw new Error('Ошибка');
        
        showNotification('✅ Настройка обновлена', 'success');
        
    } catch (error) {
        showNotification('Ошибка обновления', 'error');
        checkbox.checked = !checkbox.checked; // откатываем
    }
}

// ========== ПОИСК ПОЛЬЗОВАТЕЛЯ ==========

async function searchUser() {
    const query = document.getElementById('userSearch').value.trim();
    if (!query) return;
    
    try {
        const response = await fetch(`${API_URL}/api/users/search?q=${query}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Ошибка');
        
        const data = await response.json();
        
        if (data.users && data.users.length > 0) {
            const user = data.users[0];
            document.getElementById('userResult').innerHTML = `
                <h3>👤 ${user.first_name || 'Пользователь'}</h3>
                <p>ID: ${user.user_id}</p>
                <p>Username: @${user.username || 'нет'}</p>
                <p>Статус: ${user.banned ? '⛔ Забанен' : user.mute_until ? '🔇 В муте' : '✅ Активен'}</p>
            `;
        } else {
            document.getElementById('userResult').innerHTML = 'Пользователь не найден';
        }
        
    } catch (error) {
        showNotification('Ошибка поиска', 'error');
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function getAuthHeaders() {
    return {
        'X-Telegram-Auth': tg.initData
    };
}

function getUserId() {
    // Извлекаем user_id из initData
    const params = new URLSearchParams(tg.initData);
    const user = JSON.parse(params.get('user') || '{}');
    return user.id || 0;
}

function getActionEmoji(action) {
    const emojis = {
        'approve': '✅',
        'reject': '❌',
        'mute': '🔇',
        'ban': '🔨',
        'unban': '✅',
        'unmute': '🔊',
        'skip': '⏭',
        'reply': '💬'
    };
    return emojis[action] || '📌';
}

function getTypeEmoji(type) {
    const emojis = {
        'photo': '📸',
        'video': '🎥',
        'poll': '📊'
    };
    return emojis[type] || '📝';
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Обработка темы Telegram
if (tg.colorScheme === 'dark') {
    document.body.style.backgroundColor = '#1c1c1e';
} else {
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#000000';
}

// Закрытие Web App
tg.onEvent('mainButtonClicked', () => {
    tg.close();
});