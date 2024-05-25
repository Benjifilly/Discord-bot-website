import math
import discord
from discord.ext import commands
import asyncio
from discord.ext.commands import check, CheckFailure, MissingPermissions
import datetime
from discord.ui import View, Button
import difflib



description = '''Sol's Macro Bot'''

intents = discord.Intents.default()
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix='?', description=description, intents=intents)
bot.remove_command('help')

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user} (ID: {bot.user.id})')
    print('------')

def owner_admin():
    async def predicate(ctx):
        if not ctx.message.author.guild_permissions.administrator:
            if ctx.message.author.id != 882920589269020672:  # Replace <your_id_here> with the actual ID of the user
                error_embed = discord.Embed(title="❌ Error ❌", description="You do not have permission to use this command.", color=discord.Color.red())
                await ctx.send(embed=error_embed)
                return False
            elif ctx.message.author.id == 882920589269020672:  # Replace <your_id_here> with the actual ID of the user
                role_id = 1242366831424045078  # Replace <your_role_id_here> with the actual ID of the role
                role = discord.utils.get(ctx.guild.roles, id=role_id)
                if role in ctx.message.author.roles:
                    return True
                else:
                    error_embed = discord.Embed(title="❌ Error ❌", description="You do not have permission to use this command.", color=discord.Color.red())
                    await ctx.send(embed=error_embed)
                    return False
        else:
            return True
    return commands.check(predicate)

@bot.command(name='help', help='Show the list of commands or get help for a specific command')
async def help(ctx, *, command_name: str = None):
    if command_name:
        # If a specific command is queried
        command = bot.get_command(command_name)
        if command:
            params = " ".join([f"({name})" if param.default is not param.empty else f"[{name}]" for name, param in command.clean_params.items()])
            embed = discord.Embed(title=f"Help for `{command.name}`", description=command.help or "No description provided.", color=discord.Color.blue())
            embed.add_field(name="Usage", value=f"`?{command.name} {params}`", inline=False)
            if any(check.__name__ == 'predicate' for check in command.checks):
                embed.add_field(name="Admin Only", value="This command requires admin privileges.", inline=False)
            embed.set_footer(text="Syntax: [required] (optional)")
            await ctx.send(embed=embed)
        else:
            await ctx.send(f"Command `{command_name}` not found.")
        return

    # Create an embed with the list of commands
    embed = discord.Embed(title="Bot Commands", description="Here is a list of available commands:", color=discord.Color.blue())

    # Get the list of bot commands
    command_list = list(bot.commands)

    # Calculate the total number of pages
    total_pages = math.ceil(len(command_list) / 10)

    # Ensure the page number is within valid range
    page_number = 1
    try:
        page_number = int(ctx.message.content.split()[-1])
    except (IndexError, ValueError):
        pass
    page_number = max(1, min(page_number, total_pages))

    # Calculate the start and end index of the commands for the current page
    start_index = (page_number - 1) * 10
    end_index = min(start_index + 10, len(command_list))

    # Loop through the commands for the current page
    for command in command_list[start_index:end_index]:
        params = " ".join([f"({name})" if param.default is not param.empty else f"[{name}]" for name, param in command.clean_params.items()])
        # Check if the command has the owner_admin decorator
        if any(check.__name__ == 'predicate' for check in command.checks):
            embed.add_field(name=f"{command.name} {params} `(Admin)`", value=command.help, inline=True)
        else:
            embed.add_field(name=f"{command.name} {params}", value=command.help, inline=True)

    # Set the footer and timestamp
    user = await bot.fetch_user(882920589269020672)
    avatar_url = user.avatar.url if user.avatar else user.default_avatar.url
    embed.set_footer(text=f"Page {page_number} of {total_pages} | Created by {user}#{user.discriminator}", icon_url=avatar_url)
    embed.timestamp = datetime.datetime.now()

    # Create a UI view with buttons
    view = discord.ui.View()

    # Previous page button
    view.add_item(discord.ui.Button(label="Previous Page", style=discord.ButtonStyle.primary, emoji="⬅️", custom_id="previous"))

    # Next page button
    view.add_item(discord.ui.Button(label="Next Page", style=discord.ButtonStyle.primary, emoji="➡️", custom_id="next"))

    # Send the embed with the view
    message = await ctx.send(embed=embed, view=view)

    # Callback for buttons
    async def button_callback(interaction):
        if interaction.user != ctx.author:
            await interaction.response.send_message("This is not your command to control!", ephemeral=True)
            return

        nonlocal page_number
        if interaction.data['custom_id'] == "previous":
            page_number = max(1, page_number - 1)
        elif interaction.data['custom_id'] == "next":
            page_number = min(total_pages, page_number + 1)

        # Recreate the embed with updated page
        embed.clear_fields()
        start_index = (page_number - 1) * 10
        end_index = min(start_index + 10, len(command_list))
        for command in command_list[start_index:end_index]:
            params = " ".join([f"({name})" if param.default is not param.empty else f"[{name}]" for name, param in command.clean_params.items()])
            if any(check.__name__ == 'predicate' for check in command.checks):
                embed.add_field(name=f"{command.name} {params} `(Admin)`", value=command.help, inline=True)
            else:
                embed.add_field(name=f"{command.name} {params}", value=command.help, inline=True)
        embed.set_footer(text=f"Page {page_number} of {total_pages} | Created by {user}#{user.discriminator}", icon_url=avatar_url)

        # Update the message
        await interaction.response.edit_message(embed=embed, view=view)

    # Add the callback to the buttons
    for item in view.children:
        item.callback = button_callback

