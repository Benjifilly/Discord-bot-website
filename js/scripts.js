function searchCommands() {
    const input = document.getElementById('searchBar');
    const filter = input.value.toLowerCase();
    const categories = document.querySelectorAll('.category-block');
    let totalFound = false;

    categories.forEach(category => {
        const commands = category.querySelectorAll('.command');
        let categoryHasMatch = false;

        commands.forEach(command => {
            const commandText = command.textContent || command.innerText;
            if (commandText.toLowerCase().includes(filter)) {
                command.style.display = "";
                categoryHasMatch = true;
                totalFound = true;
            } else {
                command.style.display = "none";
            }
        });

        if (categoryHasMatch) {
            category.style.display = "";
        } else {
            category.style.display = "none";
        }
    });

    // Toggle no-result message
    const noResult = document.getElementById('no-result');
    const noResultQuery = document.getElementById('no-result-query');

    if (totalFound) {
        if (noResult) noResult.style.display = 'none';
    } else {
        if (noResult) noResult.style.display = 'block';
        const maxLength = 30;
        const truncatedValue = input.value.length > maxLength ? input.value.substring(0, maxLength) + '...' : input.value;
        if (noResultQuery) noResultQuery.textContent = truncatedValue;
    }

    // Hide no-result2 if it exists (from old code cleanup)
    const noResult2 = document.getElementById('no-result2');
    if (noResult2) noResult2.style.display = 'none';

    updateCommandCount();
}



function toggleNav() {
    const navBar = document.getElementById('navBar');
    const burgerMenu = document.querySelector('.burger-menu');
    navBar.classList.toggle('open');
    burgerMenu.classList.toggle('open');
}

// Close sidebar when clicking outside
document.addEventListener('click', function (event) {
    const navBar = document.getElementById('navBar');
    const burgerMenu = document.querySelector('.burger-menu');

    // Check if the sidebar is open and the click is NOT inside the sidebar or the burger menu
    if (navBar.classList.contains('open') &&
        !navBar.contains(event.target) &&
        !burgerMenu.contains(event.target)) {

        navBar.classList.remove('open');
        burgerMenu.classList.remove('open');
    }
});


