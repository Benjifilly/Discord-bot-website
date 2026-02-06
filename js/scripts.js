function searchCommands() {
    const noResult2 = document.getElementById('no-result2');
    if (noResult2.style.display === "block") {
        noResult2.style.display = "none";
    }
    // Reset to the default sort option
    document.getElementById('sortOptions').value = 'default';

    const input = document.getElementById('searchBar');
    const filter = input.value.toLowerCase();
    const commands = document.getElementsByClassName('command');
    let found = false; // Flag to track if any command is found

    for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const commandText = command.textContent || command.innerText;
        if (commandText.toLowerCase().includes(filter)) {
            command.style.display = "";
            found = true;
        } else {
            command.style.display = "none";
        }
    }

    const noResult = document.getElementById('no-result');
    const noResultQuery = document.getElementById('no-result-query');
    const ellipsis = document.getElementById('ellipsis');

    if (found) {
        noResult.style.display = "none";
    } else {
        noResult.style.display = "block";
        const maxLength = 20; // Set the maximum length of the displayed query
        const truncatedValue = input.value.length > maxLength ? input.value.substring(0, maxLength) + '...' : input.value;
        noResultQuery.textContent = truncatedValue;
        ellipsis.style.display = input.value.length > maxLength ? "inline" : "none";
    }
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

        // Mobile check for animation tuning
        const isMobile = window.matchMedia("(max-width: 768px)").matches;

        scrollSections.forEach((section) => {
            gsap.fromTo(section,
                { autoAlpha: 0, y: isMobile ? -10 : -20 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: isMobile ? 1.0 : 2.0, // Faster on mobile
                    ease: isMobile ? "power2.out" : "power4.out", // Simpler ease
                    scrollTrigger: {
                        trigger: section,
                        start: isMobile ? "top bottom" : "top 95%", // Mobile: Trigger AS SOON as it enters viewport
                        end: "top 60%",
                        toggleActions: "play none none none",
                        invalidateOnRefresh: true
                    }
                }
            );
        });
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

function sortCommands() {
    const sortOptions = document.getElementById('sortOptions');
    if (!sortOptions) return; // Exit if element doesn't exist

    const sortType = sortOptions.value;
    const commandsContainer = document.querySelector('.command-list');
    const commandSections = Array.from(commandsContainer.querySelectorAll('.command'));

    commandSections.forEach(command => command.style.display = '');
    const searchInput = document.getElementById('searchBar');
    searchInput.value = '';

    // Hide both no-result divs initially
    const noResult = document.getElementById('no-result');
    const noResult2 = document.getElementById('no-result2');
    noResult.style.display = 'none';
    noResult2.style.display = 'none';

    let hasVisibleCommand = false;

    switch (sortType) {
        case 'alphabetic-order':
            commandSections.sort((a, b) => {
                const nameA = a.querySelector('h3').textContent.toLowerCase();
                const nameB = b.querySelector('h3').textContent.toLowerCase();
                return nameA.localeCompare(nameB);
            });
            hasVisibleCommand = true;
            break;
        case 'alphabetic-disorder':
            commandSections.sort((a, b) => {
                const nameA = a.querySelector('h3').textContent.toLowerCase();
                const nameB = b.querySelector('h3').textContent.toLowerCase();
                return nameB.localeCompare(nameA);
            });
            hasVisibleCommand = true;
            break;
        case 'admin':
            commandSections.forEach(command => {
                if (!command.classList.contains('admin-command')) {
                    command.style.display = 'none';
                } else {
                    hasVisibleCommand = true;
                }
            });
            break;
        case 'normal':
            commandSections.forEach(command => {
                if (!command.classList.contains('normal-command')) {
                    command.style.display = 'none';
                } else {
                    hasVisibleCommand = true;
                }
            });
            break;
        case 'astronomy':
            commandSections.forEach(command => {
                if (!command.classList.contains('astronomy-command')) {
                    command.style.display = 'none';
                } else {
                    hasVisibleCommand = true;
                }
            });
            break;
        case 'new':
            commandSections.forEach(command => {
                if (!command.classList.contains('new-command')) {
                    command.style.display = 'none';
                } else {
                    hasVisibleCommand = true;
                }
            });
            break;
        case "updated":
            commandSections.forEach(command => {
                if (!command.classList.contains('updated-command')) {
                    command.style.display = 'none';
                } else {
                    hasVisibleCommand = true;
                }
            });
            break;
        case "bug":
            commandSections.forEach(command => {
                if (!command.classList.contains('bug-command')) {
                    command.style.display = 'none';
                } else {
                    hasVisibleCommand = true;
                }
            });
            break;
        case 'default':
        default:
            hasVisibleCommand = true; // Assume that the default shows all commands
            break;
    }

    // Show no-result2 only if no commands are visible after filtering
    if (!hasVisibleCommand) {
        noResult2.style.display = 'block';
    }

    // Ensure that no-result is not displayed at the same time as no-result2
    if (noResult2.style.display === 'block') {
        noResult.style.display = 'none';
    }

    commandsContainer.innerHTML = '';
    commandSections.forEach(command => commandsContainer.appendChild(command));
    updateCommandCount();
}

document.addEventListener('DOMContentLoaded', () => {
    sortCommands();
    updateCommandCount();
});

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