@bot.command(name='show-profile', help='Show the profile of the specified user')
async def show_profile(ctx, user: discord.Member = None):
    try:
        if user is None:
            user = ctx.author

        # Convert the joined_at and created_at datetime strings to formatted strings
        joined_at = user.joined_at.strftime("%Y-%m-%d at %I:%M:%S %p")
        created_at = user.created_at.strftime("%Y-%m-%d at %I:%M:%S %p")

        # Create an embed with the user's profile
        embed = discord.Embed(title=f"{user.name}'s Profile", color=discord.Color.blue())
        embed.set_author(name=user.name, icon_url=user.avatar.url)
        embed.set_thumbnail(url=user.avatar.url)  # Set the user's avatar as the thumbnail
        embed.add_field(name="ID", value=user.id, inline=False)
        embed.add_field(name="Status", value=user.status, inline=False)
        embed.add_field(name="Top Role", value=user.top_role.name, inline=False)  # Display top role name
        embed.add_field(name="Joined At", value=joined_at, inline=False)
        embed.add_field(name="Created At", value=created_at, inline=False)
        
        # Fetch bot owner for footer
        bot_owner = await bot.fetch_user(882920589269020672)
        embed.set_footer(text=f"Created by {bot_owner.name}", icon_url=bot_owner.avatar.url)
        
        embed.timestamp = datetime.datetime.now()  # Set the current date and time as the timestamp

        await ctx.send(embed=embed)
    except Exception as e:
        # Handle the error
        embed = discord.Embed(title="❌ Error ❌", description=f"Cannot show the profile of the user. Error: {str(e)}", color=discord.Color.red())
        await ctx.send(embed=embed)

@bot.command(name='ping', help='check the bot\'s latency')
async def ping(ctx):
    latency = bot.latency
    embed = discord.Embed(title="🏓 Pong!", description=f"Latency: {latency*1000:.2f}ms", color=discord.Color.green())
    await ctx.send(embed=embed)

@bot.command(name='say', help='Make the bot say something. To send a message to a specific channel, mention the channel and then the message.')
async def say(ctx, *, message):
    try:
        channel_mentions = ctx.message.channel_mentions
        if channel_mentions:
            channel = channel_mentions[0]
            message_content = message.replace(f'<#{channel.id}>', '').strip()
            await channel.send(message_content)
            embed = discord.Embed(title="✅ Message Sent ✅", description=f"Message sent to #{channel.name}", color=discord.Color.green())
            await ctx.send(embed=embed)
        else:
            await ctx.send(message)
    except discord.errors.NotFound:
        embed = discord.Embed(title="❌ Error ❌", description="The specified channel was not found.", color=discord.Color.red())
        await ctx.send(embed=embed)
    except Exception as e:
        embed = discord.Embed(title="❌ Error ❌", description=f"Cannot send the message. Error: {str(e)}", color=discord.Color.red())
        await ctx.send(embed=embed)


