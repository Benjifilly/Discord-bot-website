import aiohttp
import asyncio
from colorama import Fore, Style, init

init(autoreset=True)

bot_id = 'BOT_ID'
bot_token = 'BOT_TOKEN'

headers = {
    'Authorization': f'Bot {bot_token}'
}

async def get_bot_info(session):
    async with session.get(f'https://discord.com/api/v10/users/{bot_id}') as response:
        if response.status == 200:
            return await response.json()
        else:
            try:
                error_data = await response.json()
            except:
                error_data = await response.text()
            print(f"{Fore.RED}Failed to get bot info: {response.status}, {error_data}")
            return None

async def get_guilds(session):
    async with session.get('https://discord.com/api/v10/users/@me/guilds') as response:
        if response.status == 200:
            return await response.json()
        else:
            try:
                error_data = await response.json()
            except:
                error_data = await response.text()
            print(f"{Fore.RED}Failed to get guilds: {response.status}, {error_data}")
            return None

async def get_application_info(session):
    async with session.get('https://discord.com/api/v10/oauth2/applications/@me') as response:
        if response.status == 200:
            return await response.json()
        else:
            try:
                error_data = await response.json()
            except:
                error_data = await response.text()
            print(f"{Fore.RED}Failed to get application info: {response.status}, {error_data}")
            return None

async def main():
    async with aiohttp.ClientSession(headers=headers) as session:
        bot_info, guilds, app_info = await asyncio.gather(
            get_bot_info(session),
            get_guilds(session),
            get_application_info(session)
        )

    if bot_info:
        bot_name = bot_info['username']
        bot_discriminator = bot_info['discriminator']
        bot_avatar = bot_info['avatar']
        bot_pfp_url = f"https://cdn.discordapp.com/avatars/{bot_id}/{bot_avatar}.png"

        print(f"{Fore.GREEN}Bot Information:")
        print(f"{Fore.CYAN}Bot Name: {Fore.YELLOW}{bot_name}#{bot_discriminator}")
        print(f"{Fore.CYAN}Bot Profile Picture URL: {Fore.YELLOW}{bot_pfp_url}")

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
    asyncio.run(main())

print(Style.RESET_ALL)
