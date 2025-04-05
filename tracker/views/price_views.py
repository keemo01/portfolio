import logging
from datetime import timedelta
import time
from django.utils import timezone
import requests
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from tracker.models import PortfolioHistory
from .portfolio_views import get_bybit_price

logger = logging.getLogger(__name__)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def coin_price_history(request, coin):
    """
    Get historical price data for a specific coin.
    If purchase_price and purchase_date (in milliseconds) are provided,
    an initial data point is added so the graph starts at the price when the coin was bought.
    Otherwise, historical data is fetched from a default past period.
    """
    try:
        amount = float(request.GET.get('amount', 1))
        days = int(request.GET.get('days', 30))
        
        # Optional purchase details (for manual holdings)
        purchase_price = request.GET.get('purchase_price')  # e.g. "40000"
        purchase_date = request.GET.get('purchase_date')    # expected as timestamp in ms
        
        history = []
        # Special handling for USDT (which is always $1)
        if coin.upper() == 'USDT':
            current_time = int(time.time() * 1000)
            for day in range(days):
                ts = current_time - (day * 24 * 60 * 60 * 1000)
                history.append({
                    "timestamp": ts,
                    "value": amount
                })
            history = sorted(history, key=lambda x: x["timestamp"])
            return Response({"history": history})
        
        # Determine the start time (in seconds) for fetching historical data.
        # If purchase_date is provided, use that as the starting point.
        if purchase_price and purchase_date:
            try:
                p_price = float(purchase_price)
                p_date = int(purchase_date)  # already in ms
            except ValueError:
                p_price = None
                p_date = None
            if p_price is not None and p_date is not None:
                # Add the initial data point corresponding to the purchase details.
                history.append({
                    "timestamp": p_date,
                    "value": round(p_price * amount, 2),
                    "price": round(p_price, 2)
                })
                # Use the purchase date (converted to seconds) as the start time for fetching history.
                start_time_sec = p_date // 1000
            else:
                start_time_sec = int(time.time()) - (days * 24 * 60 * 60)
        else:
            start_time_sec = int(time.time()) - (days * 24 * 60 * 60)
        
        # Bybit V5 API expects the "from" parameter (in seconds) and a limit.
        url = "https://api.bybit.com/v5/market/kline"
        params = {
            "category": "spot",
            "symbol": f"{coin.upper()}USDT",
            "interval": "D",  # daily intervals
            "from": start_time_sec,
            "limit": days
        }
        
        logger.info(f"Fetching price history for {coin} with params: {params}")
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            if data.get("retCode") == 0 and data.get("result", {}).get("list"):
                for item in data["result"]["list"]:
                    # Expected item format: [timestamp (sec), open, high, low, close, volume, ...]
                    try:
                        close_price = float(item[4])
                        ts = int(item[0]) * 1000  # convert seconds to ms
                        history.append({
                            "timestamp": ts,
                            "value": round(close_price * amount, 2),
                            "price": round(close_price, 2)
                        })
                    except (ValueError, IndexError) as e:
                        logger.error(f"Error processing price data: {e}")
                        continue
                history = sorted(history, key=lambda x: x["timestamp"])
                return Response({"history": history})
        
        logger.error(f"Failed to fetch price history for {coin}: {response.text if response else 'No response'}")
        return Response({"error": f"No price history available for {coin}"}, status=404)
    except Exception as e:
        logger.error(f"Error in coin_price_history for {coin}: {str(e)}")
        return Response({"error": "Failed to fetch price history"}, status=400)