@bot.command(name='clear', help='clear messages in a channel')
@owner_admin()
async def clear(ctx, amount=5):
    await ctx.channel.purge(limit=amount+1)
    # Create and send a success message embed
    embed = discord.Embed(title="✅ Messages Cleared ✅", description=f"{amount} messages have been cleared in this channel.", color=discord.Color.green())
    await ctx.send(embed=embed)

@bot.command(name='purge', help='Purge messages in a channel')
@owner_admin()
async def purge(ctx):
    # Create button components
    view = discord.ui.View()
    confirm_button = discord.ui.Button(style=discord.ButtonStyle.green, label="Yes", emoji="✅")
    cancel_button = discord.ui.Button(style=discord.ButtonStyle.red, label="No", emoji="❌")

    # Add buttons to the view
    view.add_item(confirm_button)
    view.add_item(cancel_button)

    # Ask for verification
    embed = discord.Embed(title="⚠️ Purge Confirmation ⚠️", description="Are you sure you want to purge all messages in this channel?", color=discord.Color.orange())
    verification_message = await ctx.send(embed=embed, view=view)

    # Define button callback functions
    async def confirm_button_callback(interaction):
        if interaction.user != ctx.author:
            await interaction.response.send_message("You are not authorized to perform this action.", ephemeral=True)
            return
        # Delete the channel
        category = ctx.channel.category  # Get the current category
        await ctx.channel.delete()
        # Create the channel with the same name and permissions in the same category
        channel = await ctx.guild.create_text_channel(name=ctx.channel.name, category=category, overwrites=ctx.channel.overwrites)
        # Send confirmation message
        embed = discord.Embed(title="✅ Purge Completed ✅", description="All messages in this channel have been purged.", color=discord.Color.green())
        await channel.send(embed=embed)

    async def cancel_button_callback(interaction):
        if interaction.user != ctx.author:
            await interaction.response.send_message("You are not authorized to perform this action.", ephemeral=True)
            return
        # Modify the previous embed with the cancellation message
        embed = discord.Embed(title="❌ Purge Cancelled ❌", description="Purge operation has been cancelled.", color=discord.Color.red())
        await verification_message.edit(embed=embed)
        await interaction.response.defer()

    # Assign callbacks to buttons
    confirm_button.callback = confirm_button_callback
    cancel_button.callback = cancel_button_callback

    # Disable the buttons after interaction
    await bot.wait_for('interaction', timeout=60.0, check=lambda i: i.user == ctx.author and i.message.id == verification_message.id)
    confirm_button.disabled = True
    cancel_button.disabled = True
    await verification_message.edit(view=view)


@bot.command(name='create-role', help='create a role with the specified name')
@owner_admin()
async def create_role(ctx, role_name):
    # Create the role
    role = await ctx.guild.create_role(name=role_name)
    # Create and send a success message embed
    embed = discord.Embed(title="✅ Role Created ✅", description=f"Role '{role_name}' has been created.", color=discord.Color.green())
    await ctx.send(embed=embed)


class ConfirmView(View):
    def __init__(self, ctx, role_name):
        super().__init__(timeout=60)
        self.ctx = ctx
        self.role_name = role_name
        self.value = None

    @discord.ui.button(label='Confirm', style=discord.ButtonStyle.green)
    async def confirm(self, interaction: discord.Interaction, button: Button):
        if interaction.user == self.ctx.author:
            self.value = True
            self.stop()

    @discord.ui.button(label='Cancel', style=discord.ButtonStyle.red)
    async def cancel(self, interaction: discord.Interaction, button: Button):
        if interaction.user == self.ctx.author:
            self.value = False
            self.stop()

