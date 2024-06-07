function searchCommands() {
    const input = document.getElementById('searchBar');
    const filter = input.value.toLowerCase();
    const commands = document.getElementsByClassName('command');

    for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const commandText = command.textContent || command.innerText;
        if (commandText.toLowerCase().includes(filter)) {
            command.style.display = "";
        } else {
            command.style.display = "none";
        }
        updateCommandCount();
    }
}

function toggleNav() {
    const navBar = document.getElementById('navBar');
    const burgerMenu = document.querySelector('.burger-menu');
    navBar.classList.toggle('open');
    burgerMenu.classList.toggle('open');
}

document.addEventListener("DOMContentLoaded", function() {
    gsap.from("header > *:not(.burger-menu)", {
        opacity: 0,
        y: 20,
        duration: 1,
        stagger: 0.1,
        ease: "power2.out"
    });

    gsap.from("main > *", {
        opacity: 0,
        y: 20,
        duration: 1,
        stagger: 0.3,
        ease: "power2.out"
    });

    gsap.from("footer > *", {
        opacity: 0,
        y: 20,
        duration: 1,
        stagger: 0.1,
        ease: "power2.out"
    });

    gsap.from("#navBar a", {
        opacity: 0,
        y: 20,
        duration: 1,
        stagger: 0.3,
        ease: "power2.out"
    });
});

const customGroups = {
    Astronomy: ['?daily_astronomy', '?mars_rover', '?moon', '?neo', '?space_fact', '?space_news'],
    Admin: ['?dm', '?clear', '?purge', '?create-role', '?delete-role', '?create-channel', '?delete-channel', '?create-category', '?delete-category', '?setup_webhook', '?warn', '?mute', '?unmute', '?kick', '?ban', '?unban', '?banned-users', '?poll', '?setup-logs', '?setup_webhook'],
    Normal: ['?code', '?forecast', '?help', '?invite', '?joke', '?ping', '?remind', '?roleinfo', '?say', '?server', '?show-profile', '?uptime', '?weather', '?webhook']
};

function updateCommandCount() {
    const commands = document.querySelectorAll('.command:not([style*="display: none"])');
    document.getElementById('commandCount').textContent = commands.length;
}

function sortCommands() {
    const sortType = document.getElementById('sortOptions').value;
    const commandsContainer = document.querySelector('.command-list');
    const commandSections = Array.from(commandsContainer.querySelectorAll('.command'));

    commandSections.forEach(command => command.style.display = '');

    switch (sortType) {
        case 'alphabetic-order':
            commandSections.sort((a, b) => {
                const nameA = a.querySelector('h3').textContent.toLowerCase();
                const nameB = b.querySelector('h3').textContent.toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;
        case 'alphabetic-disorder':
            commandSections.sort((a, b) => {
                const nameA = a.querySelector('h3').textContent.toLowerCase();
                const nameB = b.querySelector('h3').textContent.toLowerCase();
                return nameB.localeCompare(nameA);
            });
            break;
        case 'admin':
            commandSections.forEach(command => {
                if (!command.classList.contains('admin-command')) {
                    command.style.display = 'none';
                }
            });
            break;
        case 'normal':
            commandSections.forEach(command => {
                if (!command.classList.contains('normal-command')) {
                    command.style.display = 'none';
                }
            });
            break;
        case 'astronomy':
            commandSections.forEach(command => {
                if (!command.classList.contains('astronomy-command')) {
                    command.style.display = 'none';
                }
            });
            break;
        case 'others':
            commandSections.forEach(command => {
                if (!command.classList.contains('other-command')) {
                    command.style.display = 'none';
                }
            });
            break;
        case 'default':
        default:
            break;
    }

    commandsContainer.innerHTML = '';
    commandSections.forEach(command => commandsContainer.appendChild(command));
    updateCommandCount();
}

document.addEventListener('DOMContentLoaded', () => {
    sortCommands(); 
    updateCommandCount();
});

