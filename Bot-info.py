import requests
from colorama import Fore, Style, init

init(autoreset=True)

bot_id = 'BOT_ID'
bot_token = 'BOT_TOKEN'

headers = {
    'Authorization': f'Bot {bot_token}'
}

def handle_response(response, context):
    if response.status_code == 200:
        return response.json()
    else:
        print(f"{Fore.RED}Failed to get {context}: {response.status_code}, {response.json()}")
        return None

def get_bot_info():
    response = requests.get(f'https://discord.com/api/v10/users/{bot_id}', headers=headers)
    return handle_response(response, "bot info")

def get_guilds():
    response = requests.get('https://discord.com/api/v10/users/@me/guilds', headers=headers)
    return handle_response(response, "guilds")

def get_application_info():
    response = requests.get('https://discord.com/api/v10/oauth2/applications/@me', headers=headers)
    return handle_response(response, "application info")

def main():
    bot_info = get_bot_info()
    if bot_info:
        bot_name = bot_info['username']
        bot_discriminator = bot_info['discriminator']
        bot_avatar = bot_info['avatar']
        bot_pfp_url = f"https://cdn.discordapp.com/avatars/{bot_id}/{bot_avatar}.png"

        print(f"{Fore.GREEN}Bot Information:")
        print(f"{Fore.CYAN}Bot Name: {Fore.YELLOW}{bot_name}#{bot_discriminator}")
        print(f"{Fore.CYAN}Bot Profile Picture URL: {Fore.YELLOW}{bot_pfp_url}")

    guilds = get_guilds()
    if guilds:
        print(f"{Fore.GREEN}\nGuilds:")
        for guild in guilds:
            print(f"{Fore.CYAN}Guild Name: {Fore.YELLOW}{guild['name']}")
            print(f"{Fore.CYAN}Guild ID: {Fore.YELLOW}{guild['id']}")
            print(f"{Fore.CYAN}Owner: {Fore.YELLOW}{guild['owner']}")
            print(f"{Fore.CYAN}Permissions: {Fore.YELLOW}{guild['permissions']}")
            print(f"{Fore.CYAN}Features: {Fore.YELLOW}{', '.join(guild['features'])}")
            print(f"{Fore.CYAN}Icon URL: {Fore.YELLOW}https://cdn.discordapp.com/icons/{guild['id']}/{guild['icon']}.png" if guild['icon'] else f"{Fore.YELLOW}No Icon")
            print(f"{Fore.CYAN}{'-'*40}")

    app_info = get_application_info()
    if app_info:
        print(f"{Fore.GREEN}\nApplication Information:")
        print(f"{Fore.CYAN}Application Name: {Fore.YELLOW}{app_info['name']}")
        print(f"{Fore.CYAN}Application ID: {Fore.YELLOW}{app_info['id']}")
        print(f"{Fore.CYAN}Description: {Fore.YELLOW}{app_info['description']}")
        print(f"{Fore.CYAN}Public Bot: {Fore.YELLOW}{app_info['bot_public']}")
        print(f"{Fore.CYAN}Requires Code Grant: {Fore.YELLOW}{app_info['bot_require_code_grant']}")
        print(f"{Fore.CYAN}Owner: {Fore.YELLOW}{app_info['owner']['username']}#{app_info['owner']['discriminator']}")
        print(f"{Fore.CYAN}Owner ID: {Fore.YELLOW}{app_info['owner']['id']}")
        print(f"{Fore.CYAN}Icon URL: {Fore.YELLOW}https://cdn.discordapp.com/app-icons/{app_info['id']}/{app_info['icon']}.png" if app_info['icon'] else f"{Fore.YELLOW}No Icon")

if __name__ == "__main__":
    main()

print(Style.RESET_ALL)