@bot.command(name='delete-role', help='Delete a role with the specified name')
@owner_admin()
async def delete_role(ctx, role_name):
    # Check if the role exists
    existing_role = discord.utils.get(ctx.guild.roles, name=role_name)
    if existing_role is not None:
        # Create a confirmation message embed
        confirmation_embed = discord.Embed(title="⚠️ Confirmation ⚠️", description=f"Are you sure you want to delete role '{role_name}'?", color=discord.Color.orange())
        view = ConfirmView(ctx, role_name)
        confirmation_message = await ctx.send(embed=confirmation_embed, view=view)

        # Wait for the user's response
        await view.wait()

        if view.value is None:
            await confirmation_message.edit(embed=discord.Embed(title="❌ Timeout ❌", description="You did not confirm the deletion within 60 seconds.", color=discord.Color.red()), view=None)
        elif view.value:
            # Delete the role
            await existing_role.delete()
            await confirmation_message.edit(embed=discord.Embed(title="✅ Role Deleted ✅", description=f"Role '{role_name}' has been deleted.", color=discord.Color.green()), view=None)
        else:
            await confirmation_message.edit(embed=discord.Embed(title="❌ Deletion Cancelled ❌", description=f"Deletion of role '{role_name}' has been cancelled.", color=discord.Color.red()), view=None)
    else:
        await ctx.send(embed=discord.Embed(title="❌ Error ❌", description=f"Role '{role_name}' does not exist.", color=discord.Color.red()))
    

@bot.command(name='create-channel', help='create a channel with the specified name')
@owner_admin()
async def create_channel(ctx, category, channel_name):
    # Find the category by name
    category = discord.utils.get(ctx.guild.categories, name=category)
    
    if category is None:
        embed = discord.Embed(title="❌ Error ❌", description=f"Category '{category}' does not exist.", color=discord.Color.red())
        await ctx.send(embed=embed)
        return
    
    # Create the channel in the specified category
    channel = await ctx.guild.create_text_channel(name=channel_name, category=category)
    
    # Create and send a success message embed
    embed = discord.Embed(title="✅ Channel Created ✅", description=f"Channel #[{channel_name}](https://discord.com/channels/{ctx.guild.id}/{channel.id}) has been created in category '{category.name}'.", color=discord.Color.green())
    await ctx.send(embed=embed)

@bot.command(name='create-category', help='create a category with the specified name')
@owner_admin()
async def create_category(ctx, category_name):
    # Create the category
    category = await ctx.guild.create_category(name=category_name)
    # Create and send a success message embed
    embed = discord.Embed(title="✅ Category Created ✅", description=f"Category '{category_name}' has been created.", color=discord.Color.green())
    await ctx.send(embed=embed)



@bot.command(name='invite', help='Get the invite link for the bot')
async def invite(ctx):
    invite_link = discord.utils.oauth_url(bot.user.id, permissions=discord.Permissions(permissions=8))
    embed = discord.Embed(title="🤖 Invite Link 🤖", description="Click the button below to invite the bot to your server:", color=discord.Color.blue())
    
    if bot.user.avatar:
        embed.set_thumbnail(url=bot.user.avatar.url)
    
    user = await bot.fetch_user(882920589269020672)
    embed.set_footer(text="Created by Edzar#edzar1070", icon_url=user.avatar.url)
    embed.timestamp = datetime.datetime.now()
    
    # Create a button with the invite link
    button = discord.ui.Button(label="Invite", url=invite_link, style=discord.ButtonStyle.link)
    
    # Create a view and add the button to it
    view = discord.ui.View()
    view.add_item(button)
    
    # Send the embed with the button
    await ctx.send(embed=embed, view=view)

@bot.command(name='webhook', help='create a channel and give the user a webhook')
async def webhook(ctx, saloon_name = None):
    if saloon_name is None:
        saloon_name = f"{ctx.author.name}'s channel"
        
    category = discord.utils.get(ctx.guild.categories, name="Gaming")
    channel = await ctx.guild.create_text_channel(name=saloon_name, category=category)  # Pass the category object instead of its ID

    # Set the permissions for the user who typed the command
    await channel.set_permissions(ctx.author, read_messages=True, send_messages=True, manage_channels=True)
    await channel.set_permissions(ctx.guild.default_role, read_messages=False)  # Set default role to not have access

    # Send a message in the created saloon with the webhook
    webhook = await channel.create_webhook(name="Saloon Webhook")
    embed = discord.Embed(title="❗ Need Help? ❗", description="If you need help on how to use the webhook, please contact an administrator.", color=discord.Color.orange())
    await webhook.send(embed=embed, content=f"Hey {ctx.author.mention}, welcome to the saloon!")
    embed = discord.Embed(title="Saloon Webhook", description=f"Webhook URL: {webhook.url}", color=discord.Color.blue())
    await webhook.send(embed=embed)

    # Create and send a cool message embed with a button
    embed = discord.Embed(title="✅ Channel Created ✅", description=f"Channel created as [#{channel.name}](https://discord.com/channels/{ctx.guild.id}/{channel.id})", color=discord.Color.green())
    await ctx.send(embed=embed)

