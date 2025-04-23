import hmac
import time
import hashlib
import logging
import requests
from decimal import Decimal
from urllib.parse import urlencode
from datetime import timedelta
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from tracker.views.portfolio_utils import aggregate_portfolio_holdings, calculate_portfolio_metrics
from tracker.models import PortfolioHolding, APIKey, PortfolioHistory


logger = logging.getLogger(__name__)

session = requests.Session() # Reuse the session for multiple requests

# Shared session for Binance account calls
binance_session = requests.Session()

SYMBOL_OVERRIDES = {
    'SNM': 'SONM',   # SONM is the correct symbol for SONM on Binance
}
# These are not tradable on Binance
IGNORE_BINANCE_SYMBOLS = {'SNM', 'SONM'} 

def get_binance_price(coin):
    """
    Return the USDT price for `coin`.
    - USDT → 1.0
    - Applies SYMBOL_OVERRIDES
    - Returns float price or None
    """
    uc = coin.upper()
    if uc == 'USDT':
        return 1.0

    if uc in IGNORE_BINANCE_SYMBOLS:
        # SNM/SONM aren't tradable on Binance
        return None

    symbol = SYMBOL_OVERRIDES.get(uc, uc)
    pair = f"{symbol}USDT"
    try:
        resp = binance_session.get(
            "https://api.binance.com/api/v3/ticker/price",
            params={'symbol': pair},
            timeout=5
        )
        resp.raise_for_status()
        data = resp.json()
        return float(data['price'])
    except Exception as e:
        logger.warning("Binance: no price for %s (tried %s): %s", coin, pair, e)
        return None

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
        # Using session to make the request 
        response = session.get(url, params=params, timeout=5) 
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
        "BONK", "PYTH", "CFX", "AGIX", "JUP", "GMX", "1INCH", "CAKE", "DENT", "ENS",
    ]
    
    for account in accounts:
        url = f"https://api.bybit.com{account['endpoint']}"
        
        for i in range(0, len(all_coins), 10):
            coin_batch = all_coins[i:i + 10]
            params = {"accountType": account["type"], "coin": ",".join(coin_batch)}
            
            timestamp = str(int(time.time() * 1000))
            recv_window = "5000"
            # Sort parameters for signature
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
                response = session.get(url, headers=headers, params=params, timeout=10)  # Using session here
                if response.status_code == 200:
                    data = response.json()
                    if data.get('retCode') == 0:
                        for coin_data in data.get('result', {}).get('balance', []):
                            wallet_balance = float(coin_data.get('walletBalance', '0'))
                            if wallet_balance > 0:
                                # Fetch cost basis for the coin
                                try:
                                    original_value = get_bybit_cost_basis(
                                        api_key, 
                                        secret_key, 
                                        coin_data['coin'], 
                                        wallet_balance
                                    )
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

