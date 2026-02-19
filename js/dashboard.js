/*
   Dashboard JavaScript
   Handles: auth gate, server list, config panel, API calls
*/

const DASHBOARD_API_BASE = CONFIG.API_BASE;

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
let currentUser = null;
let originalSettings = {};
let pendingChanges = {};

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
    const skeletonLoader = document.getElementById('dashboard-skeleton-loader');

    if (token && tokenType) {
        // Validate token by fetching user info
        // Show skeleton while loading
        if (skeletonLoader) skeletonLoader.style.display = 'block';
        if (authGate) authGate.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'none';

        validateAndShowDashboard(token, tokenType);
    } else {
        // Show auth gate
        if (skeletonLoader) skeletonLoader.style.display = 'none';
        if (authGate) authGate.style.display = 'flex';
        if (dashboardContent) dashboardContent.style.display = 'none';
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
        currentUser = user;

        // Token valid
        authGate.style.display = 'none';
        // dashboardContent.style.display = 'block'; // Moved to loadDashboardServers completion

        // Ensure Sidebar Auth UI is synced (fixes potential mismatch)
        if (typeof renderAuthUI === 'function') {
            renderAuthUI(user);
        }

        // Load servers
        loadDashboardServers(token, tokenType, user);

    } catch (error) {
        console.error('Dashboard auth error:', error);
        // Token invalid → show auth gate
        const skeletonLoader = document.getElementById('dashboard-skeleton-loader');
        if (skeletonLoader) skeletonLoader.style.display = 'none';

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

        // Loader (legacy)
        if (loader) loader.remove();

        // Clear grid
        grid.innerHTML = '';

        if (manageableGuilds.length === 0 && viewOnlyGuilds.length === 0) {
            // Show dashboard, Hide Skeleton (even if empty)
            const skeleton = document.getElementById('dashboard-skeleton-loader');
            if (skeleton) skeleton.style.display = 'none';
            document.getElementById('dashboard-content').style.display = 'block';

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

        // Done loading: Smooth Transition
        const skeleton = document.getElementById('dashboard-skeleton-loader');
        const dashboard = document.getElementById('dashboard-content');

        if (skeleton) {
            skeleton.classList.add('fade-out');
            // Wait for transition to finish before swapping
            setTimeout(() => {
                skeleton.style.display = 'none';
                skeleton.classList.remove('fade-out'); // Reset for next time if needed
                if (dashboard) {
                    dashboard.style.display = 'block';
                    dashboard.classList.add('fade-in');
                }
            }, 400);
        } else {
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.classList.add('fade-in');
            }
        }

    } catch (error) {
        console.error('Error loading servers:', error);
        if (loader) loader.remove();

        // Show dashboard (with error), Hide Skeleton Smoothly
        const skeleton = document.getElementById('dashboard-skeleton-loader');
        const dashboard = document.getElementById('dashboard-content');

        if (skeleton) {
            skeleton.classList.add('fade-out');
            setTimeout(() => {
                skeleton.style.display = 'none';
                if (dashboard) {
                    dashboard.style.display = 'block';
                    dashboard.classList.add('fade-in');
                }
            }, 400);
        } else {
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.classList.add('fade-in');
            }
        }

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
            // Deep copy for original settings
            originalSettings = JSON.parse(JSON.stringify(settings));
            pendingChanges = {};
            applySettingsToUI(settings);
            updateSaveBar();
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

        // Activity chart
        initActivityChart();

        // Bot permissions
        loadBotPermissions(guildId);

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
    if (welcomeMsg) {
        welcomeMsg.value = settings.welcome_message || '';
        updateWelcomePreview();
    }

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

// =====================
// Save Settings Logic
// =====================