document.addEventListener("DOMContentLoaded", function () {
    gsap.registerPlugin(ScrollTrigger);

    // Check if we are on the index page (using a unique element like .intro)
    // The user requested animations ONLY on the index page.
    const isIndexPage = document.querySelector('.intro') !== null;

    if (isIndexPage) {
        // Master Timeline for Initial Load Animations (Index Only)
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        // 1. Animate Fixed Elements (Fade In)
        tl.from(".burger-menu, .invite-button", {
            opacity: 0,
            duration: 1.5
        })
            // 2. Animate Header Content (Slide Down + Fade)
            .from("headerCanvas, header > .bot-info, header > .title, header > h1, #star-canvas", {
                opacity: 0,
                y: -50,
                duration: 1.2,
                stagger: 0.2
            }, "-=1.0")
            // 3. Animate Intro & Server Stats (Slide Down + Fade)
            .fromTo(".intro, .server-stats", {
                autoAlpha: 0,
                y: -50
            }, {
                autoAlpha: 1,
                y: 0,
                duration: 1,
                stagger: 0.2
            }, "-=0.5");

        // 4. Animate remaining sections on Scroll
        const scrollSections = gsap.utils.toArray(".features, .updates, .connect-discord, footer");

        // Universal Scroll Observer (Works for Touch, Wheel, Scrollbar, and Middle-Click AutoScroll)
        const observerOptions = {
            threshold: 0.1, // Trigger when 10% visible
            rootMargin: "0px 0px -50px 0px" // Trigger slightly before the bottom
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Differentiate animation feel based on device capability if needed
                    // But generally, a smooth slide-up is good for all.
                    gsap.to(entry.target, {
                        autoAlpha: 1,
                        y: 0,
                        duration: 1.2,
                        ease: "power3.out",
                        overwrite: true // Ensure we take control
                    });
                    observer.unobserve(entry.target); // Animate once
                }
            });
        }, observerOptions);

        scrollSections.forEach(section => {
            gsap.set(section, { autoAlpha: 0, y: 30 }); // Initial state (slightly lower for better effect)
            observer.observe(section);
        });

        // 5. Line Divider Animation (Specific - Draw SVG stroke)
        const lineDivider = document.querySelector(".line-divider");
        if (lineDivider) {
            const lineObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        gsap.to(entry.target.querySelector(".animated-line"), {
                            strokeDashoffset: 0,
                            duration: 1.5,
                            ease: "power2.out",
                            overwrite: true
                        });
                        lineObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });

            // Set initial state
            gsap.set(lineDivider.querySelector(".animated-line"), { strokeDashoffset: 1200 });
            lineObserver.observe(lineDivider);
        }
    } else {
        // Not on index page: Ensure everything hidden by CSS is visible immediately
        // This effectively disables the animations on other pages
        gsap.set(".features, .updates, .connect-discord, footer, .burger-menu, .invite-button, .intro, .server-stats", { autoAlpha: 1 });
    }

    // Animated line divider - draws on scroll
    const animatedLine = document.querySelector('.animated-line');
    if (animatedLine) {
        gsap.to(animatedLine, {
            strokeDashoffset: 0,
            duration: 1.5,
            ease: "power2.inOut",
            scrollTrigger: {
                trigger: ".line-divider",
                start: "top 95%", // Start triggering as soon as it enters view
                end: "bottom 40%", // Finish drawing before it leaves
                scrub: 1,
                invalidateOnRefresh: true
            }
        });
    }

    // Refresh ScrollTrigger on load to fix positioning issues
    ScrollTrigger.refresh();

    // Start fetching bot stats
    fetchBotStats();
    // Refresh stats every 30 seconds
    setInterval(fetchBotStats, 30000);
});

// Configure your Railway URL here (e.g., https://pulsar-bot.up.railway.app)
const API_BASE_URL = `${CONFIG.API_BASE}/server_info`;

async function fetchBotStats() {
    const serverCountEl = document.getElementById('server-number');
    const userCountEl = document.getElementById('total-users'); // Check ID match
    const channelCountEl = document.getElementById('total-channels');
    const uptimeEl = document.getElementById('uptime');
    const latencyEl = document.getElementById('latency');
    const statusEl = document.getElementById('bot-status');

    // Only run if we are on the page with stats
    if (!serverCountEl) return;

    try {
        // Fetch data from the bot's API
        // Ensure your bot code (keep_alive.py) has CORS allowed!
        const response = await fetch(`${API_BASE_URL}`);

        if (!response.ok) throw new Error('Bot offline or API error');

        const data = await response.json();

        // Update DOM
        serverCountEl.innerText = data.serverCount || "---";
        userCountEl.innerText = data.totalUsers || "---";
        channelCountEl.innerText = data.totalChannels || "---";

        // Format latency (seconds -> ms)
        const latencyMs = Math.round((data.latency || 0) * 1000);
        latencyEl.innerText = latencyMs + "ms";

        if (statusEl) {
            statusEl.innerText = data.botStatus || "Online";
            statusEl.style.color = "#43b581"; // Discord Online Green
        }

        // Handle Uptime Logic
        if (data.uptime) {
            const currentSeconds = parseUptime(data.uptime);
            startUptimeCounter(currentSeconds);
        }

    } catch (error) {
        console.error("Error fetching stats:", error);
        if (statusEl) {
            statusEl.innerText = "Offline";
            statusEl.style.color = "#f04747";
        }
    }
}

// Global variables for uptime counter
let uptimeInterval;
let totalUptimeSeconds = 0;

function parseUptime(uptimeStr) {
    // Expected format: "H:M:S" (e.g. "0:0:0" or "5:30:12")
    const parts = uptimeStr.split(':').map(Number);
    if (parts.length !== 3) return 0;
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2]; // Total seconds
}

