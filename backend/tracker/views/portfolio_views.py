import hmac
from venv import logger
import requests
from .binance_utils import get_binance_price  
from tracker.models import PortfolioHolding, APIKey  

import requests
from django.http import JsonResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view
from rest_framework.response import Response


from tracker.models import  PortfolioHolding, APIKey 
import hashlib
import time
from urllib.parse import urlencode
import logging

logger = logging.getLogger(__name__)

def get_bybit_price(coin):
    """
    Fetch the current price from Bybit V5 API
    """
    # USDT price is always 1 USD
    if coin.upper() == 'USDT':
        return 1.0

    # Use V5 market endpoint for other coins
    url = "https://api.bybit.com/v5/market/tickers"
    params = {
        "category": "spot",
        "symbol": f"{coin}USDT"  # Format: BTCUSDT, ETHUSDT, etc.
    }

    try:
        print(f"Fetching Bybit price for {coin} with params: {params}")
        response = requests.get(url, params=params, timeout=5)
        print(f"Bybit price response: {response.text}")

        # Check if the API request was successful (HTTP status code 200 means OK)
        if response.status_code == 200:
            data = response.json()
            if data.get("retCode") == 0 and data.get("result", {}).get("list"):
                # Extract the price from the response
                price = float(data["result"]["list"][0]["lastPrice"])
                print(f"Found price for {coin}: ${price}")
                return price
            print(f"No price data found for {coin}")
        return None
    except Exception as e:
        print(f"Error fetching Bybit price for {coin}: {e}")
        return None

