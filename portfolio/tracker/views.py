import requests
from django.http import JsonResponse
from django.views import View
from requests.exceptions import RequestException
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from json.decoder import JSONDecodeError

from tracker.models import Blog
from .serializers import BlogSerializer, UserSerializer
from .models import Blog

# User Registration (Signup)
@api_view(['POST'])
def signup(request):
    """
    Handles user registration by creating a new user, hashing the password, 
    and generating a token for authentication.
    """
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Hash the user's password
        user.set_password(request.data['password'])
        user.save()
        # Generate authentication token
        token = Token.objects.create(user=user)
        return Response({'token': token.key, 'user': serializer.data}, status=status.HTTP_201_CREATED)
    # Return errors if validation fails
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# User Login
@api_view(['POST'])
def login(request):
    """
    Authenticates a user by verifying username and password.
    If successful, it'll returns a token for further requests.
    """
    try:
        # Get the user by username
        user = get_object_or_404(User, username=request.data.get('username'))
        # Validate the password
        if not user.check_password(request.data.get('password')):
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        # Retrieve or create an authentication token
        token, created = Token.objects.get_or_create(user=user)
        serializer = UserSerializer(user)
        return Response({'token': token.key, 'user': serializer.data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'detail': 'User not found or an error occurred', 'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

# Token Validation (Protected Endpoint)
@api_view(['GET'])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def test_token(request):
    return Response({'message': f'Welcome, {request.user.username}!'}, status=status.HTTP_200_OK)

################
"BLOG"
@api_view(['GET'])
def get_blogs(request):
    blogs = Blog.objects.all().order_by('-created_at')
    serializer = BlogSerializer(blogs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)



@api_view(['POST'])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def create_blog(request):
    """
    Allows authenticated users to create a new blog.
    """
    data = request.data
    serializer = BlogSerializer(data=data)
    if serializer.is_valid():
        serializer.save(author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# views.py
@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def delete_blog(request, blog_id):
    blog = get_object_or_404(Blog, id=blog_id)
    if blog.author != request.user:
        return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    blog.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from .models import Blog
from .serializers import BlogSerializer, UserSerializer

# Signup
@api_view(['POST'])
def signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.set_password(request.data['password'])  # Hash password
        user.save()
        token = Token.objects.create(user=user)
        return Response({'token': token.key, 'user': serializer.data}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Login
@api_view(['POST'])
def login(request):
    user = get_object_or_404(User, username=request.data.get('username'))
    if not user.check_password(request.data.get('password')):
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_200_OK)

# Fetch Blogs
@api_view(['GET'])
def get_blogs(request):
    blogs = Blog.objects.all().order_by('-created_at')
    serializer = BlogSerializer(blogs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# Create Blog
@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def create_blog(request):
    serializer = BlogSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Delete Blog
@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def delete_blog(request, blog_id):
    blog = get_object_or_404(Blog, id=blog_id)
    if blog.author != request.user:
        return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    blog.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# Binance Real-time Data
class BinanceRealtime(View):
    """
    Fetches real-time cryptocurrency data from Binance API.
    """
    def get(self, request):
        url = 'https://api.binance.com/api/v3/ticker/24hr'  # Binance API Endpoint

        try:
            # Make the request to Binance API
            response = requests.get(url, timeout=5)
            response.raise_for_status()  # Raise error for HTTP issues
            
            # Parse the JSON response
            data = response.json()

            # Format the data into a simplified structure
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

            # Return the formatted data or an error if none is found
            if formatted_data:
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
