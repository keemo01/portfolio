import hmac
import time
import hashlib
import logging
import requests
from urllib.parse import urlencode
from datetime import timedelta
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from tracker.models import PortfolioHolding, APIKey, PortfolioHistory
from .binance_utils import get_binance_price  # Ensure proper error handling in this utility

logger = logging.getLogger(__name__)

def get_bybit_price(coin):
    """
    Fetch the current price for a coin from Bybit's V5 API.
    USDT is always $1.0.
    """
    if coin.upper() == 'USDT':
        return 1.0

    url = "https://api.bybit.com/v5/market/tickers"
    params = {"category": "spot", "symbol": f"{coin}USDT"}
    try:
        logger.info("Fetching Bybit price for %s with params: %s", coin, params)
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("retCode") == 0 and data.get("result", {}).get("list"):
                price = float(data["result"]["list"][0]["lastPrice"])
                logger.info("Found price for %s: $%s", coin, price)
                return price
        logger.warning("No price data found for %s.", coin)
        return None
    except Exception as e:
        logger.error("Error fetching Bybit price for %s: %s", coin, e)
        return None

def get_bybit_holdings(api_key, secret_key):
    """
    Fetch holdings from Bybit for both Unified and Spot accounts.
    Processes coins in batches (10 coins per batch).
    """
    all_balances = []
    accounts = [
        {"type": "UNIFIED", "endpoint": "/v5/asset/transfer/query-account-coins-balance"},
        {"type": "SPOT", "endpoint": "/v5/asset/transfer/query-account-coins-balance"}
    ]
    all_coins = [  # List of coins to check
        "USDT", "BTC", "ETH", "SOL", "XRP", "MATIC", "DOGE", "ADA", "DOT", "AVAX",
        "LINK", "UNI", "SHIB", "LTC", "ATOM", "BCH", "NEAR", "APE", "FTM", "HBAR",
        "TRX", "OP", "ARB", "FLOW", "SAND", "MANA", "GALA", "IMX", "LDO", "RNDR",
        "SEI", "STX", "TIA", "AAVE", "ALGO", "AXS", "BABYDOGE", "BAND", "BAT", "BIT",
        "BTT", "CELR", "CHZ", "COMP", "CRO", "CRV", "DASH", "DYDX", "EGLD", "ENJ",
        "FIL", "FLOW", "GRT", "ICP", "ICX", "JASMY", "KAVA", "KLAY", "KSM", "LRC",
        "MINA", "MKR", "NANO", "OMG", "ONT", "OCEAN", "QTUM", "RAY", "REEF", "ROSE",
        "SNX", "STORJ", "SRM", "TFUEL", "THETA", "TON", "TWT", "VET", "XLM", "XEM",
        "XEC", "ZEC", "ZIL", "BLUR", "PEPE", "ORDI", "WLD", "SUI", "INJ", "CYBER",
        "BONK", "PYTH", "CFX", "AGIX", "JUP", "GMX", "1INCH", "CAKE", "DENT", "ENS"
    ]
    
    for account in accounts:
        url = f"https://api.bybit.com{account['endpoint']}"
        timestamp = str(int(time.time() * 1000))
        recv_window = "5000"
        for i in range(0, len(all_coins), 10):
            coin_batch = all_coins[i:i + 10]
            params = {"accountType": account["type"], "coin": ",".join(coin_batch)}
            param_str = timestamp + api_key + recv_window + urlencode(sorted(params.items()))
            signature = hmac.new(secret_key.encode('utf-8'), param_str.encode('utf-8'), hashlib.sha256).hexdigest()
            headers = {
                'X-BAPI-API-KEY': api_key,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recv_window
            }
            try:
                response = requests.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('retCode') == 0:
                        for coin_data in data.get('result', {}).get('balance', []):
                            wallet_balance = float(coin_data.get('walletBalance', '0'))
                            if wallet_balance > 0:
                                # Get the cost basis for this coin
                                cost_endpoint = "/v5/position/info"
                                cost_params = {
                                    "category": "spot",
                                    "symbol": f"{coin_data['coin']}USDT"
                                }
                                try:
                                    cost_timestamp = str(int(time.time() * 1000))
                                    cost_param_str = cost_timestamp + api_key + recv_window + urlencode(sorted(cost_params.items()))
                                    cost_signature = hmac.new(secret_key.encode('utf-8'), cost_param_str.encode('utf-8'), hashlib.sha256).hexdigest()
                                    cost_headers = {
                                        'X-BAPI-API-KEY': api_key,
                                        'X-BAPI-SIGN': cost_signature,
                                        'X-BAPI-TIMESTAMP': cost_timestamp,
                                        'X-BAPI-RECV-WINDOW': recv_window
                                    }
                                    cost_response = requests.get(f"https://api.bybit.com{cost_endpoint}", 
                                                                headers=cost_headers, 
                                                                params=cost_params)
                                    cost_data = cost_response.json()
                                    if cost_data.get('retCode') == 0 and cost_data.get('result', {}).get('list'):
                                        position = cost_data['result']['list'][0]
                                        avg_price = float(position.get('avgPrice', '0'))
                                        original_value = wallet_balance * avg_price
                                    else:
                                        original_value = None
                                except Exception:
                                    original_value = None
                                
                                all_balances.append({
                                    'coin': coin_data['coin'],
                                    'amount': wallet_balance,
                                    'transferable': float(coin_data.get('transferBalance', '0')),
                                    'account_type': account["type"],
                                    'original_value': original_value
                                })
            except Exception as e:
                logger.error("Error fetching batch %s: %s", i // 10 + 1, e)
                continue
    return all_balances

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def add_holding(request):
    """
    POST /portfolio/add/
    Expected data: { "coin": "BTC", "amount": "0.5", "purchase_price": "40000" }
    """
    user = request.user
    coin = request.data.get('coin')
    amount = request.data.get('amount')
    purchase_price = request.data.get('purchase_price')
    
    if not coin or not amount or not purchase_price:
        return Response({'detail': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
    
    PortfolioHolding.objects.create(
        user=user,
        coin=coin.upper(),
        amount=amount,
        purchase_price=purchase_price
    )
    return Response({'detail': 'Holding added'}, status=status.HTTP_201_CREATED)

@api_view(['POST', 'GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def portfolio(request):
    user = request.user
    try:
        api_keys = APIKey.objects.get(user=user)
        logger.info("Found API keys for %s", user.username)
    except APIKey.DoesNotExist:
        return Response({
            'detail': 'Need to add API keys in portfolio settings',
            'has_api_keys': False
        }, status=status.HTTP_400_BAD_REQUEST)

    portfolio_data = []
    errors = []

    # Fetch Exchange Holdings from Bybit
    if api_keys.bybit_api_key and api_keys.bybit_secret_key:
        try:
            holdings = get_bybit_holdings(api_keys.bybit_api_key, api_keys.bybit_secret_key)
            if holdings:
                for holding in holdings:
                    coin = holding['coin']
                    amount = float(holding['amount'])
                    current_price = get_bybit_price(coin)
                    if current_price is not None:
                        value = amount * current_price
                        # Calculate original_value from API response or fall back to current value
                        original_value = holding['original_value'] if holding['original_value'] is not None else value
                        
                        portfolio_data.append({
                            'exchange': 'Bybit',
                            'account_type': holding['account_type'],
                            'coin': coin,
                            'amount': str(amount),
                            'current_price': current_price,
                            'current_value': value,
                            'transferable': str(holding['transferable']),
                            'original_value': original_value  # Always include original_value
                        })
                        logger.info("Added %s from Bybit: %s @ $%s = $%s (original: $%s)", 
                                  coin, amount, current_price, value, original_value)
        except Exception as e:
            error_msg = f"Error fetching Bybit holdings: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)

    # Fetch Exchange Holdings from Binance
    if api_keys.binance_api_key and api_keys.binance_secret_key:
        try:
            timestamp = str(int(time.time() * 1000))
            binance_params = { 'timestamp': timestamp, 'recvWindow': '5000' }
            query_string = urlencode(binance_params, safe='*')
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
            logger.info("Sending request to Binance: %s", full_url)
            response = requests.get(full_url, headers=headers)
            response.raise_for_status()
            if response.status_code == 200:
                data = response.json()
                for balance in data.get('balances', []):
                    amount = float(balance['free']) + float(balance['locked'])
                    if amount > 0:
                        current_price = get_binance_price(balance['asset'])
                        if current_price:
                            portfolio_data.append({
                                'exchange': 'Binance',
                                'coin': balance['asset'],
                                'amount': str(amount),
                                'current_price': current_price,
                                'current_value': amount * current_price
                            })
        except Exception as e:
            logger.error("Error fetching Binance holdings: %s", str(e))
            errors.append(f"Binance error: {str(e)}")

    # Fetch Manual Holdings from PortfolioHolding
    manual_holdings = PortfolioHolding.objects.filter(user=user)
    manual_data = {}
    
    # First pass: Aggregate amounts and costs by coin
    for holding in manual_holdings:
        coin = holding.coin.upper()
        amount = float(holding.amount)
        purchase_price = float(holding.purchase_price)
        total_cost = amount * purchase_price
        
        if coin in manual_data:
            manual_data[coin]['amount'] += amount
            manual_data[coin]['total_cost'] += total_cost
        else:
            manual_data[coin] = {
                'amount': amount,
                'total_cost': total_cost
            }

    # Second pass: Calculate values and add to portfolio data
    for coin, data in manual_data.items():
        total_amount = data['amount']
        total_cost = data['total_cost']
        current_price = get_bybit_price(coin)
        
        if current_price is not None:
            current_value = total_amount * current_price
        else:
            current_value = 0
            
        portfolio_data.append({
            'exchange': 'Manual',
            'coin': coin,
            'amount': str(total_amount),
            'current_price': current_price,
            'current_value': current_value,
        })

    if not portfolio_data and errors:
        return Response({
            'detail': 'Error fetching holdings',
            'errors': errors,
            'portfolio': []
        }, status=status.HTTP_200_OK)

    total_value = sum(item['current_value'] for item in portfolio_data)
    if portfolio_data:
        PortfolioHistory.objects.create(
            user=user,
            total_value=total_value,
            timestamp=timezone.now()
        )
    return Response({
        'portfolio': portfolio_data,
        'total_value': total_value,
        'errors': errors if errors else None
    }, status=status.HTTP_200_OK)

@api_view(['POST', 'GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def manage_api_keys(request):
    """
    Manage the user's API keys.
    - POST: Save/update API keys for Binance and Bybit.
    - GET: Retrieve masked API keys.
    """
    if request.method == 'POST':
        try:
            api_keys, created = APIKey.objects.get_or_create(user=request.user)
            if 'binance_api_key' in request.data:
                api_keys.binance_api_key = request.data['binance_api_key']
            if 'binance_secret_key' in request.data:
                api_keys.binance_secret_key = request.data['binance_secret_key']
            if 'bybit_api_key' in request.data:
                api_keys.bybit_api_key = request.data['bybit_api_key']
            if 'bybit_secret_key' in request.data:
                api_keys.bybit_secret_key = request.data['bybit_secret_key']
            api_keys.save()

            # Optionally, test the Binance API key if available
            if 'test' not in request.META.get('SERVER_NAME', '').lower():
                try:
                    if api_keys.binance_api_key and api_keys.binance_secret_key:
                        timestamp = str(int(time.time() * 1000))
                        params = { 'timestamp': timestamp, 'recvWindow': '5000' }
                        query_string = urlencode(params)
                        signature = hmac.new(
                            api_keys.binance_secret_key.encode('utf-8'),
                            query_string.encode('utf-8'),
                            hashlib.sha256
                        ).hexdigest()
                        params['signature'] = signature
                        response = requests.get(
                            'https://api.binance.com/api/v3/account',
                            params=params,
                            headers={'X-MBX-APIKEY': api_keys.binance_api_key}
                        )
                        if response.status_code != 200:
                            logger.warning("Binance API test response: %s - %s", response.status_code, response.text)
                except Exception as e:
                    logger.error("Error testing API keys: %s", e)
            
            return Response({
                'binance_api_key': '*' * 8 + api_keys.binance_api_key[-4:] if api_keys.binance_api_key else None,
                'bybit_api_key': '*' * 8 + api_keys.bybit_api_key[-4:] if api_keys.bybit_api_key else None,
                'has_api_keys': bool(api_keys.binance_api_key or api_keys.bybit_api_key)
            })
        except Exception as e:
            logger.error("Error managing API keys: %s", e)
            return Response({'has_api_keys': False})
    else:
        try:
            api_keys = APIKey.objects.get(user=request.user)
            return Response({
                'binance_api_key': '*' * 8 + api_keys.binance_api_key[-4:] if api_keys.binance_api_key else None,
                'bybit_api_key': '*' * 8 + api_keys.bybit_api_key[-4:] if api_keys.bybit_api_key else None,
                'has_api_keys': bool(api_keys.binance_api_key or api_keys.bybit_api_key)
            })
        except APIKey.DoesNotExist:
            return Response({'has_api_keys': False})

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def portfolio_history(request):
    days = int(request.GET.get('days', 30))
    history = PortfolioHistory.objects.filter(
        user=request.user,
        timestamp__gte=timezone.now() - timedelta(days=days)
    ).order_by('timestamp').values('timestamp', 'total_value')
    
    data = [{
        'timestamp': timezone.localtime(entry['timestamp']).isoformat(),
        'value': float(entry['total_value'])
    } for entry in history]
    
    return Response({'history': data})
