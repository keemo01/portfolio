import requests
from django.http import JsonResponse
from django.views import View
from rest_framework.parsers import MultiPartParser, FormParser
from requests.exceptions import RequestException
from rest_framework.decorators import api_view, authentication_classes, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from json.decoder import JSONDecodeError

from tracker.models import Blog, BlogMedia
from .serializers import BlogSerializer, CommentSerializer, UserSerializer
from .models import Comment, PortfolioHolding, APIKey  # Add PortfolioHolding and APIKey import
import hmac
import hashlib
import time
from urllib.parse import urlencode
import logging

logger = logging.getLogger(__name__)

def get_binance_price(coin_symbol):
    """
    Fetch the current price from Binance for coin_symbol (e.g., "BTC" returns price from BTCUSDT).
    """
    pair = coin_symbol.upper() + "USDT"
    url = f"https://api.binance.com/api/v3/ticker/price?symbol={pair}"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        return float(data.get("price", 0))
    except Exception as e:
        print(f"Binance error for {coin_symbol}: {e}")
        return None

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

        if response.status_code == 200:
            data = response.json()
            if data.get("retCode") == 0 and data.get("result", {}).get("list"):
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

# User Registration (Signup)
@api_view(['POST'])
def signup(request):
    """
    POST /signup/
    Creates new user account with username, email, and password.
    Returns authentication token and user details.
    """
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.set_password(request.data['password'])  # Hash the user's password
        user.save()
        token = Token.objects.create(user=user)  # Generate authentication token
        return Response({'token': token.key, 'user': serializer.data}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# User Login
@api_view(['POST'])
def login(request):
    """
    POST /login/
    Authenticates user with username and password.
    Returns authentication token and user details.
    """
    try:
        user = get_object_or_404(User, username=request.data.get('username'))
        if not user.check_password(request.data.get('password')):
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        token, created = Token.objects.get_or_create(user=user)
        serializer = UserSerializer(user)
        return Response({'token': token.key, 'user': serializer.data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'detail': 'User not found or an error occurred', 'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

# User Logout
@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    POST /logout/
    Requires: Authentication Token
    Invalidates the current user's authentication token.
    """
    try:
        request.user.auth_token.delete()
        return Response(status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'detail': 'Error logging out', 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

# Token Validation (Protected Endpoint)
@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def test_token(request):
    return Response({
        'user': {
            'username': request.user.username,
            'email': request.user.email
        }
    }, status=status.HTTP_200_OK)

# User Profile Management
@api_view(['GET', 'PUT'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get or update user profile information
    """
    user = request.user
    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)
    elif request.method == 'PUT':
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change user password
    """
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not user.check_password(old_password):
        return Response({'detail': 'Old password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    user.set_password(new_password)
    user.save()
    return Response({'detail': 'Password updated successfully'}, status=status.HTTP_200_OK)

# Blog Endpoints
@api_view(['GET'])
def get_blogs(request):
    blogs = Blog.objects.all().order_by('-created_at')
    serializer = BlogSerializer(blogs, many=True, context={'request': request})  # Pass request
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
def blog_detail(request, pk):
    """
    GET /blogs/<pk>/
    Public endpoint - no authentication required
    Returns: Blog details including media and author information
    """
    try:
        blog = get_object_or_404(Blog, pk=pk)
        serializer = BlogSerializer(blog, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Blog.DoesNotExist:
        return Response({'detail': 'Blog not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def create_blog(request):
    """
    Allows authenticated users to create a new blog with images/videos.
    """
    data = request.data
    blog_serializer = BlogSerializer(data=data)
    
    if (blog_serializer.is_valid()):
        blog = blog_serializer.save(author=request.user)
        for file in request.FILES.getlist('media'):  # Handle media files
            BlogMedia.objects.create(blog=blog, file=file)
        return Response(blog_serializer.data, status=status.HTTP_201_CREATED)
    return Response(blog_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def delete_blog(request, blog_id):
    """
    Allows authenticated users to delete their own blog.
    """
    blog = get_object_or_404(Blog, id=blog_id)
    if blog.author != request.user:
        return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    blog.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def user_blogs(request):
    """
    Fetch blogs created by the authenticated user.
    """
    try:
        # Add print statements for debugging
        print(f"Fetching blogs for user: {request.user.username}")
        blogs = Blog.objects.filter(author=request.user).order_by('-created_at')
        print(f"Found {blogs.count()} blogs")
        
        serializer = BlogSerializer(blogs, many=True, context={'request': request})
        return Response({
            'blogs': serializer.data,
            'count': blogs.count()
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in user_blogs: {str(e)}")
        return Response(
            {'detail': f'Error fetching user blogs: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# Binance Real-time Data
class BinanceRealtime(View):
    """
    GET /binance-realtime/
    Public endpoint - no authentication required
    Returns: Real-time cryptocurrency price data from Binance
    Data includes: symbol, price, 24h change, timestamp
    """
    def get(self, request):
        url = 'https://api.binance.com/api/v3/ticker/24hr'  # Binance API Endpoint

        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()  # Raise error for HTTP issues
            
            data = response.json()

            formatted_data = [
                {
                    'symbol': coin.get('symbol'),
                    'price': coin.get('lastPrice'),
                    'change': coin.get('priceChangePercent'),
                    'timestamp': coin.get('closeTime')
                }
                for coin in data
                if 'symbol' in coin and 'lastPrice' in coin
            ]

            if (formatted_data):
                return JsonResponse(formatted_data, safe=False, status=status.HTTP_200_OK)
            return JsonResponse({'error': 'No valid data received'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except requests.Timeout:
            return JsonResponse({'error': 'Request timed out'}, status=status.HTTP_504_GATEWAY_TIMEOUT)
        except requests.ConnectionError:
            return JsonResponse({'error': 'Could not connect to Binance'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON response'}, status=status.HTTP_502_BAD_GATEWAY)
        except RequestException as e:
            return JsonResponse({'error': f'API request failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def blog_comments(request, blog_id):
    """
    GET /blogs/<blog_id>/comments/
    Returns: All comments for specified blog
    
    POST /blogs/<blog_id>/comments/
    Required data: content, parent (optionaxl for replies)
    Returns: Created comment data
    Requires: Authentication Token
    """
    blog = get_object_or_404(Blog, id=blog_id)
    if request.method == 'GET':
        comments = Comment.objects.filter(blog=blog, parent=None)
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(blog=blog, author=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def delete_comment(request, blog_id, comment_id):
    """
    DELETE /api/blogs/<blog_id>/comments/<comment_id>/
    Deletes a comment if the user is the author and the comment belongs to the specified blog
    """
    try:
        comment = get_object_or_404(Comment, id=comment_id, blog_id=blog_id)
        if comment.author != request.user:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Comment.DoesNotExist:
        return Response({'detail': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
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
    POST: Save/update API keys
    GET: Retrieve saved API keys (masked)
    """
    if request.method == 'POST':
        try:
            api_keys, created = APIKey.objects.get_or_create(user=request.user)
            
            # Only update keys if they are provided in the request
            if 'binance_api_key' in request.data:
                api_keys.binance_api_key = request.data['binance_api_key']
            if 'binance_secret_key' in request.data:
                api_keys.binance_secret_key = request.data['binance_secret_key']
            if 'bybit_api_key' in request.data:
                api_keys.bybit_api_key = request.data['bybit_api_key']
            if 'bybit_secret_key' in request.data:
                api_keys.bybit_secret_key = request.data['bybit_secret_key']
            
            api_keys.save()
            logger.info(f"API keys updated for user {request.user.username}")
            
            # Verify the keys work by making a test request
            try:
                # Test Binance keys
                if api_keys.binance_api_key and api_keys.binance_secret_key:
                    timestamp = str(int(time.time() * 1000))
                    params = {'timestamp': timestamp}
                    signature = hmac.new(
                        api_keys.binance_secret_key.encode('utf-8'),
                        urlencode(params).encode('utf-8'),
                        hashlib.sha256
                    ).hexdigest()
                    
                    response = requests.get(
                        'https://api.binance.com/api/v3/account',
                        params={**params, 'signature': signature},
                        headers={'X-MBX-APIKEY': api_keys.binance_api_key}
                    )
                    response.raise_for_status()
            except Exception as e:
                logger.error(f"Error testing API keys: {str(e)}")
                return Response({
                    'detail': 'API keys saved but test request failed. Please verify your keys.',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({'detail': 'API keys updated and verified successfully'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error saving API keys: {str(e)}")
            return Response({'detail': f'Error saving API keys: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'GET':
        try:
            api_keys = APIKey.objects.get(user=request.user)
            return Response({
                'binance_api_key': '*' * 8 + api_keys.binance_api_key[-4:] if api_keys.binance_api_key else None,
                'bybit_api_key': '*' * 8 + api_keys.bybit_api_key[-4:] if api_keys.bybit_api_key else None,
                'has_api_keys': bool(api_keys.binance_api_key or api_keys.bybit_api_key)
            })
        except APIKey.DoesNotExist:
            return Response({'has_api_keys': False})
