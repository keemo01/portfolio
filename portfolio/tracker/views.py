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
from .serializers import BlogSerializer, UserSerializer

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
        user.set_password(request.data['password'])  # Hash the user's password
        user.save()
        token = Token.objects.create(user=user)  # Generate authentication token
        return Response({'token': token.key, 'user': serializer.data}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# User Login
@api_view(['POST'])
def login(request):
    """
    Authenticates a user by verifying username and password.
    If successful, it'll return a token for further requests.
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
    Logs out a user by deleting their token.
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
    blog = get_object_or_404(Blog, pk=pk)
    serializer = BlogSerializer(blog, context={'request': request})  # Pass request
    return Response(serializer.data)

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
    
    if blog_serializer.is_valid():
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
    Fetches real-time cryptocurrency data from Binance API.
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
