// ==================== APP.JS - ПОЛНАЯ ЛОГИКА ====================

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Определяем API URL
const API_URL = 'https://podslush.onrender.com'; // ЗАМЕНИ НА СВОЙ URL

// Кэш данных
let currentFilter = 'all';
let messagesCache = [];
let isSuperAdmin = false;
let adminId = 0;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Парсим данные из Telegram
    try {
        const initData = tg.initData || '';
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            adminId = user.id || 0;
        }
    } catch(e) {
        console.error('Error parsing user data:', e);
    }
    
    // Показываем приложение
    document.getElementById('splash').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    
    // Применяем тему Telegram
    applyTelegramTheme();
    
    // Настройка навигации
    setupNavigation();
    
    // Настройка фильтров
    setupFilters();
    
    // Загружаем начальные данные
    loadDashboard();
    loadModeration();
    loadSettings();
    
    // Определяем роль админа
    checkAdminRole();
    
    // Обновляем счетчики каждые 30 секунд
    setInterval(updateQuickStats, 30000);
    
    tg.ready();
}

function applyTelegramTheme() {
    const style = getComputedStyle(document.body);
    // Telegram темы можно применить здесь если нужно
    if (tg.colorScheme === 'light') {
        // Светлая тема (опционально)
    }
}

// ==================== НАВИГАЦИЯ ====================

function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    // Обновляем кнопки
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Обновляем контент
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === `tab-${tabName}`);
    });
    
    // Загружаем данные для таба
    switch(tabName) {
        case 'moderation': loadModeration(); break;
        case 'dashboard': loadDashboard(); break;
        case 'settings': loadSettings(); break;
    }
}

// ==================== ФИЛЬТРЫ ====================

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderModerationList();
        });
    });
}

