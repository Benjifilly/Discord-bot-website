/* 
   Dashboard JavaScript
   Handles: auth gate, server list, config panel, API calls
*/

const DASHBOARD_API_BASE = "https://discord-bot-production-2057.up.railway.app/api";

// Current state
let currentGuildId = null;

// Fetch with retry for Discord 429 rate limits
async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        const response = await fetch(url, options);
        if (response.status === 429) {
            const data = await response.json().catch(() => ({}));
            const retryAfter = (data.retry_after || 2) * 1000;
            console.warn(`Rate limited, retrying in ${retryAfter}ms...`);
            await new Promise(r => setTimeout(r, retryAfter));
            continue;
        }
        return response;
    }
    throw new Error('Rate limited after multiple retries');
}
let currentGuildData = null;
let guildChannels = [];
let guildRoles = [];

// =====================
// Auth Gate Logic
// =====================
document.addEventListener('DOMContentLoaded', () => {
    checkDashboardAuth();
    
    // Add Enter key support for prefix input
    const prefixInput = document.getElementById('config-prefix-input');
    if (prefixInput) {
        prefixInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addPrefix();
            }
        });
    }
});

function checkDashboardAuth() {
    const token = localStorage.getItem('discord_access_token');
    const tokenType = localStorage.getItem('discord_token_type');

    const authGate = document.getElementById('dashboard-auth-gate');
    const dashboardContent = document.getElementById('dashboard-content');

    if (token && tokenType) {
        // Validate token by fetching user info
        validateAndShowDashboard(token, tokenType);
    } else {
        // Show auth gate
        authGate.style.display = 'flex';
        dashboardContent.style.display = 'none';
    }
}

async function validateAndShowDashboard(token, tokenType) {
    const authGate = document.getElementById('dashboard-auth-gate');
    const dashboardContent = document.getElementById('dashboard-content');

    try {
        const response = await fetchWithRetry('https://discord.com/api/users/@me', {
            headers: { authorization: `${tokenType} ${token}` }
        });

        if (!response.ok) throw new Error('Token invalid');

        const user = await response.json();

        // Token valid → show dashboard
        authGate.style.display = 'none';
        dashboardContent.style.display = 'block';

        // Load servers
        loadDashboardServers(token, tokenType, user);

    } catch (error) {
        console.error('Dashboard auth error:', error);
        // Token invalid → show auth gate
        authGate.style.display = 'flex';
        dashboardContent.style.display = 'none';
        localStorage.removeItem('discord_access_token');
        localStorage.removeItem('discord_token_type');
    }
}

