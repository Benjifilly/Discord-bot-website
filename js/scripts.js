

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