// ==================== ДАШБОРД ====================

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/api/dashboard`, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const data = await response.json();
        
        // Обновляем быстрые статы
        document.getElementById('qsPending').textContent = data.pending_count || 0;
        document.getElementById('qsToday').textContent = data.today_posts || 0;
        document.getElementById('qsUsers').textContent = data.total_users || 0;
        
        // Обновляем счетчик в навигации
        const modBadge = document.getElementById('modBadge');
        modBadge.textContent = data.pending_count > 0 ? data.pending_count : '';
        
        // Обновляем карточки дашборда
        document.getElementById('dashToday').textContent = data.today_posts || 0;
        document.getElementById('dashApproved').textContent = data.total_posts || 0;
        document.getElementById('dashPending').textContent = data.pending_count || 0;
        document.getElementById('dashUsers').textContent = data.total_users || 0;
        
        // Режим работы
        updateModeCard(data.current_mode, data.interval);
        
        // Последние действия
        renderRecentActions(data.recent_actions || []);
        
    } catch (error) {
        console.error('Dashboard error:', error);
        showToast('Ошибка загрузки дашборда', 'error');
    }
}

function updateModeCard(mode, interval) {
    const modeIcon = document.getElementById('modeIcon');
    const modeName = document.getElementById('modeName');
    const modeInterval = document.getElementById('modeInterval');
    const modeStatus = document.getElementById('modeStatus');
    
    if (mode === 'night' || mode === 'night_disabled') {
        modeIcon.textContent = '🌙';
        modeName.textContent = 'Ночной режим';
        modeInterval.textContent = `Интервал: ${interval} мин`;
        modeStatus.textContent = mode === 'night' ? 'Активен' : 'Выключен';
        modeStatus.style.background = mode === 'night' ? 'var(--green-bg)' : 'var(--red-bg)';
        modeStatus.style.color = mode === 'night' ? 'var(--green)' : 'var(--red)';
    } else {
        modeIcon.textContent = '☀️';
        modeName.textContent = 'Дневной режим';
        modeInterval.textContent = `Интервал: ${interval} мин`;
        modeStatus.textContent = mode === 'auto' ? 'Активен' : 'Выключен';
        modeStatus.style.background = mode === 'auto' ? 'var(--green-bg)' : 'var(--red-bg)';
        modeStatus.style.color = mode === 'auto' ? 'var(--green)' : 'var(--red)';
    }
}

function renderRecentActions(actions) {
    const container = document.getElementById('recentActions');
    
    if (!actions.length) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">Нет действий</div>';
        return;
    }
    
    container.innerHTML = actions.slice(0, 15).map(action => {
        const date = new Date(action.created_at);
        const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const emoji = getActionEmoji(action.action);
        
        return `
            <div class="action-item" style="padding:10px;border-bottom:1px solid var(--surface3);font-size:13px">
                <div>${emoji} <b>${action.action}</b> ${action.target_id ? '#' + action.target_id : ''}</div>
                <div style="color:var(--text3);font-size:11px;margin-top:2px">${time} • Админ ${action.admin_id}</div>
            </div>
        `;
    }).join('');
}

// ==================== МОДЕРАЦИЯ ====================

async function loadModeration() {
    const container = document.getElementById('moderationList');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Загрузка...</p></div>';
    
    try {
        const response = await fetch(`${API_URL}/api/pending`, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const data = await response.json();
        messagesCache = data.messages || [];
        
        renderModerationList();
        
        // Обновляем счетчик
        document.getElementById('modBadge').textContent = messagesCache.length || '';
        document.getElementById('qsPending').textContent = messagesCache.length;
        
    } catch (error) {
        console.error('Moderation error:', error);
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--red)">Ошибка загрузки очереди</div>';
    }
}

function renderModerationList() {
    const container = document.getElementById('moderationList');
    
    let filtered = messagesCache;
    
    // Применяем фильтр
    if (currentFilter !== 'all') {
        filtered = messagesCache.filter(msg => msg.type === currentFilter);
    }
    
    if (!filtered.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--text3)">
                <div style="font-size:48px;margin-bottom:12px">📭</div>
                <p>${currentFilter === 'all' ? 'Очередь пуста' : 'Нет сообщений этого типа'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(msg => {
        const badges = [];
        if (msg.has_links) badges.push('<span class="badge badge-links">🔗 Ссылки</span>');
        if (msg.insult_count >= 4) badges.push(`<span class="badge badge-insults">🤬 ${msg.insult_count}</span>`);
        if (msg.type === 'poll') badges.push('<span class="badge badge-poll">📊 Опрос</span>');
        if (msg.type === 'photo') badges.push('<span class="badge badge-photo">📸 Фото</span>');
        
        const date = new Date(msg.created_at);
        const timeAgo = getTimeAgo(date);
        
        return `
            <div class="message-card">
                <div class="message-card-header">
                    <div class="message-type">
                        <span>${getTypeIcon(msg.type)}</span>
                        <span>${getTypeName(msg.type)}</span>
                    </div>
                    <div class="message-id">#${msg.id} • ${timeAgo}</div>
                </div>
                <div class="message-card-body" onclick="openMessageDetail(${msg.id})">
                    <div class="message-preview">${escapeHtml(msg.preview || 'Без текста')}</div>
                    ${badges.length ? `<div class="message-badges">${badges.join('')}</div>` : ''}
                </div>
                <div class="message-card-actions">
                    <button class="btn-action btn-approve" onclick="event.stopPropagation(); approveMessage(${msg.id})">
                        ✅ Одобрить
                    </button>
                    <button class="btn-action btn-reject" onclick="event.stopPropagation(); rejectMessage(${msg.id})">
                        ❌ Отклонить
                    </button>
                    <button class="btn-action btn-skip" onclick="event.stopPropagation(); skipMessage(${msg.id})">
                        ⏭
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function approveMessage(msgId) {
    if (!confirm('Одобрить сообщение #' + msgId + '?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg_id: msgId, admin_id: adminId })
        });
        
        if (response.ok) {
            showToast('✅ Сообщение #' + msgId + ' одобрено!', 'success');
            messagesCache = messagesCache.filter(m => m.id !== msgId);
            renderModerationList();
            updateQuickStats();
        } else {
            throw new Error('Ошибка');
        }
    } catch (error) {
        showToast('❌ Ошибка при одобрении', 'error');
    }
}

async function rejectMessage(msgId) {
    if (!confirm('Отклонить сообщение #' + msgId + '?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg_id: msgId, admin_id: adminId })
        });
        
        if (response.ok) {
            showToast('❌ Сообщение #' + msgId + ' отклонено', 'info');
            messagesCache = messagesCache.filter(m => m.id !== msgId);
            renderModerationList();
            updateQuickStats();
        } else {
            throw new Error('Ошибка');
        }
    } catch (error) {
        showToast('❌ Ошибка при отклонении', 'error');
    }
}