function formatUptime(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400); // 86400 seconds in a day
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    return `${hours}h ${minutes}m ${seconds}s`;
}


function startUptimeCounter(initialSeconds) {
    // Clear existing interval to avoid duplicates
    if (uptimeInterval) clearInterval(uptimeInterval);

    totalUptimeSeconds = initialSeconds;
    const uptimeEl = document.getElementById('uptime');

    // Update immediately
    if (uptimeEl) uptimeEl.innerText = formatUptime(totalUptimeSeconds);

    // Start ticking every second
    uptimeInterval = setInterval(() => {
        totalUptimeSeconds++;
        if (uptimeEl) uptimeEl.innerText = formatUptime(totalUptimeSeconds);
    }, 1000);
}

// Custom Notification System
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    // Create Toast Element
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;

    // Icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    // Icon
    const iconDiv = document.createElement('div');
    iconDiv.className = 'notification-icon';
    const iconI = document.createElement('i');
    iconI.className = `fas fa-${icon}`;
    iconDiv.appendChild(iconI);
    toast.appendChild(iconDiv);

    // Content (Safe)
    const contentDiv = document.createElement('div');
    contentDiv.className = 'notification-content';
    contentDiv.textContent = message;
    toast.appendChild(contentDiv);

    // Close Button
    const closeDiv = document.createElement('div');
    closeDiv.className = 'notification-close';
    closeDiv.innerHTML = '&times;';
    closeDiv.onclick = () => dismissNotification(toast);
    toast.appendChild(closeDiv);

    container.appendChild(toast);

    // Trigger slide-down animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    // Auto dismiss after 4s
    setTimeout(() => dismissNotification(toast), 4000);
}

function dismissNotification(toast) {
    if (!toast || !toast.parentElement) return;
    toast.classList.remove('show');
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
}

// Contact Form Submission Logic
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = document.getElementById('submitBtn');
            const originalBtnText = submitBtn.innerText;

            // UI Loading State
            submitBtn.innerText = 'Sending...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';

            // Gather data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value,
                type: document.getElementById('type').value
            };

            // Construct API URL
            const contactUrl = API_BASE_URL.replace('/server_info', '/contact');

            try {
                const response = await fetch(contactUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    showNotification('Message sent successfully!', 'success');
                    contactForm.reset();
                } else {
                    showNotification('Error sending message: ' + (result.error || 'Unknown error'), 'error');
                }

            } catch (error) {
                console.error('Contact form error:', error);
                showNotification('Failed to connect to the server. Please check your connection.', 'error');
            } finally {
                // Reset Button
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
        });
    }
});


const customGroups = {
    Astronomy: ['?daily_astronomy', '?mars_rover', '?moon', '?neo', '?space_fact', '?space_news'],
    Admin: ['?dm', '?clear', '?purge', '?create-role', '?delete-role', '?create-channel', '?delete-channel', '?create-category', '?delete-category', '?setup_webhook', '?warn', '?mute', '?unmute', '?kick', '?ban', '?unban', '?banned-users', '?poll', '?setup-logs', '?setup_webhook'],
    Normal: ['?code', '?forecast', '?help', '?invite', '?joke', '?ping', '?remind', '?roleinfo', '?say', '?server', '?show-profile', '?uptime', '?weather', '?webhook']
};

function updateCommandCount() {
    const commandCountEl = document.getElementById('commandCount');
    if (!commandCountEl) return; // Exit if element doesn't exist (e.g., on index.html)

    const commands = document.querySelectorAll('.command:not([style*="display: none"])');
    commandCountEl.textContent = commands.length;
}

document.addEventListener('DOMContentLoaded', () => {
    fetchCommands();
});