@bot.command(name='delete-channel', help='delete a channel with the specified name')
@owner_admin()
async def delete_channel(ctx, channel_name):
    # Check if the channel exists
    existing_channel = discord.utils.get(ctx.guild.channels, name=channel_name)

    # If the channel exists
    if existing_channel is not None:
        # Create a confirmation message embed
        confirmation_embed = discord.Embed(title="⚠️ Confirmation ⚠️", description=f"Are you sure you want to delete channel #{channel_name}?", color=discord.Color.orange())

        # Create a view with buttons
        class ConfirmationView(View):
            def __init__(self, ctx, channel_name, existing_channel):
                super().__init__(timeout=60.0)  # Timeout after 60 seconds
                self.ctx = ctx
                self.channel_name = channel_name
                self.existing_channel = existing_channel

            @discord.ui.button(label='Yes', style=discord.ButtonStyle.green)
            async def confirm_button(self, interaction: discord.Interaction, button: discord.ui.Button):
                await self.existing_channel.delete()
                success_embed = discord.Embed(title="✅ Channel Deleted ✅", description=f"Channel #{self.channel_name} has been deleted.", color=discord.Color.green())
                await interaction.response.edit_message(embed=success_embed, view=None)
                self.stop()

            @discord.ui.button(label='No', style=discord.ButtonStyle.red)
            async def cancel_button(self, interaction: discord.Interaction, button: discord.ui.Button):
                cancel_embed = discord.Embed(title="❌ Deletion Cancelled ❌", description=f"Deletion of channel #{self.channel_name} has been cancelled.", color=discord.Color.red())
                await interaction.response.edit_message(embed=cancel_embed, view=None)
                self.stop()

        confirmation_view = ConfirmationView(ctx, channel_name, existing_channel)
        confirmation_message = await ctx.send(embed=confirmation_embed, view=confirmation_view)
        await confirmation_view.wait()  # Wait for the user to interact with the buttons

    else:
        error_embed = discord.Embed(title="❌ Error ❌", description=f"Channel '{channel_name}' does not exist.", color=discord.Color.red())
        await ctx.send(embed=error_embed)

@bot.command(name='delete-category', help='delete a category with the specified name')
@owner_admin()
async def delete_category(ctx, category_name):
    # Check if the category exists
    existing_category = discord.utils.get(ctx.guild.categories, name=category_name)

    # If the category exists
    if existing_category is not None:
        # Create a confirmation message embed
        confirmation_embed = discord.Embed(title="⚠️ Confirmation ⚠️", description=f"Are you sure you want to delete the category '{category_name}'? This action will delete all channels within the category.", color=discord.Color.orange())

        # Create a view with buttons
        class ConfirmationView(View):
            def __init__(self, ctx, category_name, existing_category):
                super().__init__(timeout=60.0)  # Timeout after 60 seconds
                self.ctx = ctx
                self.category_name = category_name
                self.existing_category = existing_category

            @discord.ui.button(label='Yes', style=discord.ButtonStyle.green)
            async def confirm_button(self, interaction: discord.Interaction, button: discord.ui.Button):
                # Delete all channels within the category
                for channel in self.existing_category.channels:
                    await channel.delete()

                # Delete the category
                await self.existing_category.delete()

                success_embed = discord.Embed(title="✅ Category Deleted ✅", description=f"Category '{self.category_name}' and all its channels have been deleted.", color=discord.Color.green())
                await interaction.response.edit_message(embed=success_embed, view=None)
                self.stop()

            @discord.ui.button(label='No', style=discord.ButtonStyle.red)
            async def cancel_button(self, interaction: discord.Interaction, button: discord.ui.Button):
                cancel_embed = discord.Embed(title="❌ Category Deletion Canceled ❌", description=f"Category '{self.category_name}' deletion has been canceled.", color=discord.Color.red())
                await interaction.response.edit_message(embed=cancel_embed, view=None)
                self.stop()

        confirmation_view = ConfirmationView(ctx, category_name, existing_category)
        confirmation_message = await ctx.send(embed=confirmation_embed, view=confirmation_view)
        await confirmation_view.wait()  # Wait for the user to interact with the buttons

    else:
        error_embed = discord.Embed(title="❌ Error ❌", description=f"Category '{category_name}' does not exist.", color=discord.Color.red())
        await ctx.send(embed=error_embed)

