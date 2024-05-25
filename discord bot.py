import math
import discord
from discord.ext import commands
import asyncio
from discord.ext.commands import check, CheckFailure, MissingPermissions
import datetime


description = '''Sol's Macro Bot'''

intents = discord.Intents.default()
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix='?', description=description, intents=intents)

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


@bot.command(name='show-profile', help='show the profile of the specified user')
async def show_profile(ctx, user:discord.Member = None):
    try:
        if user is None:
            user = ctx.author

        # Create an embed with the user's profile
        embed = discord.Embed(title=f"{user.name}'s Profile", color=discord.Color.blue())
        embed.set_author(name=user.name, icon_url=user.avatar.url)
        embed.set_thumbnail(url=user.avatar.url)  # Set the user's avatar as the thumbnail
        embed.add_field(name="ID", value=user.id, inline=False)
        embed.add_field(name="Status", value=user.status, inline=False)
        embed.add_field(name="Top Role", value=user.top_role, inline=False)
        embed.add_field(name="Joined At", value=user.joined_at, inline=False)
        user = await bot.fetch_user(882920589269020672)
        embed.set_footer(text=f"Created by Edzar#edzar1070", icon_url=user.avatar.url)
        embed.timestamp = datetime.datetime.now()  # Set the current date and time as the timestamp

        await ctx.send(embed=embed)
    except:
        # Handle the error
        embed = discord.Embed(title="❌ Error ❌", description="Cannot show the profile of the user.", color=discord.Color.red())
        await ctx.send(embed=embed)

@bot.command()
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
    # check if the channel exists
    existing_channel = discord.utils.get(ctx.guild.channels, name=channel_name)

    # if the channel exists
    if existing_channel is not None:
        # Create a confirmation message embed
        confirmation_embed = discord.Embed(title="⚠️ Confirmation ⚠️", description=f"Are you sure you want to delete channel #{channel_name}?", color=discord.Color.orange())
        confirmation_message = await ctx.send(embed=confirmation_embed)

        # Add reactions to the confirmation message
        await confirmation_message.add_reaction('✅')  # Yes reaction
        await confirmation_message.add_reaction('❌')  # No reaction

        # Function to handle the reaction
        def check(reaction, user):
            return user == ctx.author and str(reaction.emoji) in ['✅', '❌'] and reaction.message.id == confirmation_message.id

        # Wait for the user's reaction
        try:
            reaction, _ = await bot.wait_for('reaction_add', timeout=60.0, check=check)
        except asyncio.TimeoutError:
            # If the user doesn't react within 60 seconds, send a timeout message
            timeout_embed = discord.Embed(title="❌ Timeout ❌", description="You did not confirm the deletion within 60 seconds.", color=discord.Color.red())
            await confirmation_message.edit(embed=timeout_embed)
            return

        # If the user confirms the deletion
        if str(reaction.emoji) == '✅':
            await existing_channel.delete()
            # Create and send a success message embed
            success_embed = discord.Embed(title="✅ Channel Deleted ✅", description=f"Channel #{channel_name} has been deleted.", color=discord.Color.green())
            await confirmation_message.edit(embed=success_embed)
        else:
            # If the user cancels the deletion
            cancel_embed = discord.Embed(title="❌ Deletion Cancelled ❌", description=f"Deletion of channel #{channel_name} has been cancelled.", color=discord.Color.red())
            await confirmation_message.edit(embed=cancel_embed)
        
        # Delete the reactions from the confirmation message
        await confirmation_message.clear_reactions()
    
@bot.command(name='delete-category', help='delete a category with the specified name')
@owner_admin()
async def delete_category(ctx, category_name):
    # check if the category exists
    existing_category = discord.utils.get(ctx.guild.categories, name=category_name)
    
    # if the category exists
    if existing_category is not None:
        # Ask for confirmation
        confirmation_embed = discord.Embed(title="⚠️ Confirmation ⚠️", description=f"Are you sure you want to delete the category '{category_name}'? This action will delete all channels within the category. Please confirm by reacting with ✅ or ❌.", color=discord.Color.orange())
        confirmation_message = await ctx.send(embed=confirmation_embed)
        await confirmation_message.add_reaction('✅')
        await confirmation_message.add_reaction('❌')

        def check(reaction, user):
            return user == ctx.author and str(reaction.emoji) in ['✅', '❌']

        try:
            reaction, user = await bot.wait_for('reaction_add', timeout=60.0, check=check)
        except asyncio.TimeoutError:
            # Handle timeout error
            timeout_embed = discord.Embed(title="❌ Timeout ❌", description="Confirmation timed out. Category deletion canceled.", color=discord.Color.red())
            await confirmation_message.edit(embed=timeout_embed)
            await confirmation_message.clear_reactions()
            return

        if str(reaction.emoji) == '✅':
            # Delete all channels within the category
            for channel in existing_category.channels:
                await channel.delete()

            # Delete the category
            await existing_category.delete()

            # Create and send a success message embed
            success_embed = discord.Embed(title="✅ Category Deleted ✅", description=f"Category '{category_name}' and all its channels have been deleted.", color=discord.Color.green())
            await confirmation_message.edit(embed=success_embed)
            await confirmation_message.clear_reactions()
        else:
            # Create and send a cancellation message embed
            cancel_embed = discord.Embed(title="❌ Category Deletion Canceled ❌", description=f"Category '{category_name}' deletion has been canceled.", color=discord.Color.red())
            await confirmation_message.edit(embed=cancel_embed)
            await confirmation_message.clear_reactions()
    else:
        # Create and send an error message embed
        error_embed = discord.Embed(title="❌ Error ❌", description=f"Category '{category_name}' does not exist.", color=discord.Color.red())
        await ctx.send(embed=error_embed)