// =====================
// Server List
// =====================
async function loadDashboardServers(token, tokenType, user) {
    const grid = document.getElementById('dashboard-server-grid');
    const loader = document.getElementById('server-loader');

    try {
        // Fetch user guilds & bot guilds (user guilds first to avoid parallel rate limit)
        const userGuildsRes = await fetchWithRetry('https://discord.com/api/users/@me/guilds', {
            headers: { authorization: `${tokenType} ${token}` }
        });

        if (!userGuildsRes.ok) throw new Error('Failed to fetch user guilds');

        const botGuildsRes = await fetch(`${DASHBOARD_API_BASE}/guilds`);
        if (!botGuildsRes.ok) throw new Error('Failed to fetch bot guilds');

        const userGuilds = await userGuildsRes.json();
        const botGuildIds = await botGuildsRes.json();

        // Filter mutual guilds
        const mutualGuilds = userGuilds.filter(g => botGuildIds.includes(g.id));

        // Filter: user has MANAGE_GUILD (0x20) or ADMINISTRATOR (0x8) permission
        const manageableGuilds = mutualGuilds.filter(g => {
            const perms = parseInt(g.permissions);
            return (perms & 0x20) === 0x20 || (perms & 0x8) === 0x8 || g.owner;
        });

        const viewOnlyGuilds = mutualGuilds.filter(g => {
            const perms = parseInt(g.permissions);
            return !((perms & 0x20) === 0x20 || (perms & 0x8) === 0x8 || g.owner);
        });

        // Remove loader
        if (loader) loader.remove();

        // Clear grid
        grid.innerHTML = '';

        if (manageableGuilds.length === 0 && viewOnlyGuilds.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #8e9297;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 15px; color: #f04747;"></i>
                    <p style="font-size: 18px;">No mutual servers found.</p>
                    <p>Make sure Pulsar is invited to your servers.</p>
                </div>
            `;
            return;
        }

        // Render manageable guilds
        manageableGuilds.forEach(guild => {
            const card = createServerCard(guild, true);
            grid.appendChild(card);
        });

        // Render view-only guilds
        viewOnlyGuilds.forEach(guild => {
            const card = createServerCard(guild, false);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading servers:', error);
        if (loader) loader.remove();
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #f04747;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p style="font-size: 18px;">Failed to load servers.</p>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}

function createServerCard(guild, hasPermission) {
    const basePath = getBasePath();
    const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
        : `${basePath}photos/bot-pfp.png`;

    const card = document.createElement('div');
    card.className = `dashboard-server-card ${!hasPermission ? 'no-permission-card' : ''}`;

    card.innerHTML = `
        <img src="${iconUrl}" alt="${guild.name}" onerror="this.src='${basePath}photos/bot-pfp.png'">
        <span class="server-card-name" title="${guild.name}">${guild.name}</span>
        <span class="manage-badge">${hasPermission ? 'Manage' : 'No Permission'}</span>
    `;

    if (hasPermission) {
        card.onclick = () => openServerConfig(guild);
    }

    return card;
}

function showLoadingOverlay(text = 'Loading server...') {
    const overlay = document.createElement('div');
    overlay.className = 'dashboard-loading-overlay';
    overlay.id = 'dashboard-loading-overlay';
    overlay.innerHTML = `
        <div class="dashboard-loading-spinner"></div>
        <div class="dashboard-loading-text">${text}</div>
    `;
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('dashboard-loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
    }
}

// =====================
// Server Config Panel
// =====================
async function openServerConfig(guild) {
    currentGuildId = guild.id;
    currentGuildData = guild;

    // Show loading overlay
    showLoadingOverlay('Loading ' + guild.name + '...');

    const basePath = getBasePath();
    const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
        : `${basePath}photos/bot-pfp.png`;

    // Hide server picker, show config
    document.querySelector('.dashboard-server-picker').style.display = 'none';
    document.getElementById('server-config-panel').style.display = 'block';

    // Update header
    document.getElementById('config-server-icon').src = iconUrl;
    document.getElementById('config-server-name').textContent = guild.name;
    document.getElementById('config-server-id').textContent = `ID: ${guild.id}`;

    // Reset to general tab
    switchTab('general');

    // Fetch guild data from bot API
    await loadGuildConfig(guild.id);

    // Hide loading overlay
    hideLoadingOverlay();
}

function goBackToServerList() {
    currentGuildId = null;
    currentGuildData = null;

    document.querySelector('.dashboard-server-picker').style.display = 'block';
    document.getElementById('server-config-panel').style.display = 'none';
}

function switchTab(tabName) {
    // Deactivate all tabs and content
    document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.config-tab-content').forEach(c => c.classList.remove('active'));

    // Activate selected
    document.querySelector(`.config-tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

async function loadGuildConfig(guildId) {
    try {
        // Fetch guild settings, channels, and roles in parallel
        const [settingsRes, channelsRes, rolesRes] = await Promise.all([
            fetch(`${DASHBOARD_API_BASE}/guild/${guildId}/settings`),
            fetch(`${DASHBOARD_API_BASE}/guild/${guildId}/channels`),
            fetch(`${DASHBOARD_API_BASE}/guild/${guildId}/roles`)
        ]);

        let settings = null;

        // Settings — parse first but apply AFTER populating selects
        if (settingsRes.ok) {
            settings = await settingsRes.json();
        }

        // Channels — populate selects BEFORE applying settings
        if (channelsRes.ok) {
            guildChannels = await channelsRes.json();
            populateChannelSelects(guildChannels);
        }

        // Roles — populate selects BEFORE applying settings
        if (rolesRes.ok) {
            guildRoles = await rolesRes.json();
            populateRoleSelects(guildRoles);
        }

        // Now apply settings so select values match existing options
        if (settings) {
            applySettingsToUI(settings);
        }

        // Overview stats
        const overviewRes = await fetch(`${DASHBOARD_API_BASE}/guild/${guildId}/overview`);
        if (overviewRes.ok) {
            const overview = await overviewRes.json();
            document.getElementById('overview-members').textContent = overview.member_count || '---';
            document.getElementById('overview-channels').textContent = overview.channel_count || '---';
            document.getElementById('overview-roles').textContent = overview.role_count || '---';
            document.getElementById('overview-joined').textContent = overview.bot_joined || '---';
        }

    } catch (error) {
        console.error('Error loading guild config:', error);
        showNotification('Failed to load server configuration.', 'error');
    }
}

function applySettingsToUI(settings) {
    // General - Multiple Prefixes
    if (settings.prefixes && Array.isArray(settings.prefixes)) {
        displayPrefixes(settings.prefixes);
    } else if (settings.prefix) {
        // Backward compatibility with single prefix
        displayPrefixes([settings.prefix]);
    } else {
        displayPrefixes([]);
    }

    // Moderation
    setCheckbox('config-automod', settings.automod);
    setCheckbox('config-antilink', settings.antilink);
    setCheckbox('config-antispam', settings.antispam);

    // Logging
    setCheckbox('config-logging-enabled', settings.logging_enabled);

    // Log channel
    const logChannelSelect = document.getElementById('config-log-channel');
    if (logChannelSelect && settings.log_channel) {
        logChannelSelect.value = settings.log_channel;
    }

    // Log types
    if (settings.log_types && Array.isArray(settings.log_types)) {
        document.querySelectorAll('#tab-logging .config-checkbox input[type="checkbox"]').forEach(cb => {
            cb.checked = settings.log_types.includes(cb.value);
        });
    }

    // Welcome
    setCheckbox('config-welcome-enabled', settings.welcome_enabled);

    const welcomeChannelSelect = document.getElementById('config-welcome-channel');
    if (welcomeChannelSelect && settings.welcome_channel) {
        welcomeChannelSelect.value = settings.welcome_channel;
    }

    const welcomeMsg = document.getElementById('config-welcome-message');
    if (welcomeMsg) welcomeMsg.value = settings.welcome_message || '';

    // Auto-role
    setCheckbox('config-autorole-enabled', settings.autorole_enabled);

    const autoroleSelect = document.getElementById('config-autorole');
    if (autoroleSelect && settings.autorole) {
        autoroleSelect.value = settings.autorole;
    }
}

function setCheckbox(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = !!value;
}

function populateChannelSelects(channels) {
    const textChannels = channels.filter(c => c.type === 'text');

    const selects = [
        document.getElementById('config-log-channel'),
        document.getElementById('config-welcome-channel')
    ];

    selects.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Select Channel --</option>';
        textChannels.forEach(ch => {
            const option = document.createElement('option');
            option.value = ch.id;
            option.textContent = `# ${ch.name}`;
            select.appendChild(option);
        });
        if (currentValue) select.value = currentValue;
    });
}

function populateRoleSelects(roles) {
    // Filter out @everyone and bot roles, sort by position
    const filteredRoles = roles
        .filter(r => r.name !== '@everyone' && !r.is_bot_role)
        .sort((a, b) => b.position - a.position);

    const autoroleSelect = document.getElementById('config-autorole');
    if (autoroleSelect) {
        const currentValue = autoroleSelect.value;
        autoroleSelect.innerHTML = '<option value="">-- Select Role --</option>';
        filteredRoles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.name;
            option.style.color = role.color || '#fff';
            autoroleSelect.appendChild(option);
        });
        if (currentValue) autoroleSelect.value = currentValue;
    }
}

