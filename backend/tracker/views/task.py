# tasks.py
import hmac
import time
import hashlib
import logging
import requests
from urllib.parse import urlencode
from datetime import timedelta
from django.utils import timezone
from celery import shared_task
from django.contrib.auth.models import User
from tracker.models import PortfolioHistory, APIKey, PortfolioHolding
from .binance_utils import get_binance_price  
from .portfolio_utils import aggregate_portfolio_holdings, calculate_portfolio_metrics
from tracker.views import get_bybit_price, get_bybit_holdings, get_bybit_cost_basis

logger = logging.getLogger(__name__)

def get_holdings_for_user(user):
    """
    Gather holdings from Bybit, Binance, and manual entries using your provided code.
    Returns a list of dictionaries with keys:
    'exchange', 'account_type', 'coin', 'amount', 'current_price', 
    'current_value', 'transferable', and 'original_value'.
    """
    holdings_list = []
    try:
        api_keys = APIKey.objects.get(user=user)
    except APIKey.DoesNotExist:
        api_keys = None

    # Fetch holdings from Bybit if API keys are present.
    if api_keys and api_keys.bybit_api_key and api_keys.bybit_secret_key:
        try:
            bybit_holdings = get_bybit_holdings(api_keys.bybit_api_key, api_keys.bybit_secret_key)
            for holding in bybit_holdings:
                coin = holding['coin']
                amount = float(holding['amount'])
                current_price = get_bybit_price(coin)
                if current_price is not None:
                    value = amount * current_price
                    original_value = holding['original_value'] if holding['original_value'] is not None else value
                    holdings_list.append({
                        'exchange': 'Bybit',
                        'account_type': holding['account_type'],
                        'coin': coin,
                        'amount': amount,
                        'current_price': current_price,
                        'current_value': value,
                        'transferable': float(holding['transferable']),
                        'original_value': original_value
                    })
        except Exception as e:
            logger.error("Error fetching Bybit holdings for %s: %s", user.username, e)

    # Fetch holdings from Binance if API keys are present.
    if api_keys and api_keys.binance_api_key and api_keys.binance_secret_key:
        try:
            timestamp = str(int(time.time() * 1000))
            binance_params = {'timestamp': timestamp, 'recvWindow': '5000'}
            query_string = urlencode(binance_params)
            signature = hmac.new(
                api_keys.binance_secret_key.encode('utf-8'),
                query_string.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            binance_url = 'https://api.binance.com/api/v3/account'
            headers = {
                'X-MBX-APIKEY': api_keys.binance_api_key,
                'Content-Type': 'application/json'
            }
            full_url = f"{binance_url}?{query_string}&signature={signature}"
            response = requests.get(full_url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            for balance in data.get('balances', []):
                amount = float(balance['free']) + float(balance['locked'])
                if amount > 0:
                    current_price = get_binance_price(balance['asset'])
                    if current_price:
                        holdings_list.append({
                            'exchange': 'Binance',
                            'account_type': 'Spot',
                            'coin': balance['asset'],
                            'amount': amount,
                            'current_price': current_price,
                            'current_value': amount * current_price,
                            'transferable': float(balance['free']),
                            'original_value': None  # Binance does not provide cost basis
                        })
        except Exception as e:
            logger.error("Error fetching Binance holdings for %s: %s", user.username, e)

    # Fetch manual holdings from PortfolioHolding
    manual_holdings = PortfolioHolding.objects.filter(user=user)
    manual_dict = {}
    for holding in manual_holdings:
        coin = holding.coin.upper()
        amount = float(holding.amount)
        purchase_price = float(holding.purchase_price)
        total_cost = amount * purchase_price
        if coin in manual_dict:
            manual_dict[coin]['amount'] += amount
            manual_dict[coin]['total_cost'] += total_cost
        else:
            manual_dict[coin] = {'amount': amount, 'total_cost': total_cost}

    for coin, data in manual_dict.items():
        current_price = get_bybit_price(coin)
        if current_price is None:
            current_price = get_binance_price(coin)
        if current_price is not None:
            holdings_list.append({
                'exchange': 'Manual',
                'account_type': 'Manual',
                'coin': coin,
                'amount': data['amount'],
                'current_price': current_price,
                'current_value': data['amount'] * current_price,
                'transferable': data['amount'],
                'original_value': data['total_cost']
            })
        else:
            logger.warning("Could not fetch price for manual holding: %s", coin)

    return holdings_list

def get_portfolio_metrics_for_user(user):
    """
    Gathers all holdings for a user, combine them, and calculates portfolio metrics.
    """
    holdings = get_holdings_for_user(user)
    consolidated = aggregate_portfolio_holdings(holdings)
    metrics = calculate_portfolio_metrics(consolidated)
    return consolidated, metrics

@shared_task
def update_portfolio_snapshot_30min():
    """
    Task to create a 30min snapshot for every user.
    This task should be scheduled to run at the top and half of every hour
    (e.g. 1:00, 1:30, 2:00, 2:30, etc.).
    """
    for user in User.objects.all():
        consolidated, metrics = get_portfolio_metrics_for_user(user)
        try:
            PortfolioHistory.objects.create(
                user=user,
                total_value=metrics.get('total_value', 0),
                coin_values=({k: float(v['total_value']) for k, v in consolidated.items()}
                             if consolidated else {}),
                active_exchanges=[ex.lower() for ex in metrics.get('exchange_distribution', {}).keys()],
                snapshot_type="30min"
            )
            logger.info("Created 30min snapshot for %s", user.username)
        except Exception as e:
            logger.error("Error creating 30min snapshot for %s: %s", user.username, e)

@shared_task
def update_portfolio_snapshot_daily():
    """
    Task to create a daily snapshot for every user.
    This task should be scheduled to run at 12:00 AM each day.
    """
    for user in User.objects.all():
        consolidated, metrics = get_portfolio_metrics_for_user(user)
        try:
            PortfolioHistory.objects.create(
                user=user,
                total_value=metrics.get('total_value', 0),
                coin_values=({k: float(v['total_value']) for k, v in consolidated.items()}
                             if consolidated else {}),
                active_exchanges=[ex.lower() for ex in metrics.get('exchange_distribution', {}).keys()],
                snapshot_type="daily"
            )
            logger.info("Created daily snapshot for %s", user.username)
        except Exception as e:
            logger.error("Error creating daily snapshot for %s: %s", user.username, e)