function createSkeletonLoader() {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-container';

    // Create 3 fake category groups with varying card counts
    const groups = [4, 4, 3];
    let itemIndex = 0; // Global index for staggered animation delay

    groups.forEach(cardCount => {
        const category = document.createElement('div');
        category.className = 'skeleton-category';

        // Fake category header
        const header = document.createElement('div');
        header.className = 'skeleton-header';
        header.style.setProperty('--skeleton-delay', `${itemIndex * 0.06}s`);
        itemIndex++;
        category.appendChild(header);

        // Fake command cards
        for (let i = 0; i < cardCount; i++) {
            const card = document.createElement('div');
            card.className = 'skeleton-card';
            card.style.setProperty('--skeleton-delay', `${itemIndex * 0.06}s`);
            card.innerHTML = `
                <div class="skeleton-line title"></div>
                <div class="skeleton-line usage"></div>
                <div class="skeleton-line desc"></div>
            `;
            itemIndex++;
            category.appendChild(card);
        }

        skeleton.appendChild(category);
    });

    return skeleton;
}

async function fetchCommands() {
    const commandList = document.querySelector('.command-list');
    if (!commandList) return;

    // Create and insert skeleton loader
    // (.command-list is already hidden via CSS to prevent flash of static content)
    const skeleton = createSkeletonLoader();
    commandList.parentNode.insertBefore(skeleton, commandList);

    try {
        const response = await fetch(`${CONFIG.API_BASE}/commands`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const commands = await response.json();

        await new Promise(resolve => setTimeout(resolve, 500));
        skeleton.classList.add('fade-out');

        setTimeout(() => {
            skeleton.remove();
            commandList.style.display = 'block';
            renderCommands(commands);

            const visibleCommands = document.querySelectorAll('.command-list .command:not([style*="display: none"])');
            let cmdIndex = 0;

            visibleCommands.forEach(cmd => {
                cmd.classList.remove('cmd-enter');
                void cmd.offsetWidth;

                cmd.style.setProperty('--cmd-delay', `${cmdIndex * 0.03}s`);
                cmd.classList.add('cmd-enter');
                cmdIndex++;
            });

            const totalDuration = (cmdIndex * 30) + 450;
            setTimeout(() => {
                visibleCommands.forEach(cmd => {
                    cmd.classList.remove('cmd-enter');
                    cmd.style.removeProperty('--cmd-delay');
                });
            }, totalDuration);

            if (window.location.hash) {
                const hash = window.location.hash;
                setTimeout(() => {
                    const element = document.querySelector(hash);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
            }
        }, 400);

    } catch (error) {
        console.error('Failed to fetch commands:', error);
        skeleton.remove();
        commandList.style.display = 'block';

        sortCommands();
        updateCommandCount();

        if (window.location.hash) {
            const hash = window.location.hash;
            setTimeout(() => {
                const element = document.querySelector(hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    }
}

let _filterLocked = false;

function filterByCategory(category) {
    // Spam protection: ignore if animation is still running
    if (_filterLocked) return;
    _filterLocked = true;

    // Update active pill
    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.category === category);
    });

    const allBlocks = document.querySelectorAll('.category-block');

    const visibleBlocks = Array.from(allBlocks).filter(b => !b.classList.contains('hidden'));
    visibleBlocks.forEach(block => {
        block.classList.add('fade-out');
    });

    setTimeout(() => {
        allBlocks.forEach(block => {
            block.classList.remove('fade-out');
            if (category === 'all') {
                block.classList.remove('hidden');
            } else {
                block.classList.toggle('hidden', block.id !== category);
            }
        });

        const newVisible = Array.from(allBlocks).filter(b => !b.classList.contains('hidden'));
        let cmdIndex = 0;

        newVisible.forEach(block => {
            const commands = block.querySelectorAll('.command');
            commands.forEach(cmd => {
                cmd.classList.remove('cmd-enter');
                void cmd.offsetWidth;
                cmd.style.setProperty('--cmd-delay', `${cmdIndex * 0.03}s`);
                cmd.classList.add('cmd-enter');
                cmdIndex++;
            });
        });

        const totalDuration = (cmdIndex * 30) + 450;
        setTimeout(() => {
            newVisible.forEach(block => {
                block.querySelectorAll('.command.cmd-enter').forEach(cmd => {
                    cmd.classList.remove('cmd-enter');
                    cmd.style.removeProperty('--cmd-delay');
                });
            });
            _filterLocked = false;
        }, totalDuration);

        // Update command count and reapply search filter
        updateCommandCount();
        searchCommands();
    }, 200);
}

function sortCommands() {
    const sortOptions = document.getElementById('sortOptions');
    if (!sortOptions) return;

    const sortType = sortOptions.value;
    const categories = document.querySelectorAll('.category-block');
    const searchInput = document.getElementById('searchBar');
    const searchFilter = searchInput ? searchInput.value.toLowerCase() : '';

    let hasVisibleCommand = false;

    categories.forEach(category => {
        let grid = category.querySelector('.command-grid');
        let commands;

        if (grid) {
            commands = Array.from(grid.querySelectorAll('.command'));
        } else {
            commands = Array.from(category.querySelectorAll('.command'));
            grid = category;
        }

        let categoryHasVisible = false;

        commands.forEach(cmd => cmd.style.display = '');

        if (sortType === 'alphabetic-order') {
            commands.sort((a, b) => {
                const nameA = a.querySelector('h3').textContent.toLowerCase();
                const nameB = b.querySelector('h3').textContent.toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else if (sortType === 'alphabetic-disorder') {
            commands.sort((a, b) => {
                const nameA = a.querySelector('h3').textContent.toLowerCase();
                const nameB = b.querySelector('h3').textContent.toLowerCase();
                return nameB.localeCompare(nameA);
            });
        }

        if (sortType.includes('alphabetic')) {
            if (grid.classList.contains('command-grid')) {
                grid.innerHTML = '';
                commands.forEach(cmd => grid.appendChild(cmd));
            } else {
                commands.forEach(cmd => grid.appendChild(cmd));
            }
        }

        commands.forEach(command => {
            let visible = true;

            if (sortType === 'admin' && !command.classList.contains('admin-command')) visible = false;
            if (sortType === 'normal' && !command.classList.contains('normal-command')) visible = false;
            if (sortType === 'astronomy' && !command.classList.contains('astronomy-command')) visible = false;
            if (sortType === 'new' && !command.classList.contains('new-command')) visible = false;
            if (sortType === 'updated' && !command.classList.contains('updated-command')) visible = false;
            if (sortType === 'bug' && !command.classList.contains('bug-command')) visible = false;

            if (visible && searchFilter) {
                const commandText = (command.textContent || command.innerText).toLowerCase();
                if (!commandText.includes(searchFilter)) visible = false;
            }

            if (visible) {
                command.style.display = '';
                categoryHasVisible = true;
                hasVisibleCommand = true;
            } else {
                command.style.display = 'none';
            }
        });

        if (categoryHasVisible) {
            category.style.display = '';
        } else {
            category.style.display = 'none';
        }
    });

    const noResult2 = document.getElementById('noResult2');
    if (noResult2) {
        noResult2.style.display = hasVisibleCommand ? 'none' : 'block';
    }

    updateCommandCount();
}

function renderCommands(commands) {
    const commandList = document.querySelector('.command-list');
    if (!commandList) return;

    const fragment = document.createDocumentFragment();
    commandList.innerHTML = '';

    // Metadata for styling
    const categoryMeta = {
        'General': { id: 'general', icon: 'fa-info-circle', headerClass: 'general-header' },
        'Moderation': { id: 'moderation', icon: 'fa-shield-alt', headerClass: 'moderation-header' },
        'Admin': { id: 'admin', icon: 'fa-cogs', headerClass: 'admin-header' },
        'Utility': { id: 'utility', icon: 'fa-tools', headerClass: 'utility-header' },
        'Fun': { id: 'fun', icon: 'fa-smile', headerClass: 'fun-header' }
    };

    let currentCategory = null;
    let block = null;

    commands.forEach(cmd => {
        if (cmd.category !== currentCategory) {
            currentCategory = cmd.category;

            // Create new block for this category
            const meta = categoryMeta[currentCategory] || { id: currentCategory.toLowerCase(), icon: 'fa-question-circle', headerClass: '' };

            block = document.createElement('div');
            block.className = 'category-block';
            block.id = meta.id;

            const header = document.createElement('h2');
            header.className = `category-header ${meta.headerClass}`;
            header.innerHTML = `<i class="fas ${meta.icon}"></i> ${currentCategory}`;
            block.appendChild(header);

            fragment.appendChild(block);
        }

        const cmdDiv = document.createElement('div');
        // Determine permissions/classes
        let classes = ['command'];

        // Keep CSS classes for styling (colors etc) but NOT for permission logic logic
        if (currentCategory === 'Admin' || currentCategory === 'Moderation') {
            classes.push('admin-command');
        } else {
            classes.push('normal-command');
        }

        cmdDiv.className = classes.join(' ');

        const name = document.createElement('h3');
        name.textContent = `?${cmd.name}`;
        cmdDiv.appendChild(name);

        // Sanitize usage: strip any Python function representation (e.g. "<function get_prefix at 0x...>")
        // and replace with the default prefix "?"
        const rawUsage = cmd.usage || '?' + cmd.name;
        const usageText = rawUsage.replace(/<function\s+\w+\s+at\s+0x[0-9a-fA-F]+>/g, '?');
        const escapedUsage = usageText.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        const usageP = document.createElement('p');
        usageP.innerHTML = `<strong>Usage:</strong> <span class="code" id="command-code">${escapedUsage}<button class="copy-button" onclick="copyToClipboard(this)"><i class="fas fa-copy"></i></button></span>`;
        cmdDiv.appendChild(usageP);

        const descP = document.createElement('p');
        descP.innerHTML = `<strong>Description:</strong> ${cmd.description}`;

        if (cmd.permissions && cmd.permissions.length > 0) {
            const permsDiv = document.createElement('div');
            permsDiv.style.color = '#f04747';
            permsDiv.style.fontSize = '0.9em';
            permsDiv.innerHTML = `<strong>Requires:</strong> ${cmd.permissions.join(', ')}`;
            cmdDiv.appendChild(descP);
            cmdDiv.appendChild(permsDiv);
        } else {
            cmdDiv.appendChild(descP);
        }
        cmdDiv.style.cursor = 'pointer';
        cmdDiv.addEventListener('click', function (e) {
            // Don't open modal if clicking copy button
            if (e.target.closest('.copy-button')) return;
            openCommandModal(this);
        });

        block.appendChild(cmdDiv);
    });

    commandList.appendChild(fragment);
    sortCommands();
    updateCommandCount();
}

function openCommandModal(commandEl) {
    const modal = document.getElementById('commandModal');
    if (!modal) return;

    // Extract command info
    const name = commandEl.querySelector('h3')?.textContent?.trim() || '';
    const usageEl = commandEl.querySelector('.code');
    const usage = usageEl ? usageEl.textContent.replace(/\s+/g, ' ').trim() : name;
    const descEl = Array.from(commandEl.querySelectorAll('p')).find(p => p.textContent.includes('Description:'));
    const description = descEl ? descEl.textContent.replace('Description:', '').trim() : '';
    const permsEl = commandEl.querySelector('div[style*="color"]');
    const permissions = permsEl ? permsEl.textContent.replace('Requires:', '').trim() : '';

    // Determine category from parent block id
    const categoryBlock = commandEl.closest('.category-block');
    const categoryId = categoryBlock ? categoryBlock.id : '';
    const categoryNames = { general: 'General', moderation: 'Moderation', admin: 'Admin', utility: 'Utility', fun: 'Fun' };
    const categoryName = categoryNames[categoryId] || categoryId;

    // Populate modal
    document.getElementById('modalCommandName').textContent = name;
    document.getElementById('modalUsage').textContent = usage;
    document.getElementById('modalDescription').textContent = description;

    const catBadge = document.getElementById('modalCategory');
    catBadge.textContent = categoryName;
    catBadge.className = 'command-modal-category cat-' + categoryId;

    const permsSection = document.getElementById('modalPermsSection');
    if (permissions) {
        document.getElementById('modalPermissions').textContent = permissions;
        permsSection.style.display = '';
    } else {
        permsSection.style.display = 'none';
    }

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCommandModal(event) {
    // If called from overlay click, only close if clicking the overlay itself
    if (event && event.target && !event.target.classList.contains('command-modal-overlay')) return;

    const modal = document.getElementById('commandModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function copyModalUsage() {
    const usageEl = document.getElementById('modalUsage');
    const btn = document.getElementById('modalCopyBtn');
    if (!usageEl || !btn) return;

    try {
        await navigator.clipboard.writeText(usageEl.textContent.trim());
        const icon = btn.querySelector('i');
        icon.classList.remove('fa-copy');
        icon.classList.add('fa-check');
        btn.classList.add('copied');
        setTimeout(() => {
            icon.classList.remove('fa-check');
            icon.classList.add('fa-copy');
            btn.classList.remove('copied');
        }, 1500);
    } catch (err) {
        console.error('Unable to copy', err);
    }
}

// Help Modal Logic
function openHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeHelpModal(event) {
    // If called from overlay click, only close if clicking the overlay itself
    if (event && event.target && !event.target.classList.contains('command-modal-overlay')) return;

    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.classList.remove('active');
        // Only re-enable scrolling if the main command modal isn't also open (edge case)
        if (!document.getElementById('commandModal').classList.contains('active')) {
            document.body.style.overflow = '';
        }
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeCommandModal();
        closeHelpModal();
    }
});

// Initialize click handlers for static HTML commands
function initCommandClicks() {
    document.querySelectorAll('.command-list .command').forEach(cmd => {
        cmd.style.cursor = 'pointer';
        cmd.addEventListener('click', function (e) {
            if (e.target.closest('.copy-button')) return;
            openCommandModal(this);
        });
    });
}

// Run on DOM ready for static commands (fallback)
document.addEventListener('DOMContentLoaded', initCommandClicks);

async function copyToClipboard(button) {
    var codeElement = button.parentElement.innerText.trim();
    try {
        await navigator.clipboard.writeText(codeElement);
        var icon = button.querySelector('i');
        icon.classList.remove('fa-copy');
        icon.classList.add('fa-check');
        setTimeout(() => {
            icon.classList.remove('fa-check');
            icon.classList.add('fa-copy');
        }, 1000);
    } catch (err) {
        console.error('Unable to copy', err);
    }
}

// Dropdown Interaction
document.addEventListener('DOMContentLoaded', () => {
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownContainer = document.querySelector('.nav-item-dropdown');

    if (dropdownToggle && dropdownContainer) {
        dropdownToggle.addEventListener('click', (e) => {
            // Check if the click target is the arrow or inside the arrow element
            if (e.target.classList.contains('arrow') || e.target.closest('.arrow')) {
                e.preventDefault();
                dropdownContainer.classList.toggle('active');
            } else {
                // If clicking the text/link part, let it navigate (do nothing here)
            }
        });
    }
});

/*
   --------------------------------------------------------------
   Discord Authentication Logic (Implicit Flow)
   --------------------------------------------------------------
*/

function getRedirectUri() {
    const protocol = window.location.protocol;
    const host = window.location.host;

    // Normalize to base path with trailing slash
    if (host.includes('github.io')) {
        return `${protocol}//${host}/Pulsar-website/`;
    } else {
        return `${protocol}//${host}/Pulsar-website/`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

function checkAuth() {
    // 1. Check for Hash Params (Callback from Discord)
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');
    const tokenType = fragment.get('token_type');
    const state = fragment.get('state');

    if (accessToken) {
        // Verify state to prevent CSRF
        const savedState = localStorage.getItem('oauth_state');
        localStorage.removeItem('oauth_state'); // Always clear state after use

        if (!state || state !== savedState) {
            console.error('OAuth state mismatch. Potential CSRF attack.');
            showNotification('Authentication failed: security verification failed.', 'error');
            window.history.replaceState(null, null, ' ');
            return;
        }

        // Save to localStorage
        localStorage.setItem('discord_access_token', accessToken);
        localStorage.setItem('discord_token_type', tokenType);

        // Clear Hash from URL
        window.history.replaceState(null, null, ' ');

        // Notify User
        showNotification('Login successful!', 'success');

        // Fetch User Info
        fetchUserInfo(accessToken, tokenType);
    } else {
        // 2. Check LocalStorage (Already Logged In)
        const storedToken = localStorage.getItem('discord_access_token');
        const storedTokenType = localStorage.getItem('discord_token_type');

        if (storedToken) {
            fetchUserInfo(storedToken, storedTokenType);
        } else {
            renderAuthUI(null); // Render Login Button
        }
    }
}

async function fetchUserInfo(token, type) {
    try {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: {
                authorization: `${type} ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token invalid or expired');
        }

        const user = await response.json();
        renderAuthUI(user);


    } catch (error) {
        console.error('Auth Error:', error);
        logout(false); // Clear invalid token, don't notify
    }
}

function login() {
    // Generate a random state for CSRF protection
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('oauth_state', state);

    const redirectUri = getRedirectUri();
    const scope = 'identify guilds';
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${CONFIG.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&state=${state}`;
    window.location.href = authUrl;
}

function logout(notify = true) {
    localStorage.removeItem('discord_access_token');
    localStorage.removeItem('discord_token_type');
    renderAuthUI(null);

    if (notify) {
        showNotification('Logged out successfully.', 'success');
    }
}

function renderAuthUI(user) {
    const container = document.getElementById('discord-auth-container');
    const headerContainer = document.getElementById('header-auth-container');
    const basePath = getBasePath();

    // 1. Sidebar Auth UI
    if (container) {
        if (user) {
            // User Logged In
            const avatarUrl = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : `${basePath}photos/bot-pfp.png`; // Fallback icon

            container.innerHTML = `
                <div class="discord-user-profile">
                    <img src="${avatarUrl}" alt="${user.username}" class="discord-avatar">
                    <span class="discord-username">${user.username}</span>
                    <button class="discord-logout-btn" onclick="logout()" title="Logout">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            `;
        } else {
            // User Logged Out
            container.innerHTML = `
                <button class="discord-login-btn" onclick="login()">
                    <i class="fab fa-discord"></i> Connect via Discord
                </button>
            `;
        }
    }

    // 2. Header Auth UI (Only show button if logged out)
    if (headerContainer) {
        if (user) {
            headerContainer.innerHTML = ''; // Hide button if logged in
            headerContainer.style.display = 'none';
        } else {
            headerContainer.style.display = 'block';
            headerContainer.innerHTML = `
                <button class="header-login-btn" onclick="login()">
                    <i class="fab fa-discord"></i> Connect
                </button>
            `;
        }
    }
}

function getBasePath() {
    // Determine base path for assets based on current location
    const path = window.location.pathname;
    if (path.includes('/commands/') || path.includes('/contact-me/') || path.includes('/privacy/') || path.includes('/terms/') || path.includes('/dashboard/')) {
        return '../';
    }
    return './';
}

// Scroll to top button visibility
document.addEventListener('DOMContentLoaded', function () {
    const scrollBtn = document.getElementById('scroll-to-top');
    if (!scrollBtn) return;
    window.addEventListener('scroll', function () {
        if (window.scrollY > 200) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
});

// Update hardcoded Discord invite links
document.addEventListener('DOMContentLoaded', function () {
    const inviteLinks = document.querySelectorAll('a[href*="discord.com/oauth2/authorize"]');
    inviteLinks.forEach(link => {
        try {
            const url = new URL(link.href);
            if (url.searchParams.has('client_id')) {
                url.searchParams.set('client_id', CONFIG.DISCORD_CLIENT_ID);
                link.href = url.toString();
            }
        } catch (e) {
            console.error('Failed to update invite link', e);
        }
    });
});
