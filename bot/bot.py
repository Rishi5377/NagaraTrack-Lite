import os
import logging
import asyncio
import httpx
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

# Validate bot token
if not BOT_TOKEN or BOT_TOKEN == 'your-bot-token-here':
    logger.warning("TELEGRAM_BOT_TOKEN not set or using placeholder. Bot will not function.")
    BOT_TOKEN = None

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /start is issued."""
    await update.message.reply_text(
        'Welcome to NagaraTrack Lite Bot! 🚌\n\n'
        'I can help you track buses in real-time.\n\n'
        'Available commands:\n'
        '/routes - Get available bus routes\n'
        '/track <route_id> - Track a specific route\n'
        '/help - Show this help message'
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /help is issued."""
    await update.message.reply_text(
        'NagaraTrack Lite Bot Commands:\n\n'
        '/start - Welcome message\n'
        '/routes - Get list of available bus routes\n'
        '/track <route_id> - Get real-time info for a route\n'
        '/help - Show this help message\n\n'
        'Example: /track ROUTE_42'
    )

async def routes_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Get available routes from backend."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_URL}/api/routes")
            data = response.json()
            
            if 'routes' in data and isinstance(data['routes'], list):
                routes_text = "Available Bus Routes:\n\n"
                for route in data['routes']:
                    short = route.get('route_short_name') or route.get('route_id')
                    long = route.get('route_long_name') or route.get('route_name') or short
                    routes_text += f"🚌 {short}: {long}\n"
                    routes_text += f"   ID: {route.get('route_id')}\n\n"
                
                await update.message.reply_text(routes_text)
            else:
                await update.message.reply_text("No routes available at the moment.")
                
    except Exception as e:
        logger.error(f"Error fetching routes: {e}")
        await update.message.reply_text("Sorry, I couldn't fetch the routes right now. Please try again later.")

async def track_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Track a specific route."""
    if not context.args:
        await update.message.reply_text("Please provide a route ID. Example: /track ROUTE_42")
        return
    
    route_id = context.args[0]
    
    try:
        async with httpx.AsyncClient() as client:
            # Use CSV-backed vehicles endpoint and filter by route_id
            response = await client.get(f"{BACKEND_URL}/api/vehicles")
            vehicles = response.json()

            filtered = [v for v in vehicles if str(v.get('route_id')) == route_id]
            if filtered:
                track_text = f"🚌 Vehicle positions for Route {route_id}:\n\n"
                for v in filtered[:5]:
                    lat = v.get('lat') or v.get('latitude')
                    lon = v.get('lon') or v.get('longitude')
                    speed = v.get('last_speed') or v.get('speed')
                    bearing = v.get('last_heading') or v.get('bearing')
                    track_text += (
                        f"Vehicle: {v.get('device_id') or v.get('id')}\n"
                        f"📍 Location: {float(lat):.4f}, {float(lon):.4f}\n"
                        f"⚡ Speed: {float(speed):.1f} km/h\n" if speed is not None else ""
                    )
                    if bearing is not None:
                        track_text += f"🧭 Bearing: {float(bearing):.0f}°\n"
                    if v.get('updated_at'):
                        track_text += f"⏱ Updated: {v['updated_at']}\n"
                    track_text += "\n"
                await update.message.reply_text(track_text)
            else:
                await update.message.reply_text(f"No vehicles found for route {route_id}")
                
    except Exception as e:
        logger.error(f"Error tracking route {route_id}: {e}")
        await update.message.reply_text("Sorry, I couldn't track that route right now. Please try again later.")

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Echo the user message."""
    await update.message.reply_text(
        f"I received: {update.message.text}\n\n"
        "Use /help to see available commands."
    )

def main() -> None:
    """Start the bot."""
    if not BOT_TOKEN:
        logger.warning("Bot token not configured. Set TELEGRAM_BOT_TOKEN environment variable.")
        return
    
    # Create the Application
    application = Application.builder().token(BOT_TOKEN).build()

    # Register handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("routes", routes_command))
    application.add_handler(CommandHandler("track", track_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    # Run the bot
    logger.info("Starting NagaraTrack Bot (CSV mode)...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()