// =====================
// Save Settings
// =====================

// Debounce map: prevents rapid-fire saves for the same key
const _saveTimers = {};
const SAVE_DEBOUNCE_MS = 600;

function saveSetting(key) {
    // Debounce: wait 600ms after last change before actually saving
    clearTimeout(_saveTimers[key]);
    _saveTimers[key] = setTimeout(() => _doSaveSetting(key), SAVE_DEBOUNCE_MS);
}

async function _doSaveSetting(key) {
    if (!currentGuildId) return;

    const token = localStorage.getItem('discord_access_token');
    const tokenType = localStorage.getItem('discord_token_type');

    if (!token) {
        showNotification('You are not authenticated.', 'error');
        return;
    }

    // Build the value to save
    let value;

    switch (key) {
        case 'prefixes':
            // Handled separately by addPrefix/removePrefix functions
            return;
        case 'automod':
            value = document.getElementById('config-automod').checked;
            break;
        case 'antilink':
            value = document.getElementById('config-antilink').checked;
            break;
        case 'antispam':
            value = document.getElementById('config-antispam').checked;
            break;
        case 'logging_enabled':
            value = document.getElementById('config-logging-enabled').checked;
            break;
        case 'log_channel':
            value = document.getElementById('config-log-channel').value;
            break;
        case 'log_types':
            value = [];
            document.querySelectorAll('#tab-logging .config-checkbox input[type="checkbox"]').forEach(cb => {
                if (cb.checked) value.push(cb.value);
            });
            break;
        case 'welcome_enabled':
            value = document.getElementById('config-welcome-enabled').checked;
            break;
        case 'welcome_channel':
            value = document.getElementById('config-welcome-channel').value;
            break;
        case 'welcome_message':
            value = document.getElementById('config-welcome-message').value;
            break;
        case 'autorole_enabled':
            value = document.getElementById('config-autorole-enabled').checked;
            break;
        case 'autorole':
            value = document.getElementById('config-autorole').value;
            break;
        default:
            return;
    }

    try {
        const response = await fetch(`${DASHBOARD_API_BASE}/guild/${currentGuildId}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${tokenType} ${token}`
            },
            body: JSON.stringify({ key, value })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save');
        }

        showNotification(`Setting "${key}" saved successfully!`, 'success');

    } catch (error) {
        console.error('Save error:', error);
        showNotification(`Failed to save: ${error.message}`, 'error');
    }
}