function saveSetting(key) {
    // Get the current value from the UI
    let value;
    switch (key) {
        case 'prefixes':
            value = currentPrefixes;
            break;
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

    // Compare with original settings
    const isDifferent = checkDifference(key, value);

    if (isDifferent) {
        pendingChanges[key] = value;
    } else {
        delete pendingChanges[key];
    }

    updateSaveBar();
}

function checkDifference(key, newValue) {
    let originalValue = originalSettings[key];

    // Normalize original value if undefined/null to match newValue type
    if (originalValue === undefined || originalValue === null) {
        if (typeof newValue === 'boolean') originalValue = false;
        else if (Array.isArray(newValue)) originalValue = [];
        else if (typeof newValue === 'string') originalValue = '';
    }

    // Handle arrays (like log_types, prefixes)
    if (Array.isArray(newValue) && Array.isArray(originalValue)) {
        if (newValue.length !== originalValue.length) return true;
        // Simple string array comparison
        const sortedNew = [...newValue].sort();
        const sortedOrig = [...originalValue].sort();
        return JSON.stringify(sortedNew) !== JSON.stringify(sortedOrig);
    }

    // Handle standard values
    return newValue !== originalValue;
}

function updateSaveBar() {
    const saveBar = document.getElementById('save-bar');
    const hasChanges = Object.keys(pendingChanges).length > 0;

    if (hasChanges) {
        saveBar.classList.add('visible');
    } else {
        saveBar.classList.remove('visible');
    }
}

async function saveChanges() {
    if (!currentGuildId) return;

    const saveBtn = document.querySelector('.save-btn');
    saveBtn.classList.add('saving');
    saveBtn.textContent = 'Saving...';

    const token = localStorage.getItem('discord_access_token');
    const tokenType = localStorage.getItem('discord_token_type');

    if (!token) {
        showNotification('You are not authenticated.', 'error');
        saveBtn.classList.remove('saving');
        saveBtn.textContent = 'Save Changes';
        return;
    }

    try {
        // Send all pending changes as a batch
        const response = await fetch(`${DASHBOARD_API_BASE}/guild/${currentGuildId}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${tokenType} ${token}`
            },
            body: JSON.stringify(pendingChanges)
        });

        if (!response.ok) throw new Error('Failed to save settings');

        // Success
        showNotification('All changes saved successfully!', 'success');

        // Update original settings to match current
        Object.assign(originalSettings, pendingChanges);
        pendingChanges = {};
        updateSaveBar();

    } catch (error) {
        console.error('Save error:', error);
        showNotification(`Failed to save changes: ${error.message}`, 'error');
    } finally {
        saveBtn.classList.remove('saving');
        saveBtn.textContent = 'Save Changes';
    }
}

function resetChanges() {
    // Revert UI to original settings
    applySettingsToUI(originalSettings);

    // Clear pending changes
    pendingChanges = {};
    updateSaveBar();

    // Update preview after reset
    updateWelcomePreview();
}

// =====================
// Bot Permissions
// =====================

const REQUIRED_PERMISSIONS = {
    'Send Messages': { icon: 'fa-comment', features: ['All Commands'] },
    'Embed Links': { icon: 'fa-link', features: ['All Commands'] },
    'Manage Messages': { icon: 'fa-trash-alt', features: ['Auto-Moderation', 'Anti-Link', 'Anti-Spam'] },
    'Kick Members': { icon: 'fa-user-minus', features: ['Kick Command'] },
    'Ban Members': { icon: 'fa-gavel', features: ['Ban Command'] },
    'Manage Roles': { icon: 'fa-user-shield', features: ['Auto-Role', 'Mute Command'] },
    'Read Message History': { icon: 'fa-history', features: ['Logging'] },
    'View Audit Log': { icon: 'fa-clipboard-list', features: ['Logging'] },
    'Attach Files': { icon: 'fa-paperclip', features: ['Image Commands'] },
    'Use External Emojis': { icon: 'fa-smile', features: ['Fun Commands'] },
    'Add Reactions': { icon: 'fa-thumbs-up', features: ['Reaction Roles'] },
    'Moderate Members': { icon: 'fa-shield-alt', features: ['Timeout Command'] },
};

