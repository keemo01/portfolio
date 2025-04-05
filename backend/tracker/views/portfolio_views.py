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
        
        for i in range(0, len(all_coins), 10):
            coin_batch = all_coins[i:i + 10]
            params = {"accountType": account["type"], "coin": ",".join(coin_batch)}
            
            timestamp = str(int(time.time() * 1000))
            recv_window = "5000"
            # Fix: Include parameters properly in signature
            param_str = urlencode(sorted(params.items()))
            signature_str = timestamp + api_key + recv_window + param_str
            signature = hmac.new(secret_key.encode('utf-8'), signature_str.encode('utf-8'), hashlib.sha256).hexdigest()
            
            headers = {
                'X-BAPI-API-KEY': api_key,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recv_window
            }
            
            try:
                response = requests.get(url, headers=headers, params=params, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('retCode') == 0:
                        for coin_data in data.get('result', {}).get('balance', []):
                            wallet_balance = float(coin_data.get('walletBalance', '0'))
                            if wallet_balance > 0:
                                # Get the cost basis for this coin
                                # Fix: We should use a dedicated function for cost basis to reduce nested complexity
                                original_value = get_bybit_cost_basis(
                                    api_key, 
                                    secret_key, 
                                    coin_data['coin'], 
                                    wallet_balance
                                )
                                
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

def get_bybit_cost_basis(api_key, secret_key, coin, amount):
    """
    Get cost basis for a specific coin from Bybit
    Returns the original value or None if not available
    """
    try:
        cost_endpoint = "/v5/position/info"
        cost_params = {
            "category": "spot",
            "symbol": f"{coin}USDT"
        }
        
        timestamp = str(int(time.time() * 1000))
        recv_window = "5000"
        cost_param_str = urlencode(sorted(cost_params.items()))
        signature_str = timestamp + api_key + recv_window + cost_param_str
        signature = hmac.new(secret_key.encode('utf-8'), signature_str.encode('utf-8'), hashlib.sha256).hexdigest()
        
        headers = {
            'X-BAPI-API-KEY': api_key,
            'X-BAPI-SIGN': signature,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recv_window
        }
        
        response = requests.get(
            f"https://api.bybit.com{cost_endpoint}", 
            headers=headers, 
            params=cost_params,
            timeout=5
        )
        
        data = response.json()
        if data.get('retCode') == 0 and data.get('result', {}).get('list'):
            position = data['result']['list'][0]
            avg_price = float(position.get('avgPrice', '0'))
            return amount * avg_price
        return None
    except Exception as e:
        logger.error("Error fetching cost basis for %s: %s", coin, e)
        return None

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
    
    try:
        # Validate numeric inputs
        amount = float(amount)
        purchase_price = float(purchase_price)
        
        if amount <= 0 or purchase_price <= 0:
            return Response({'detail': 'Amount and purchase price must be positive'}, 
                          status=status.HTTP_400_BAD_REQUEST)
                          
        PortfolioHolding.objects.create(
            user=user,
            coin=coin.upper(),
            amount=amount,
            purchase_price=purchase_price
        )
        return Response({'detail': 'Holding added'}, status=status.HTTP_201_CREATED)
    except ValueError:
        return Response({'detail': 'Invalid numeric values'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST', 'GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def portfolio(request):
    """
    GET or POST /api/portfolio/
    Returns current portfolio holdings from exchanges and manual entries
    """
    user = request.user
    try:
        api_keys = APIKey.objects.get(user=user)
        # Check for active API keys early
        has_binance = bool(api_keys.binance_api_key and api_keys.binance_secret_key)
        has_bybit = bool(api_keys.bybit_api_key and api_keys.bybit_secret_key)
        
        if not has_binance and not has_bybit:
            logger.info("No active API keys found for user %s", user.username)
            # Fix: Check for manual holdings before returning empty portfolio
            if not PortfolioHolding.objects.filter(user=user).exists():
                return Response({
                    'detail': 'No active API keys or manual holdings found',
                    'portfolio': [],
                    'total_value': 0,
                    'has_api_keys': False,
                    'errors': None
                }, status=status.HTTP_200_OK)
    except APIKey.DoesNotExist:
        # Fix: Check for manual holdings before returning empty portfolio
        if not PortfolioHolding.objects.filter(user=user).exists():
            logger.info("API keys not configured for user %s", user.username)
            return Response({
                'detail': 'API keys not configured',
                'portfolio': [],
                'total_value': 0,
                'has_api_keys': False,
                'errors': None
            }, status=status.HTTP_200_OK)

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
                            'original_value': original_value  # Include original value if available
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
            # Fix: Add explicit timeout
            timestamp = str(int(time.time() * 1000))
            binance_params = { 'timestamp': timestamp, 'recvWindow': '5000' }
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
            logger.info("Sending request to Binance: %s", full_url)
            response = requests.get(full_url, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            for balance in data.get('balances', []):
                amount = float(balance['free']) + float(balance['locked'])
                if amount > 0:
                    current_price = get_binance_price(balance['asset'])
                    if current_price:
                        portfolio_data.append({
                            'exchange': 'Binance',
                            'account_type': 'Spot',  # Fix: Consistent account_type across all sources
                            'coin': balance['asset'],
                            'amount': str(amount),
                            'current_price': current_price,
                            'current_value': amount * current_price,
                            'transferable': balance['free'],  # Fix: Include transferable amount
                            'original_value': None  # Binance doesn't provide cost basis
                        })
        except Exception as e:
            logger.error("Error fetching Binance holdings: %s", str(e))
            errors.append(f"Binance error: {str(e)}")

    # Fetch Manual Holdings from PortfolioHolding
    manual_holdings = PortfolioHolding.objects.filter(user=user)
    manual_data = {}
    
    # First pass: Form manual holdings
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
        
        # Fix: Try both Bybit and Binance price sources
        current_price = get_bybit_price(coin)
        if current_price is None:
            current_price = get_binance_price(coin)
        
        if current_price is not None:
            current_value = total_amount * current_price
            
            # Fix: Use consistent data structure with exchange holdings
            portfolio_data.append({
                'exchange': 'Manual',
                'account_type': 'Manual',
                'coin': coin,
                'amount': str(total_amount),
                'current_price': current_price,
                'current_value': current_value,
                'transferable': str(total_amount),  # All manual holdings are transferable
                'original_value': total_cost  # Use total cost as original value
            })
        else:
            # Fix: Handle case when price is not available
            logger.warning("Could not fetch price for manual holding: %s", coin)
            errors.append(f"Could not fetch price for {coin}")

    # If no holdings were found, return an empty portfolio
    if not portfolio_data:
        return Response({
            'detail': 'No holdings found' if not errors else 'Error fetching holdings',
            'errors': errors if errors else None,
            'portfolio': [],
            'total_value': 0
        }, status=status.HTTP_200_OK)

    total_value = sum(item['current_value'] for item in portfolio_data)
    
    # Save historical data
    coin_values = {}
    for item in portfolio_data:
        coin = item['coin']
        value = item['current_value']
        if coin in coin_values:
            coin_values[coin] += value
        else:
            coin_values[coin] = value

    # Create portfolio history record
    PortfolioHistory.objects.create(
        user=user,
        total_value=total_value,
        coin_values=coin_values
    )
    
    return Response({
        'portfolio': portfolio_data,
        'total_value': total_value,
        'errors': errors if errors else None
    }, status=status.HTTP_200_OK)
    
@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def portfolio_history(request):
    """
    GET /api/portfolio/history/?days=30&coin=BTC
    Returns historical data for either total portfolio value or specific coin value.
    """
    user = request.user
    try:
        days = int(request.query_params.get('days', 30))
        if days <= 0:
            days = 30  # Fix: Ensure positive days value
    except ValueError:
        days = 30
    
    coin = request.query_params.get('coin')
    start_date = timezone.now() - timedelta(days=days)
    
    # Fix: Add limit to avoid massive query results
    histories = PortfolioHistory.objects.filter(
        user=user, 
        timestamp__gte=start_date
    ).order_by('timestamp')[:1000]  # Limit to 1000 records

    history_data = []
    for record in histories:
        try:
            if coin:
                # Fix: Ensure coin is in uppercase
                coin_values = record.coin_values or {}
                coin_value = float(coin_values.get(coin.upper(), 0))
                history_data.append({
                    'timestamp': record.timestamp.isoformat(),
                    'value': coin_value
                })
            else:
                history_data.append({
                    'timestamp': record.timestamp.isoformat(),
                    'value': float(record.total_value)
                })
        except (TypeError, ValueError) as e:
            logger.error(f"Error processing history record: {e}")
            continue

    return Response({'history': history_data}, status=status.HTTP_200_OK)

# API key management
@api_view(['POST', 'GET', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def manage_api_keys(request):
    """
    Manage API keys:
    - POST: Add/update keys
    - GET: Retrieve key status
    - DELETE: Remove keys
    """
    if request.method == 'DELETE':
        try:
            api_keys = APIKey.objects.get(user=request.user)
            exchange = request.data.get('exchange', '').strip().lower()
            
            if not exchange:
                return Response(
                    {'detail': 'Exchange parameter is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if exchange == 'binance':
                api_keys.binance_api_key = ''
                api_keys.binance_secret_key = ''
            elif exchange == 'bybit':
                api_keys.bybit_api_key = ''
                api_keys.bybit_secret_key = ''
            else:
                return Response(
                    {'detail': 'Invalid exchange specified'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            api_keys.save()
            
            # Return updated status
            return Response({
                'binance_api_key': '*' * 8 + api_keys.binance_api_key[-4:] if api_keys.binance_api_key else None,
                'bybit_api_key': '*' * 8 + api_keys.bybit_api_key[-4:] if api_keys.bybit_api_key else None,
                'has_api_keys': bool(api_keys.binance_api_key or api_keys.bybit_api_key),
                'active_exchanges': [
                    'binance' if api_keys.binance_api_key else None,
                    'bybit' if api_keys.bybit_api_key else None
                ]
            })
        except APIKey.DoesNotExist:
            return Response({'has_api_keys': False})

    if request.method == 'POST':
        try:
            api_keys, created = APIKey.objects.get_or_create(user=request.user)
            
            # Check if this is a removal request
            exchange = request.data.get('exchange')
            if exchange:
                if exchange == 'binance':
                    api_keys.binance_api_key = None
                    api_keys.binance_secret_key = None
                elif exchange == 'bybit':
                    api_keys.bybit_api_key = None
                    api_keys.bybit_secret_key = None
                api_keys.save()
                return Response({
                    'binance_api_key': '*' * 8 + api_keys.binance_api_key[-4:] if api_keys.binance_api_key else None,
                    'bybit_api_key': '*' * 8 + api_keys.bybit_api_key[-4:] if api_keys.bybit_api_key else None,
                    'has_api_keys': bool(api_keys.binance_api_key or api_keys.bybit_api_key)
                })
            
            # Retrieve and clean API keys from request
            binance_api_key = request.data.get('binance_api_key', '').strip() or None
            binance_secret_key = request.data.get('binance_secret_key', '').strip() or None
            bybit_api_key = request.data.get('bybit_api_key', '').strip() or None
            bybit_secret_key = request.data.get('bybit_secret_key', '').strip() or None
            
            # Update keys only if provided, without clearing others
            if binance_api_key is not None and binance_secret_key is not None:
                api_keys.binance_api_key = binance_api_key
                api_keys.binance_secret_key = binance_secret_key
            
            if bybit_api_key is not None and bybit_secret_key is not None:
                api_keys.bybit_api_key = bybit_api_key
                api_keys.bybit_secret_key = bybit_secret_key
            
            api_keys.save()
            
            # Test API keys if not in test environment
            if 'test' not in request.META.get('SERVER_NAME', '').lower():
                try:
                    if binance_api_key and binance_secret_key:
                        # Test Binance keys
                        timestamp = str(int(time.time() * 1000))
                        params = { 'timestamp': timestamp, 'recvWindow': '5000' }
                        query_string = urlencode(params)
                        signature = hmac.new(
                            binance_secret_key.encode('utf-8'),
                            query_string.encode('utf-8'),
                            hashlib.sha256
                        ).hexdigest()
                        params['signature'] = signature
                        response = requests.get(
                            'https://api.binance.com/api/v3/account',
                            params=params,
                            headers={'X-MBX-APIKEY': binance_api_key},
                            timeout=10
                        )
                        if response.status_code != 200:
                            logger.warning("Binance API test response: %s - %s", response.status_code, response.text)
                except Exception as e:
                    logger.error("Error testing Binance API keys: %s", e)
                
                try:
                    if bybit_api_key and bybit_secret_key:
                        # Test Bybit keys
                        timestamp = str(int(time.time() * 1000))
                        recv_window = "5000"
                        params = {"accountType": "UNIFIED"}
                        param_str = urlencode(sorted(params.items()))
                        signature_str = timestamp + bybit_api_key + recv_window + param_str
                        signature = hmac.new(
                            bybit_secret_key.encode('utf-8'), 
                            signature_str.encode('utf-8'), 
                            hashlib.sha256
                        ).hexdigest()
                        
                        headers = {
                            'X-BAPI-API-KEY': bybit_api_key,
                            'X-BAPI-SIGN': signature,
                            'X-BAPI-TIMESTAMP': timestamp,
                            'X-BAPI-RECV-WINDOW': recv_window
                        }
                        
                        response = requests.get(
                            "https://api.bybit.com/v5/asset/transfer/query-account-coins-balance",
                            headers=headers,
                            params=params,
                            timeout=10
                        )
                        if response.status_code != 200:
                            logger.warning("Bybit API test response: %s - %s", response.status_code, response.text)
                except Exception as e:
                    logger.error("Error testing Bybit API keys: %s", e)
            
            # Return updated status
            active_exchanges = []
            if api_keys.binance_api_key:
                active_exchanges.append('binance')
            if api_keys.bybit_api_key:
                active_exchanges.append('bybit')
            
            return Response({
                'binance_api_key': '*' * 8 + api_keys.binance_api_key[-4:] if api_keys.binance_api_key else None,
                'bybit_api_key': '*' * 8 + api_keys.bybit_api_key[-4:] if api_keys.bybit_api_key else None,
                'has_api_keys': bool(api_keys.binance_api_key or api_keys.bybit_api_key),
                'active_exchanges': active_exchanges
            })
        except Exception as e:
            logger.error("Error managing API keys: %s", e)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 
    else:  # GET request
        # Return current API key status
        try:
            api_keys = APIKey.objects.get(user=request.user)
            #  Add active_exchanges to response
            active_exchanges = []
            if api_keys.binance_api_key:
                active_exchanges.append('binance')
            if api_keys.bybit_api_key:
                active_exchanges.append('bybit')
                
            return Response({
                'binance_api_key': '*' * 8 + api_keys.binance_api_key[-4:] if api_keys.binance_api_key else None,
                'bybit_api_key': '*' * 8 + api_keys.bybit_api_key[-4:] if api_keys.bybit_api_key else None,
                'has_api_keys': bool(api_keys.binance_api_key or api_keys.bybit_api_key),
                'active_exchanges': active_exchanges
            })
        except APIKey.DoesNotExist:
            return Response({'has_api_keys': False})