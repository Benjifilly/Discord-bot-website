document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('.command').forEach(command => {
        gsap.fromTo(command, { y: 50, opacity: 0 }, {
            y: 0,
            opacity: 1,
            scrollTrigger: {
                trigger: command,
                start: 'top 80%',
                end: 'bottom 60%',
                scrub: true,
                once: true
            }
        });
    });
});

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
    }
}

function toggleNav() {
    const navBar = document.getElementById("navBar");
    const burgerMenu = document.querySelector(".burger-menu");

    if (navBar.style.width === "250px") {
        navBar.style.width = "0";
        burgerMenu.classList.remove("open");
    } else {
        navBar.style.width = "250px";
        burgerMenu.classList.add("open");
    }
}