async function skipMessage(msgId) {
    try {
        const response = await fetch(`${API_URL}/api/skip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg_id: msgId, admin_id: adminId })
        });
        
        if (response.ok) {
            showToast('⏭ Сообщение пропущено', 'info');
            messagesCache = messagesCache.filter(m => m.id !== msgId);
            renderModerationList();
            updateQuickStats();
        } else {
            throw new Error('Ошибка');
        }
    } catch (error) {
        showToast('❌ Ошибка', 'error');
    }
}

function refreshModeration() {
    loadModeration();
    showToast('🔄 Обновлено', 'info');
}

// ==================== ДЕТАЛИ СООБЩЕНИЯ ====================

function openMessageDetail(msgId) {
    const msg = messagesCache.find(m => m.id === msgId);
    if (!msg) return;
    
    document.getElementById('modalMsgId').textContent = msgId;
    document.getElementById('modalBody').innerHTML = `
        <div style="margin-bottom:16px">
            <div style="color:var(--text3);font-size:12px;margin-bottom:4px">Текст сообщения:</div>
            <div style="background:var(--surface2);padding:14px;border-radius:var(--radius-xs);font-size:14px;line-height:1.6">
                ${escapeHtml(msg.preview || 'Без текста')}
            </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span style="color:var(--text3);font-size:12px">Тип: ${getTypeName(msg.type)}</span>
            <span style="color:var(--text3);font-size:12px">Ссылки: ${msg.has_links ? '🔗 Да' : 'Нет'}</span>
            <span style="color:var(--text3);font-size:12px">Оскорблений: ${msg.insult_count || 0}</span>
        </div>
    `;
    
    document.getElementById('modalActions').innerHTML = `
        <button class="btn-action btn-approve" onclick="approveMessage(${msgId}); closeModal();">✅ Одобрить</button>
        <button class="btn-action btn-reject" onclick="rejectMessage(${msgId}); closeModal();">❌ Отклонить</button>
        <button class="btn-action btn-mute" onclick="muteMessage(${msgId}); closeModal();">🔇 Мут 7д</button>
    `;
    
    document.getElementById('messageModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('messageModal').classList.add('hidden');
}

async function muteMessage(msgId) {
    try {
        const response = await fetch(`${API_URL}/api/mute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg_id: msgId, admin_id: adminId })
        });
        
        if (response.ok) {
            showToast('🔇 Пользователь замучен на 7 дней', 'success');
            messagesCache = messagesCache.filter(m => m.id !== msgId);
            renderModerationList();
        }
    } catch (error) {
        showToast('❌ Ошибка', 'error');
    }
}

// ==================== ПОЛЬЗОВАТЕЛИ ====================

async function searchUser() {
    const query = document.getElementById('userSearch').value.trim();
    if (!query) {
        showToast('Введите запрос', 'error');
        return;
    }
    
    const resultDiv = document.getElementById('userResult');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        const response = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Пользователь не найден');
        
        const data = await response.json();
        
        if (data.users && data.users.length > 0) {
            const user = data.users[0];
            resultDiv.innerHTML = `
                <div class="user-card" style="background:var(--surface);border:1px solid var(--surface3);border-radius:var(--radius-sm);padding:20px">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                        <div style="width:48px;height:48px;background:var(--surface3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px">👤</div>
                        <div>
                            <div style="font-weight:600;font-size:16px">${escapeHtml(user.first_name || 'Пользователь')}</div>
                            <div style="color:var(--text2);font-size:13px">@${escapeHtml(user.username || 'нет')}</div>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
                        <div><span style="color:var(--text3)">ID:</span> <code>${user.user_id}</code></div>
                        <div><span style="color:var(--text3)">Статус:</span> ${getUserStatus(user)}</div>
                        ${user.banned ? '<div style="color:var(--red)">⛔ Забанен</div>' : ''}
                        ${user.mute_until ? '<div style="color:var(--orange)">🔇 В муте</div>' : ''}
                    </div>
                    ${isSuperAdmin ? `
                        <div style="display:flex;gap:8px;margin-top:16px">
                            <button class="btn-action" style="background:var(--surface3);color:var(--text)" onclick="toggleUserBan(${user.user_id}, ${!user.banned})">
                                ${user.banned ? '✅ Разбанить' : '🔨 Забанить'}
                            </button>
                            <button class="btn-action" style="background:var(--surface3);color:var(--text)" onclick="toggleUserMute(${user.user_id})">
                                ${user.mute_until ? '🔊 Размутить' : '🔇 Замутить'}
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">Пользователь не найден</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:var(--red)">Ошибка поиска</div>';
    }
}

function getUserStatus(user) {
    if (user.banned) return '⛔ Забанен';
    if (user.mute_until) return '🔇 В муте';
    if (user.maintenance_exception) return '⭐ В исключении';
    return '✅ Активен';
}

async function toggleUserBan(userId, ban) {
    if (!confirm(ban ? 'Забанить пользователя?' : 'Разбанить пользователя?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/users/${ban ? 'ban' : 'unban'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, admin_id: adminId })
        });
        
        if (response.ok) {
            showToast(ban ? '🔨 Пользователь забанен' : '✅ Пользователь разбанен', 'success');
            searchUser(); // Обновляем результаты
        }
    } catch (error) {
        showToast('Ошибка', 'error');
    }
}