def get_bybit_cost_basis(api_key, secret_key, coin, amount):
    """
    Get cost basis for a specific coin from Bybit.
    Returns the original value or None if not available.
    Note: Cost basis isn't available for spot holdings, only return for futures.
    """
    # USDT is always $1.0
    if coin.upper() == 'USDT':
        return amount
        
    try:
        cost_endpoint = "/v5/position/info"
        cost_params = {
            "category": "linear",  # Changed from Spot as  Bybit doesn't support cost basis for Spot
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
        
        response = session.get(
            f"https://api.bybit.com{cost_endpoint}", 
            headers=headers, 
            params=cost_params,
            timeout=5
        )
        
        if response.status_code != 200:
            logger.debug("No position data available for %s (status code: %d)", coin, response.status_code)
            return None
            
        data = response.json()
        if data.get('retCode') == 0 and data.get('result', {}).get('list'):
            position = data['result']['list'][0]
            avg_price = float(position.get('avgPrice', '0'))
            if avg_price > 0:
                return amount * avg_price
        return None
    except Exception as e:
        logger.debug("Could not fetch cost basis for %s: %s", coin, str(e))
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
        # Normalize coin symbol
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

def fetch_user_holdings(user):
    """
    Fetch all holdings (Bybit, Binance, Manual), aggregate them,
    and return (consolidated_dict, metrics_dict, errors_list).
    """
    errors = []
    combined = []

    # Bybit API keys
    keys = APIKey.objects.filter(user=user).first()

    # Bybit
    if keys and keys.bybit_api_key and keys.bybit_secret_key:
        try:
            for h in get_bybit_holdings(keys.bybit_api_key, keys.bybit_secret_key):
                price = get_bybit_price(h["coin"])
                if price is None:
                    errors.append(f"No price for {h['coin']} on Bybit")
                    continue
                h["current_price"] = price
                h["current_value"] = Decimal(str(h["amount"])) * Decimal(str(price))
                combined.append(h)
        except Exception as e:
            errors.append(f"Bybit fetch error: {e}")
    

    # Manual holdings
    for m in PortfolioHolding.objects.filter(user=user):
        coin = m.coin.upper()
        price = get_bybit_price(coin) 
        if price is None:
            errors.append(f"No price for manual {coin}")
            continue
        amt = Decimal(str(m.amount))
        combined.append({
            "exchange": "Manual",
            "account_type": "Manual",
            "coin": coin,
            "amount": float(amt),
            "transferable": float(amt),
            "original_value": amt * Decimal(str(m.purchase_price)),
            "current_price": price,
            "current_value": amt * Decimal(str(price))
        })

@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def portfolio(request):
    """
    GET or POST /api/portfolio/
    Returns consolidated portfolio from Bybit, Binance, and manual holdings.
    """
    user = request.user

    # Load API keys
    try:
        api_keys = APIKey.objects.get(user=user)
        has_binance = bool(api_keys.binance_api_key and api_keys.binance_secret_key)
        has_bybit = bool(api_keys.bybit_api_key and api_keys.bybit_secret_key)
        
        # Check if user has any API keys or holdings
        if not (has_binance or has_bybit) and not PortfolioHolding.objects.filter(user=user).exists():
            return Response({
                'detail': 'No API keys or manual holdings',
                'portfolio': [],
                'total_value': 0,
                'errors': None,
                'has_api_keys': False,
            }, status=status.HTTP_200_OK)

    except APIKey.DoesNotExist:
        api_keys = None
        # Check if user has any API keys or holdings
        if not PortfolioHolding.objects.filter(user=user).exists(): 
            return Response({
                'detail': 'No API keys or manual holdings',
                'portfolio': [],
                'total_value': 0,
                'errors': None,
                'has_api_keys': False,
            }, status=status.HTTP_200_OK)

    portfolio_data = []
    errors = []
    price_cache = {}

    # — Bybit holdings —
    if api_keys and has_bybit:
        try:
            bybit_balances = get_bybit_holdings(api_keys.bybit_api_key, api_keys.bybit_secret_key)
            for h in bybit_balances:
                coin = h['coin']
                amt = float(h['amount'])
                price = price_cache.get(coin) or get_bybit_price(coin)
                price_cache[coin] = price
                if price is None:
                    errors.append(f"No price for {coin} on Bybit")
                    continue
                portfolio_data.append({
                    'exchange': 'Bybit',
                    'account_type': h['account_type'],
                    'coin': coin,
                    'amount': str(amt),
                    'current_price': price,
                    'current_value': amt * price,
                    'transferable': str(h['transferable']),
                    'original_value': h.get('original_value') or amt * price
                })
        except Exception as e:
            logger.error("Bybit error: %s", e)
            errors.append(f"Bybit error: {e}")

    # — Binance holdings —
    if api_keys and has_binance:
        try:
            ts = str(int(time.time() * 1000))
            params = {'timestamp': ts, 'recvWindow': 5000}
            qs = urlencode(params)
            sig = hmac.new(
                api_keys.binance_secret_key.encode('utf-8'),
                qs.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            url = f"https://api.binance.com/api/v3/account?{qs}&signature={sig}"
            headers = {'X-MBX-APIKEY': api_keys.binance_api_key}

            resp = binance_session.get(url, headers=headers, timeout=10)
            resp.raise_for_status()
            for b in resp.json().get('balances', []):
                free, locked = float(b['free']), float(b['locked'])
                amt = free + locked
                if amt <= 0:
                    continue

                coin = b['asset']
                if coin.upper() in IGNORE_BINANCE_SYMBOLS:
                    continue

                price = price_cache.get(coin) or get_binance_price(coin)
                price_cache[coin] = price
                if price is None:
                    errors.append(f"No price for {coin} on Binance")
                    continue

                portfolio_data.append({
                    'exchange': 'Binance',
                    'account_type': 'Spot',
                    'coin': coin,
                    'amount': str(amt),
                    'current_price': price,
                    'current_value': amt * price,
                    'transferable': str(free),
                    'original_value': None
                })
        except Exception as e:
            logger.error("Binance error: %s", e)
            errors.append(f"Binance error: {e}")

    # — Manual holdings —
    manual = {}
    for m in PortfolioHolding.objects.filter(user=user):
        c = m.coin.upper()
        a = float(m.amount)
        cost = a * float(m.purchase_price)
        manual.setdefault(c, {'amount': 0, 'cost': 0})
        manual[c]['amount'] += a
        manual[c]['cost'] += cost

    for coin, d in manual.items():
        price = price_cache.get(coin) or get_bybit_price(coin) or get_binance_price(coin)
        price_cache[coin] = price
        if price is None:
            errors.append(f"No price for manual {coin}")
            continue
        amt = d['amount']
        portfolio_data.append({
            'exchange': 'Manual',
            'account_type': 'Manual',
            'coin': coin,
            'amount': str(amt),
            'current_price': price,
            'current_value': amt * price,
            'transferable': str(amt),
            'original_value': d['cost']
        })

    # — Consolidate holdings and metrics —
    consolidated = aggregate_portfolio_holdings(portfolio_data)
    metrics = calculate_portfolio_metrics(consolidated)

    # — Save history —
    PortfolioHistory.objects.create(
        user=user,
        total_value=metrics['total_value'],
        coin_values={c: float(d['total_value']) for c, d in consolidated.items()},
        active_exchanges=[ex.lower() for ex in metrics['exchange_distribution']]
    )

    # — Build response —
    resp_list = [{
        'coin': c,
        'amount': str(d['total_amount']),
        'current_price': float(d['current_price']),
        'current_value': float(d['total_value']),
        'transferable': str(d['transferable']),
        'original_value': float(d['original_value']),
        'sources': d['sources']
    } for c, d in consolidated.items()]

    return Response({
        'portfolio': sorted(resp_list, key=lambda x: x['current_value'], reverse=True),
        'total_value': float(metrics['total_value']),
        'total_cost': float(metrics['total_cost']),
        'allocation': metrics['allocation'],
        'exchange_distribution': {k: float(v) for k, v in metrics['exchange_distribution'].items()},
        'errors': errors or None,
        'has_api_keys': bool(
            api_keys and (api_keys.binance_api_key or api_keys.bybit_api_key)
        ),
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
            days = 30
    except ValueError:
        days = 30

    # Validate coin parameter
    coin = request.query_params.get('coin')
    if coin:
        coin = coin.upper()

    start_date = timezone.now() - timedelta(days=days)

    # Fetch history in time window
    histories = PortfolioHistory.objects.filter(
        user=user,
        timestamp__gte=start_date
    ).order_by('timestamp')

    history_data = []

    # Determine current exchanges
    # Check if user has API keys for exchanges
    current_exchanges = set()
    if hasattr(user, 'api_keys'):
        if user.api_keys.binance_api_key:
            current_exchanges.add('binance')
        if user.api_keys.bybit_api_key:
            current_exchanges.add('bybit')
    # Mark as manual if no API keys are present
    if not current_exchanges:
        current_exchanges.add('manual')

    # Filter records to only those matching current_exchanges
    for record in histories:
        try:
            record_exchanges = set(record.active_exchanges or [])
            if record_exchanges == current_exchanges:
                if coin:
                    value = float((record.coin_values or {}).get(coin, 0))
                else:
                    value = float(record.total_value)
                history_data.append({
                    'timestamp': record.timestamp.isoformat(),
                    'value': value
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
    - DELETE: Remove key
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
            
            # Delete all portfolio history records for the user
            PortfolioHistory.objects.filter(user=request.user).delete()
            
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
                        response = session.get(  # Using session here
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
                        
                        response = session.get(  # Using session here
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