@bot.command(name='kick', help='kick the specified user')
@owner_admin()
async def kick(ctx, user:discord.Member, *, reason=None):
    try:
        # Send a DM to the kicked user
        dm_embed = discord.Embed(title="❗ You have been kicked ❗", description=f"You have been kicked from {ctx.guild.name} for the following reason: {reason}", color=discord.Color.red())
        await user.send(embed=dm_embed)

        # Kick the user
        await user.kick(reason=reason)
        # Create and send a success message embed
        embed = discord.Embed(title="✅ User Kicked ✅", description=f"{user.mention} has been kicked.", color=discord.Color.green())
        await ctx.send(embed=embed)
    except discord.errors.Forbidden:
        # Handle the forbidden error
        embed = discord.Embed(title="❌ Error ❌", description="Cannot send messages to this user.", color=discord.Color.red())
        await ctx.send(embed=embed)

@bot.command(name='ban', help='ban the specified user')
@owner_admin()
async def ban(ctx, user:discord.Member, duration:int, *, reason=None):    
    try:
        # Convert the duration to an integer
        duration = int(duration)    
        # Send a DM to the banned user
        dm_embed = discord.Embed(title="❗ You have been banned ❗", description=f"You have been banned for {duration} days from {ctx.guild.name} for the following reason: {reason}", color=discord.Color.red())
        await user.send(embed=dm_embed)
        # Ban the user
        await user.ban(reason=reason, delete_message_days=duration)
        # Create and send a success message embed
        embed = discord.Embed(title="✅ User Banned ✅", description=f"{user.mention} has been banned for {duration} days", color=discord.Color.green())
        await ctx.send(embed=embed) 
        
        # Schedule the unban after the specified duration
        await asyncio.sleep(duration * 86400)  # Convert days to seconds
        await ctx.guild.unban(user, reason="Ban duration expired")
        # Create and send an unban message embed
        unban_embed = discord.Embed(title="✅ User Unbanned ✅", description=f"{user.mention} has been unbanned after {duration} days", color=discord.Color.green())
        await ctx.send(embed=unban_embed)
    except:
        # Handle the error
        embed = discord.Embed(title="❌ Error ❌", description="Invalid duration. Please enter a valid number.", color=discord.Color.red())
        await ctx.send(embed=embed)

@bot.command(name='unban', help='unban the specified user')
@owner_admin()
async def unban(ctx, user_id:int, *, reason=None):
    try:
        # Get the user object from the user ID
        user = await bot.fetch_user(user_id)
        # Unban the user
        await ctx.guild.unban(user, reason=reason)
        # Create and send a success message embed
        embed = discord.Embed(title="✅ User Unbanned ✅", description=f"{user.mention} has been unbanned.", color=discord.Color.green())
        await ctx.send(embed=embed)

        # Send a DM to the unbanned user
        dm_embed = discord.Embed(title="❗ You have been unbanned ❗", description=f"You have been unbanned from the server for the following reason: {reason}", color=discord.Color.red())
        await user.send(embed=dm_embed)
    except:
        # Handle the error
        embed = discord.Embed(title="❌ Error ❌", description="Cannot unban the user.", color=discord.Color.red())
        await ctx.send(embed=embed)

@bot.command(name='banned-users', help='show the list of banned users')
@owner_admin()
async def banned_users(ctx):
    # Get the list of banned users
    banned_users = await ctx.guild.bans()
    page=1
    
    # Calculate the start and end index for the current page
    items_per_page = 10
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page
    
    # Slice the banned users list based on the current page
    banned_users_page = banned_users[start_index:end_index]
    
    # Create an embed with the list of banned users
    embed = discord.Embed(title="Banned Users", color=discord.Color.red())
    for entry in banned_users_page:
        user = entry.user
        embed.add_field(name=user.name, value=user.id, inline=False)
    
    # Add pagination information to the embed
    total_pages = math.ceil(len(banned_users) / items_per_page)
    embed.set_footer(text=f"Page {page}/{total_pages}")
    
    # Send the initial embed with buttons
    message = await ctx.send(embed=embed)
    
    # Add buttons for pagination
    if total_pages > 1:
        await message.add_reaction("⬅️")
        await message.add_reaction("➡️")
    
    # Define a check function for the reaction event
    def check(reaction, user):
        return user == ctx.author and str(reaction.emoji) in ["⬅️", "➡️"]
    
    # Wait for a reaction from the author
    while True:
        try:
            reaction, user = await bot.wait_for("reaction_add", timeout=60, check=check)
            
            # Handle the reaction
            if str(reaction.emoji) == "⬅️" and page > 1:
                page -= 1
            elif str(reaction.emoji) == "➡️" and page < total_pages:
                page += 1
            
            # Update the embed with the new page
            start_index = (page - 1) * items_per_page
            end_index = start_index + items_per_page
            banned_users_page = banned_users[start_index:end_index]
            embed.clear_fields()
            for entry in banned_users_page:
                user = entry.user
                embed.add_field(name=user.name, value=user.id, inline=False)
            embed.set_footer(text=f"Page {page}/{total_pages}")
            
            # Edit the message with the updated embed
            await message.edit(embed=embed)
            
            # Remove the user's reaction
            await message.remove_reaction(reaction, user)
        
        except asyncio.TimeoutError:
            # Stop waiting for reactions after 60 seconds
            break

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