@bot.command(name='kick', help='Kick the specified user')
@owner_admin()
async def kick(ctx, user: discord.Member, *, reason=None):
    try:
        # Send a DM to the kicked user
        dm_embed = discord.Embed(title="❗ You have been kicked ❗", description=f"You have been kicked from {ctx.guild.name} for the following reason: {reason}", color=discord.Color.red())
        await user.send(embed=dm_embed)

        # Kick the user
        await user.kick(reason=reason)
        
        # Create and send a success message embed
        embed = discord.Embed(title="✅ User Kicked ✅", description=f"{user.mention} has been kicked.", color=discord.Color.green())
        await ctx.send(embed=embed)
    except discord.Forbidden:
        # Handle the forbidden error
        embed = discord.Embed(title="❌ Error ❌", description="I do not have permission to kick this user.", color=discord.Color.red())
        await ctx.send(embed=embed)
    except discord.HTTPException as e:
        # Handle other HTTP exceptions
        embed = discord.Embed(title="❌ Error ❌", description=f"Failed to kick the user. Error: {str(e)}", color=discord.Color.red())
        await ctx.send(embed=embed)

@bot.command(name='ban', help='Ban the specified user for a certain number of days')
@owner_admin()
async def ban(ctx, user: discord.Member, duration: int, *, reason=None):
    try:
        # Send a DM to the banned user
        dm_embed = discord.Embed(
            title="❗ You have been banned ❗",
            description=f"You have been banned for {duration} days from {ctx.guild.name} for the following reason: {reason}",
            color=discord.Color.red()
        )
        await user.send(embed=dm_embed)
        
        # Ban the user
        delete_message_days = min(duration, 7)  # Limit delete_message_days to a maximum of 7
        await user.ban(reason=reason, delete_message_days=delete_message_days)
        
        # Create and send a success message embed
        embed = discord.Embed(
            title="✅ User Banned ✅",
            description=f"{user.mention} has been banned for {duration} days.",
            color=discord.Color.green()
        )
        await ctx.send(embed=embed)
        
        # Schedule the unban after the specified duration
        await asyncio.sleep(duration * 86400)  # Convert days to seconds
        await ctx.guild.unban(user, reason="Ban duration expired")
        
        # Create and send an unban message embed
        unban_embed = discord.Embed(
            title="✅ User Unbanned ✅",
            description=f"{user.mention} has been unbanned after {duration} days.",
            color=discord.Color.green()
        )
        await ctx.send(embed=unban_embed)
    except discord.Forbidden:
        # Handle the forbidden error
        embed = discord.Embed(
            title="❌ Error ❌",
            description="I do not have permission to ban this user.",
            color=discord.Color.red()
        )
        await ctx.send(embed=embed)
    except discord.HTTPException as e:
        # Handle other HTTP exceptions
        embed = discord.Embed(
            title="❌ Error ❌",
            description=f"Failed to ban the user. Error: {str(e)}",
            color=discord.Color.red()
        )
        await ctx.send(embed=embed)
    except:
        # Handle other exceptions
        embed = discord.Embed(
            title="❌ Error ❌",
            description="Failed to ban the user.",
            color=discord.Color.red()
        )
        await ctx.send(embed=embed)