async function toggleUserMute(userId) {
    // Упрощенная версия - мут на 7 дней
    try {
        const response = await fetch(`${API_URL}/api/mute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, admin_id: adminId, days: 7 })
        });
        
        if (response.ok) {
            showToast('🔇 Мут на 7 дней', 'success');
            searchUser();
        }
    } catch (error) {
        showToast('Ошибка', 'error');
    }
}

async function showBannedList() {
    try {
        const response = await fetch(`${API_URL}/api/users/banned`, {
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        const container = document.getElementById('quickActionResult');
        if (data.users && data.users.length) {
            container.innerHTML = data.users.map(u => `
                <div style="padding:8px;border-bottom:1px solid var(--surface3);font-size:13px">
                    ${u.first_name || '?'} (@${u.username || 'нет'}) - ID: ${u.user_id}
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3)">Список пуст</div>';
        }
    } catch(e) {
        showToast('Ошибка загрузки', 'error');
    }
}

async function showMutedList() {
    try {
        const response = await fetch(`${API_URL}/api/users/muted`, {
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        const container = document.getElementById('quickActionResult');
        if (data.users && data.users.length) {
            container.innerHTML = data.users.map(u => `
                <div style="padding:8px;border-bottom:1px solid var(--surface3);font-size:13px">
                    ${u.first_name || '?'} (@${u.username || 'нет'}) - до ${u.mute_until || '?'}
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3)">Список пуст</div>';
        }
    } catch(e) {
        showToast('Ошибка загрузки', 'error');
    }
}

// ==================== НАСТРОЙКИ ====================

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/api/settings`, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const data = await response.json();
        
        document.getElementById('nightMode').checked = data.night_mode === '1';
        document.getElementById('autoMode').checked = data.auto_mode === '1';
        
        if (data.maintenance !== undefined) {
            document.getElementById('maintenance').checked = data.maintenance === '1';
        }
        
        // Показываем настройки для супер-админа
        if (isSuperAdmin) {
            document.getElementById('maintenanceItem').style.display = 'flex';
            document.getElementById('styleSection').style.display = 'block';
        }
        
        // Текущий стиль
        const currentStyle = data.post_style || '1';
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === currentStyle);
        });
        
    } catch (error) {
        console.error('Settings error:', error);
    }
}

async function toggleSetting(setting) {
    const checkbox = event.target;
    const value = checkbox.checked ? '1' : '0';
    
    // Оптимистичное обновление
    checkbox.checked = !checkbox.checked;
    
    try {
        const response = await fetch(`${API_URL}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [setting]: value })
        });
        
        if (response.ok) {
            checkbox.checked = value === '1';
            showToast('✅ Обновлено', 'success');
        } else {
            throw new Error('Ошибка');
        }
    } catch (error) {
        showToast('❌ Ошибка', 'error');
    }
}

async function setStyle(styleNum) {
    try {
        const response = await fetch(`${API_URL}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_style: styleNum.toString() })
        });
        
        if (response.ok) {
            document.querySelectorAll('.style-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.style === styleNum.toString());
            });
            showToast('🎨 Стиль обновлён', 'success');
        }
    } catch (error) {
        showToast('Ошибка', 'error');
    }
}

// ==================== ПРОВЕРКА РОЛИ ====================

async function checkAdminRole() {
    try {
        const response = await fetch(`${API_URL}/api/check_role?user_id=${adminId}`, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            isSuperAdmin = data.is_super_admin || false;
            
            // Обновляем бейдж
            const badge = document.getElementById('roleBadge');
            if (isSuperAdmin) {
                badge.textContent = 'Супер-админ';
                badge.classList.add('super');
            }
            
            // Показываем/скрываем элементы супер-админа
            document.getElementById('superAdminSection').style.display = isSuperAdmin ? 'block' : 'none';
            document.getElementById('maintenanceItem').style.display = isSuperAdmin ? 'flex' : 'none';
            document.getElementById('styleSection').style.display = isSuperAdmin ? 'block' : 'none';
        }
    } catch(e) {
        console.log('Could not verify admin role');
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function updateQuickStats() {
    loadDashboard();
}

function getTypeIcon(type) {
    const icons = { photo: '📸', video: '🎥', poll: '📊' };
    return icons[type] || '📝';
}

function getTypeName(type) {
    const names = { photo: 'Фото', video: 'Видео', poll: 'Опрос' };
    return names[type] || 'Текст';
}

function getActionEmoji(action) {
    const emojis = {
        approve: '✅', reject: '❌', mute: '🔇', ban: '🔨',
        unban: '✅', unmute: '🔊', skip: '⏭', reply: '💬',
        blacklist_add: '📝', blacklist_remove: '🗑',
        night_mode_toggle: '🌙', auto_mode_toggle: '☀️'
    };
    return emojis[action] || '📌';
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'только что';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'м назад';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'ч назад';
    return Math.floor(seconds / 86400) + 'д назад';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Закрытие модалки по клику на фон
document.getElementById('messageModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Закрытие по Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
});

// Инициализация после загрузки Telegram Web App
tg.ready();