def get_bybit_holdings(api_key, secret_key):
    """
    Fetch holdings from Bybit V5 API
    """
    url = "https://api.bybit.com/v5/asset/transfer/query-account-coins-balance"
    timestamp = str(int(time.time() * 1000))
    recv_window = "5000"
    
    # Split coins into batches of 10 (Bybit's limit)
    all_coins = [
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
    
    all_balances = []
    
    # Process coins in batches of 10
    for i in range(0, len(all_coins), 10):
        coin_batch = all_coins[i:i + 10]
        params = {
            "accountType": "UNIFIED",
            "coin": ",".join(coin_batch)
        }
        
        # Create signature
        param_str = timestamp + api_key + recv_window + urlencode(sorted(params.items()))
        signature = hmac.new(
            bytes(secret_key, 'utf-8'),
            param_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
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
                # Check if the API response indicates success
                if data.get('retCode') == 0:
                    balance_data = data.get('result', {}).get('balance', [])
                    for coin_data in balance_data:
                        wallet_balance = float(coin_data.get('walletBalance', '0'))
                        if wallet_balance > 0:
                            all_balances.append({
                                'coin': coin_data['coin'],
                                'amount': wallet_balance,
                                'transferable': float(coin_data.get('transferBalance', '0'))
                            })
                            print(f"Found balance for {coin_data['coin']}: {wallet_balance}")
        except Exception as e:
            print(f"Error fetching batch {i//10 + 1}: {e}")
            continue

    return all_balances

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def add_holding(request):
    """
    POST /portfolio/add/
    Expected data: { "coin": "BTC", "amount": "0.5", "purchase_price": "40000" }
    """
    user = request.user  # Get the authenticated user
    coin = request.data.get('coin')
    amount = request.data.get('amount')
    purchase_price = request.data.get('purchase_price')
    
    # Validate required fields
    if not coin or not amount or not purchase_price:
        return Response({'detail': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create and save the new holding
    holding = PortfolioHolding.objects.create(
        user=user,
        coin=coin,
        amount=amount,
        purchase_price=purchase_price
    )
    return Response({'detail': 'Holding added'}, status=status.HTTP_201_CREATED)

@api_view(['POST', 'GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def portfolio(request):
    user = request.user
    try:
        api_keys = APIKey.objects.get(user=user)
        print(f"Found API keys for {user.username}")
    except APIKey.DoesNotExist:
        return Response({
            'detail': 'Please add your API keys in profile settings first',
            'has_api_keys': False
        }, status=status.HTTP_400_BAD_REQUEST)

    portfolio_data = []
    errors = []

    # Fetch Bybit holdings
    if api_keys.bybit_api_key and api_keys.bybit_secret_key:
        try:
            holdings = get_bybit_holdings(api_keys.bybit_api_key, api_keys.bybit_secret_key)
            if holdings:
                for holding in holdings:
                    coin = holding['coin']
                    amount = float(holding['amount'])
                    
                    # Get current price (handle USDT specially)
                    current_price = get_bybit_price(coin)
                    if current_price is not None:
                        value = amount * current_price
                        portfolio_data.append({
                            'exchange': 'Bybit',
                            'coin': coin,
                            'amount': str(amount),
                            'current_price': current_price,
                            'current_value': value,
                            'transferable': str(holding['transferable'])
                        })
                        print(f"Added {coin} to portfolio: {amount} @ ${current_price} = ${value}")
        except Exception as e:
            error_msg = f"Error fetching Bybit holdings: {str(e)}"
            print(error_msg)
            errors.append(error_msg)

    # Fetch Binance holdings if API keys exist
    if api_keys.binance_api_key and api_keys.binance_secret_key:
        try:
            timestamp = str(int(time.time() * 1000))
            binance_params = {
                'timestamp': timestamp,
                'recvWindow': '5000'
            }
            
            # Generate signature for Binance
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
            logger.info(f"Sending request to Binance: {full_url}")
            
            response = requests.get(full_url, headers=headers)
            response.raise_for_status()
            
            logger.info(f"Binance response status: {response.status_code}")
            logger.info(f"Binance response: {response.text[:200]}...")  # Log first 200 chars
            
            if response.status_code == 200:
                data = response.json()
                balances = data.get('balances', [])
                for balance in balances:
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
            logger.error(f"Error fetching Binance holdings: {str(e)}")
            errors.append(f"Binance error: {str(e)}")

    if not portfolio_data and errors:
        return Response({
            'detail': 'Error fetching holdings',
            'errors': errors,
            'portfolio': []
        }, status=status.HTTP_200_OK)

    return Response({
        'portfolio': portfolio_data,
        'total_value': sum(item['current_value'] for item in portfolio_data),
        'errors': errors if errors else None
    }, status=status.HTTP_200_OK)

@api_view(['POST', 'GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def manage_api_keys(request):
    """
    Manage the user's API keys.
    - POST: Save or update API keys for Binance and Bybit.
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
            
            # In test environment, skip API key validation
            # Only validate in production environment
            if 'test' not in request.META.get('SERVER_NAME', '').lower():
                # Test the API keys if they exist
                try:
                    if api_keys.binance_api_key and api_keys.binance_secret_key:
                        timestamp = str(int(time.time() * 1000))
                        params = {
                            'timestamp': timestamp,
                            'recvWindow': '5000'  # Adding recvWindow parameter
                        }
                        
                        # Create a proper query string and signature
                        query_string = urlencode(params)
                        signature = hmac.new(
                            api_keys.binance_secret_key.encode('utf-8'),
                            query_string.encode('utf-8'),
                            hashlib.sha256
                        ).hexdigest()
                        
                        # Add signature to params
                        params['signature'] = signature
                        
                        response = requests.get(
                            'https://api.binance.com/api/v3/account',
                            params=params,
                            headers={'X-MBX-APIKEY': api_keys.binance_api_key}
                        )
                        
                        # Log the response without raising an exception
                        if response.status_code != 200:
                            logger.warning(f"Binance API test response: {response.status_code} - {response.text}")
                except Exception as e:
                    # Log the error but don't fail the request
                    logger.error(f"Error testing API keys: {str(e)}")
            
            return Response({
                'binance_api_key': '*' * 8 + api_keys.binance_api_key[-4:] if api_keys.binance_api_key else None,
                'bybit_api_key': '*' * 8 + api_keys.bybit_api_key[-4:] if api_keys.bybit_api_key else None,
                'has_api_keys': bool(api_keys.binance_api_key or api_keys.bybit_api_key)
            })
        except APIKey.DoesNotExist:
            return Response({'has_api_keys': False})
    else:  # GET request
        try:
            api_keys = APIKey.objects.get(user=request.user)
            return Response({
                'binance_api_key': '*' * 8 + api_keys.binance_api_key[-4:] if api_keys.binance_api_key else None,
                'bybit_api_key': '*' * 8 + api_keys.bybit_api_key[-4:] if api_keys.bybit_api_key else None,
                'has_api_keys': bool(api_keys.binance_api_key or api_keys.bybit_api_key)
            })
        except APIKey.DoesNotExist:
            return Response({'has_api_keys': False})