@bot.command(name='unban', help='Unban the specified user by user ID')
@owner_admin()
async def unban(ctx, user_id: int, *, reason=None):
    try:
        # Get the user object from the user ID
        user = await bot.fetch_user(user_id)
        
        # Unban the user
        await ctx.guild.unban(user, reason=reason)
        
        # Create and send a success message embed
        embed = discord.Embed(
            title="✅ User Unbanned ✅",
            description=f"{user.mention} has been unbanned.",
            color=discord.Color.green()
        )
        await ctx.send(embed=embed)

        try:
            # Send a DM to the unbanned user
            dm_embed = discord.Embed(
                title="❗ You have been unbanned ❗",
                description=f"You have been unbanned from {ctx.guild.name} for the following reason: {reason}",
                color=discord.Color.green()
            )
            await user.send(embed=dm_embed)
        except discord.Forbidden:
            # Handle the case where the bot cannot send a DM to the user
            pass

    except discord.NotFound:
        # Handle the case where the user is not found
        embed = discord.Embed(
            title="❌ Error ❌",
            description="User not found. Please ensure the user ID is correct.",
            color=discord.Color.red()
        )
        await ctx.send(embed=embed)
    except discord.Forbidden:
        # Handle the forbidden error
        embed = discord.Embed(
            title="❌ Error ❌",
            description="I do not have permission to unban this user.",
            color=discord.Color.red()
        )
        await ctx.send(embed=embed)
    except discord.HTTPException as e:
        # Handle other HTTP exceptions
        embed = discord.Embed(
            title="❌ Error ❌",
            description=f"Failed to unban the user. Error: {str(e)}",
            color=discord.Color.red()
        )
        await ctx.send(embed=embed)

class PaginationView(View):
    def __init__(self, ctx, banned_users, items_per_page):
        super().__init__(timeout=60)
        self.ctx = ctx
        self.banned_users = banned_users
        self.items_per_page = items_per_page
        self.page = 1
        self.total_pages = math.ceil(len(banned_users) / items_per_page)
        self.message = None

        # Add buttons to the view
        self.add_item(Button(label="Previous", emoji="⬅️", style=discord.ButtonStyle.primary, custom_id="previous"))
        self.add_item(Button(label="Next", emoji="➡️", style=discord.ButtonStyle.primary, custom_id="next"))

    async def send_initial_message(self):
        embed = self.create_embed()
        self.message = await self.ctx.send(embed=embed, view=self)

    def create_embed(self):
        start_index = (self.page - 1) * self.items_per_page
        end_index = start_index + self.items_per_page
        banned_users_page = self.banned_users[start_index:end_index]

        embed = discord.Embed(title="Banned Users", color=discord.Color.red())
        for entry in banned_users_page:
            user = entry.user
            embed.add_field(name=user.name, value=user.id, inline=False)
            embed.set_thumbnail(url=user.avatar.url if user.avatar else user.default_avatar.url)
        embed.set_footer(text=f"Page {self.page}/{self.total_pages}")
        return embed

    @discord.ui.button(label="Previous", emoji="⬅️", style=discord.ButtonStyle.primary)
    async def previous_button_callback(self, button, interaction):
        if self.page > 1:
            self.page -= 1
            embed = self.create_embed()
            await self.message.edit(embed=embed)

    @discord.ui.button(label="Next", emoji="➡️", style=discord.ButtonStyle.primary)
    async def next_button_callback(self, button, interaction):
        if self.page < self.total_pages:
            self.page += 1
            embed = self.create_embed()
            await self.message.edit(embed=embed)

@bot.command(name='banned-users', help='Show the list of banned users')
@owner_admin()
async def banned_users(ctx, search: str = None):
    # Get the list of banned users
    banned_users = [entry async for entry in ctx.guild.bans()]
    
    if search:
        # Find the closest matching usernames
        usernames = [entry.user.name for entry in banned_users]
        closest_matches = difflib.get_close_matches(search, usernames, n=5, cutoff=0.5)
        banned_users = [entry for entry in banned_users if entry.user.name in closest_matches]

    items_per_page = 5

    # Create the pagination view
    view = PaginationView(ctx, banned_users, items_per_page)
    await view.send_initial_message()