async function loadBotPermissions(guildId) {
    const grid = document.getElementById('bot-permissions-grid');
    const alertContainer = document.getElementById('permissions-alert-container');
    if (!grid) return;

    try {
        const res = await fetch(`${DASHBOARD_API_BASE}/guild/${guildId}/permissions`);
        let botPerms = [];

        if (res.ok) {
            botPerms = await res.json(); // Expected: array of permission name strings
        } else {
            // API unavailable — show empty state
            grid.innerHTML = '<span class="prefix-placeholder">Could not load permissions from bot API.</span>';
            return;
        }

        grid.innerHTML = '';
        alertContainer.innerHTML = '';
        const missingPerms = [];

        Object.entries(REQUIRED_PERMISSIONS).forEach(([permName, permInfo]) => {
            const hasPermission = botPerms.includes(permName);
            if (!hasPermission) missingPerms.push(permName);

            const card = document.createElement('div');
            card.className = `permission-card ${hasPermission ? 'permission-granted' : 'permission-missing'}`;
            card.innerHTML = `
                <span class="perm-icon"><i class="fas ${permInfo.icon}"></i></span>
                <span class="perm-name">${permName}</span>
                <span class="perm-status">${hasPermission ? '✓' : '✗'}</span>
            `;
            card.title = `Required for: ${permInfo.features.join(', ')}`;
            grid.appendChild(card);
        });

        // Show alert if missing permissions
        if (missingPerms.length > 0) {
            alertContainer.innerHTML = `
                <div class="permissions-alert">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span><strong>${missingPerms.length}</strong> missing permission${missingPerms.length > 1 ? 's' : ''} — some features may not work properly.</span>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error loading permissions:', error);
        grid.innerHTML = '<span class="prefix-placeholder">Could not load permissions.</span>';
    }
}

// =====================
// Activity Chart
// =====================

let activityChartInstance = null;

async function initActivityChart() {
    const canvas = document.getElementById('activity-chart');
    if (!canvas) return;

    // Destroy previous instance
    if (activityChartInstance) {
        activityChartInstance.destroy();
        activityChartInstance = null;
    }

    // Fetch real data from API
    let activityData = [];
    try {
        const res = await fetch(`${DASHBOARD_API_BASE}/guild/${currentGuildId}/activity`);
        if (res.ok) {
            activityData = await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch activity data:', e);
    }

    // If no data or all zeros, show message
    if (!activityData.length || activityData.every(d => d.messages === 0 && d.members_joined === 0)) {
        const container = canvas.parentElement;
        container.innerHTML = '<p style="color: #72767d; text-align: center; padding: 30px 0; margin: 0;">No activity data yet. Stats will appear as the bot tracks messages and member joins.</p>';
        return;
    }

    const ctx = canvas.getContext('2d');
    const labels = activityData.map(d => d.label);
    const messagesData = activityData.map(d => d.messages);
    const membersJoinedData = activityData.map(d => d.members_joined);

    // Gradients
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(88, 101, 242, 0.3)');
    gradient.addColorStop(1, 'rgba(88, 101, 242, 0.0)');

    const gradient2 = ctx.createLinearGradient(0, 0, 0, 250);
    gradient2.addColorStop(0, 'rgba(87, 242, 135, 0.3)');
    gradient2.addColorStop(1, 'rgba(87, 242, 135, 0.0)');

    activityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Messages',
                    data: messagesData,
                    borderColor: '#5865f2',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#5865f2',
                    pointBorderColor: '#2f3136',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                },
                {
                    label: 'Members Joined',
                    data: membersJoinedData,
                    borderColor: '#57f287',
                    backgroundColor: gradient2,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#57f287',
                    pointBorderColor: '#2f3136',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#b9bbbe',
                        font: { size: 12 },
                        usePointStyle: true,
                        pointStyle: 'circle',
                    }
                },
                tooltip: {
                    backgroundColor: '#18191c',
                    titleColor: '#fff',
                    bodyColor: '#b9bbbe',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: true,
                }
            },
            scales: {
                x: {
                    ticks: { color: '#72767d', font: { size: 11 } },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    border: { color: 'rgba(255,255,255,0.06)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#72767d', font: { size: 11 } },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    border: { color: 'rgba(255,255,255,0.06)' }
                }
            }
        }
    });
}

// =====================
// Discord Markdown Parser
// =====================

function parseDiscordMarkdown(text) {
    // Store code blocks/inline code to protect from further parsing
    const codeBlocks = [];

    // Code blocks first (```code```) — with copy button
    text = text.replace(/```([\s\S]*?)```/g, (_, code) => {
        const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        codeBlocks.push(
            `<pre class="md-codeblock"><button class="codeblock-copy-btn" onclick="copyCodeBlock(this)"><i class="fas fa-copy"></i></button>${escapedCode}</pre>`
        );
        return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
    });

    // Inline code (`code`)
    text = text.replace(/`([^`]+)`/g, (_, code) => {
        codeBlocks.push(`<code class="md-code">${code}</code>`);
        return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
    });

    // Spoilers (||text||)
    text = text.replace(/\|\|(.+?)\|\|/g, '<span class="md-spoiler" onclick="this.classList.toggle(\'visible\')">$1</span>');

    // Links ([text](url))
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank">$1</a>');

    // Headers (consume optional trailing newline to avoid double spacing with global newline replacement)
    // Using simple replacement for now, treating them as block elements via CSS
    text = text.replace(/^### (.+?)(\n|$)/gm, '<span class="md-header md-h3">$1</span>');
    text = text.replace(/^## (.+?)(\n|$)/gm, '<span class="md-header md-h2">$1</span>');
    text = text.replace(/^# (.+?)(\n|$)/gm, '<span class="md-header md-h1">$1</span>');

    // Lists (- item or * item)
    text = text.replace(/^(?:[-*]) (.+?)(\n|$)/gm, '<div class="md-list-item"><span class="md-list-bullet">●</span> <span>$1</span></div>');

    // Blockquotes (&gt; text — because > is HTML-escaped before this runs)
    text = text.replace(/^&gt; (.+?)(\n|$)/gm, '<div class="md-quote">$1</div>');

    // Bold italic (***text***)
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // Bold (**text**)
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Underline (__text__)
    text = text.replace(/__(.+?)__/g, '<u>$1</u>');

    // Italic (*text* or _text_)
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/(^|[^a-zA-Z0-9])_(.+?)_([^a-zA-Z0-9]|$)/g, '$1<em>$2</em>$3');

    // Strikethrough (~~text~~)
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Newlines: single -> br. Double -> already handled by block elements consuming them or just br br.
    // We removed the "margin-top:8px" div to avoid the "huge space" issue, relying on block element CSS instead.
    text = text.replace(/\n/g, '<br>');

    // Restore code blocks
    text = text.replace(/%%CODEBLOCK_(\d+)%%/g, (_, index) => codeBlocks[parseInt(index)]);

    return text;
}

// Copy code block content to clipboard
async function copyCodeBlock(button) {
    const pre = button.closest('.md-codeblock');
    if (!pre) return;

    // Get the text content of the code block, excluding the button text
    const clone = pre.cloneNode(true);
    const btn = clone.querySelector('.codeblock-copy-btn');
    if (btn) btn.remove();
    const codeText = clone.textContent.trim();

    try {
        await navigator.clipboard.writeText(codeText);
        const icon = button.querySelector('i');
        icon.classList.remove('fa-copy');
        icon.classList.add('fa-check');
        button.classList.add('copied');
        button.innerHTML = '<i class="fas fa-check"></i>';

        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i>';
            button.classList.remove('copied');
        }, 1500);
    } catch (err) {
        console.error('Failed to copy code block:', err);
    }
}

// =====================
// Live Preview
// =====================

function updateWelcomePreview() {
    const input = document.getElementById('config-welcome-message');
    const previewText = document.getElementById('welcome-preview-text');
    const previewUserAvatar = document.getElementById('preview-user-avatar');
    const previewTimestamp = document.getElementById('preview-timestamp');
    const previewFooterTimestamp = document.getElementById('preview-footer-timestamp');
    const previewMemberCount = document.getElementById('preview-member-count');

    if (!input || !previewText) return;

    let text = input.value;

    // Default fallback if empty
    if (!text) {
        text = "Welcome {user} to {server}! 🎉";
    }

    // Replace variables with dummy data
    // Escape HTML to prevent injection in preview
    text = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Highlight variables
    // Use currentUser data if available
    const username = currentUser ? currentUser.username : "User";
    const serverName = currentGuildData ? currentGuildData.name : "MyServer";

    text = text.replace(/{user}/g, `<span class="preview-var">@${username}</span>`);
    text = text.replace(/{server}/g, `<span class="preview-var">${serverName}</span>`);

    // Parse Discord markdown
    text = parseDiscordMarkdown(text);

    previewText.innerHTML = text;

    // Update Avatar
    if (previewUserAvatar) {
        if (currentUser && currentUser.avatar) {
            const avatarUrl = `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`;
            previewUserAvatar.src = avatarUrl;
            previewUserAvatar.style.display = 'block';
        } else {
            // Default discord avatar (faded blue)
            previewUserAvatar.src = "https://cdn.discordapp.com/embed/avatars/0.png";
            previewUserAvatar.style.display = 'block';
        }
    }

    // Update Timestamps
    const now = new Date();
    const timeString = `Today at ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (previewTimestamp) previewTimestamp.textContent = timeString;
    if (previewFooterTimestamp) previewFooterTimestamp.textContent = timeString;

    // Update Member Count (Generic)
    if (previewMemberCount) {
        previewMemberCount.textContent = "Member # ";
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

    // Add to local array (Immutable update)
    currentPrefixes = [...currentPrefixes, newPrefix];

    // Save to backend (tracked in save bar now)
    saveSetting('prefixes');

    // Update UI
    displayPrefixes(currentPrefixes);

    // Clear input
    if (input) input.value = '';
}

async function removePrefix(prefixToRemove) {
    if (!prefixToRemove) return;

    // Remove from local array (Immutable update)
    currentPrefixes = currentPrefixes.filter(p => p !== prefixToRemove);

    // Save to backend (tracked in save bar now)
    saveSetting('prefixes');

    // Update UI
    displayPrefixes(currentPrefixes);
}

// =====================
// Textarea Resilience
// =====================
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('config-welcome-message');
    if (textarea) {
        // Function to fix height if it's broken
        const fixHeight = () => {
            if (textarea.style.height && (textarea.style.height.startsWith('-') || textarea.style.height === '0px')) {
                textarea.style.height = ''; // Clear inline style
                textarea.style.minHeight = '80px';
            }
        };

        // Check immediately
        fixHeight();

        // Check on interaction
        textarea.addEventListener('input', fixHeight);
        textarea.addEventListener('focus', fixHeight);

        // Watch for attribute changes (extensions injecting styles)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    fixHeight();
                }
            });
        });

        observer.observe(textarea, { attributes: true, attributeFilter: ['style'] });
    }
});