// =====================
// Prefix Management (Multiple Prefixes)
// =====================

let currentPrefixes = [];

function displayPrefixes(prefixes) {
    currentPrefixes = prefixes || [];
    const container = document.getElementById('prefix-preview-list');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (currentPrefixes.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.className = 'prefix-placeholder';
        placeholder.textContent = 'No prefixes configured yet.';
        container.appendChild(placeholder);
        return;
    }
    
    currentPrefixes.forEach(prefix => {
        const badge = document.createElement('div');
        badge.className = 'prefix-badge';
        
        const text = document.createElement('span');
        text.textContent = prefix;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'prefix-badge-remove';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => removePrefix(prefix);
        removeBtn.title = 'Remove this prefix';
        
        badge.appendChild(text);
        badge.appendChild(removeBtn);
        container.appendChild(badge);
    });
}

async function addPrefix() {
    const input = document.getElementById('config-prefix-input');
    const newPrefix = input ? input.value.trim() : '';
    
    if (!newPrefix) {
        showNotification('Please enter a prefix.', 'warning');
        return;
    }
    
    if (newPrefix.length > 5) {
        showNotification('Prefix cannot be longer than 5 characters.', 'warning');
        return;
    }
    
    if (currentPrefixes.includes(newPrefix)) {
        showNotification('This prefix already exists.', 'warning');
        return;
    }
    
    // Add to local array
    currentPrefixes.push(newPrefix);
    
    // Save to backend
    await savePrefixes();
    
    // Update UI
    displayPrefixes(currentPrefixes);
    
    // Clear input
    if (input) input.value = '';
}

async function removePrefix(prefixToRemove) {
    if (!prefixToRemove) return;
    
    // Remove from local array
    currentPrefixes = currentPrefixes.filter(p => p !== prefixToRemove);
    
    // Save to backend
    await savePrefixes();
    
    // Update UI
    displayPrefixes(currentPrefixes);
}

async function savePrefixes() {
    if (!currentGuildId) return;
    
    const token = localStorage.getItem('discord_access_token');
    const tokenType = localStorage.getItem('discord_token_type');
    
    if (!token) {
        showNotification('You are not authenticated.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${DASHBOARD_API_BASE}/guild/${currentGuildId}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${tokenType} ${token}`
            },
            body: JSON.stringify({ key: 'prefixes', value: currentPrefixes })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save');
        }
        
        showNotification('Prefixes saved successfully!', 'success');
        
    } catch (error) {
        console.error('Save prefixes error:', error);
        showNotification(`Failed to save prefixes: ${error.message}`, 'error');
    }
}