@bot.command(name='mute', help='mute the specified user')
@owner_admin()
async def mute(ctx, user:discord.Member, duration:int, *, reason=None):
    try:
        # Get the muted role
        muted_role = discord.utils.get(ctx.guild.roles, name="Muted")

        # If the muted role does not exist, create it
        if muted_role is None:
            muted_role = await ctx.guild.create_role(name="Muted", reason="To mute users")
            for channel in ctx.guild.channels:
                await channel.set_permissions(muted_role, send_messages=False)

        # Add the muted role to the user
        await user.add_roles(muted_role, reason=reason)
        # Create and send a success message embed
        embed = discord.Embed(title="✅ User Muted ✅", description=f"{user.mention} has been muted for {duration} seconds.", color=discord.Color.green())
        await ctx.send(embed=embed)

        # Send a DM to the muted user
        dm_embed = discord.Embed(title="❗ You have been muted ❗", description=f"You have been muted from the server for the following reason: {reason}\n Time left: {duration} ", color=discord.Color.red())
        await user.send(embed=dm_embed)

        # Unmute the user after the specified duration
        await asyncio.sleep(duration)
        await user.remove_roles(muted_role)

        # Send a DM to the unmuted user
        unmute_embed = discord.Embed(title="✅ You have been unmuted ✅", description=f"You have been unmuted in the server.", color=discord.Color.green())
        await user.send(embed=unmute_embed)
    except:
        # Handle the error
        embed = discord.Embed(title="❌ Error ❌", description="Cannot mute the user.", color=discord.Color.red())
        await ctx.send(embed=embed)

@bot.command(name='unmute', help='unmute the specified user')
@owner_admin()
async def unmute(ctx, user:discord.Member, *, reason=None):
    try:
        # Get the muted role
        muted_role = discord.utils.get(ctx.guild.roles, name="Muted")

        # If the muted role does not exist, create it
        if muted_role is None:
            muted_role = await ctx.guild.create_role(name="Muted", reason="To mute users")
            for channel in ctx.guild.channels:
                await channel.set_permissions(muted_role, send_messages=False)

        # Remove the muted role from the user
        await user.remove_roles(muted_role, reason=reason)
        # Create and send a success message embed
        embed = discord.Embed(title="✅ User Unmuted ✅", description=f"{user.mention} has been unmuted.", color=discord.Color.green())
        await ctx.send(embed=embed)

        # Send a DM to the unmuted user
        dm_embed = discord.Embed(title="❗ You have been unmuted ❗", description=f"You have been unmuted from the server for the following reason: {reason}", color=discord.Color.red())
        await user.send(embed=dm_embed)
    except :
        # Handle the error
        embed = discord.Embed(title="❌ Error ❌", description="Cannot unmute the user.", color=discord.Color.red())
        await ctx.send(embed=embed)

@bot.command(name='warn', help='warn the specified user')
@owner_admin()
async def warn(ctx, user:discord.Member, *, reason=None):
    try:
        # Create and send a warning message embed
        embed = discord.Embed(title="⚠️ Warning ⚠️", description=f"You have been warned for the following reason: {reason}", color=discord.Color.orange())
        await user.send(embed=embed)

        # Create and send a success message embed
        embed = discord.Embed(title="✅ User Warned ✅", description=f"{user.mention} has been warned.", color=discord.Color.green())
        await ctx.send(embed=embed)
    except :
        # Handle the error
        embed = discord.Embed(title="❌ Error ❌", description="Cannot send a warning to the user.", color=discord.Color.red())
        await ctx.send(embed=embed)

@bot.command(name='dm', help='send a direct message to a user')
@owner_admin()
async def dm(ctx, user: discord.Member, *, message):
    try:
        # Create an embed with the sender's information
        embed = discord.Embed(title="Direct Message !", color=discord.Color.blue())
        embed.set_author(name=ctx.author.name, icon_url=ctx.author.avatar.url)
        embed.add_field(name="Message", value=message, inline=False)
        await user.send(embed=embed)
        # Create and send a success message embed
        success_embed = discord.Embed(title="✉️ Direct Message Sent ✉️", description=f"Message sent to {user.mention}.", color=discord.Color.green())
        await ctx.send(embed=success_embed)
    except:
        # Handle the error
        error_embed = discord.Embed(title="❌ Error ❌", description="Cannot send a direct message to the user.", color=discord.Color.red())
        await ctx.send(embed=error_embed)


bot.run('MTI0MjQyMjUzOTA4NzY0MjY5Ng.GC9dVc.mY-WCfnjg6WQD5L9iH22ZaD4gp6Owzmbv0b8w8')