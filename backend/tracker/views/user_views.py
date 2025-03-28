import requests
from django.http import JsonResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

import time
from urllib.parse import urlencode

from tracker.models import Blog
from tracker.serializers import BlogSerializer, UserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])  # 🚀 This ensures any user can access signup
def signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.set_password(request.data['password'])  # Hash password
        user.save()

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        return Response({
            'access_token': access_token,
            'refresh_token': str(refresh),
            'user': serializer.data
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# User Login
@api_view(['POST'])
def login(request):
    """
    POST /login/
    Authenticates user with username and password.
    Returns JWT token and user details.
    """
    try:
        user = get_object_or_404(User, username=request.data.get('username'))
        if not user.check_password(request.data.get('password')):
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        # Create JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Return token and user data
        serializer = UserSerializer(user)
        return Response({
            'access_token': access_token,
            'refresh_token': str(refresh),
            'user': serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'detail': 'User not found or an error occurred', 'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

# User Logout
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get("refresh_token")
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"detail": "Logout successful"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"detail": "Error logging out", "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)



# Token Validation (Protected Endpoint)
@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def test_token(request):
    """
    Test to find if the provided authentication token is valid
    If the token is valid, return the user's username and email
    """
    return Response({
        'user': {
            'username': request.user.username,
            'email': request.user.email
        }
    }, status=status.HTTP_200_OK)
    

# User Profile Management
@api_view(['GET', 'PUT'])
@authentication_classes([JWTAuthentication])  # Changed from TokenAuthentication to JWTAuthentication
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Retrieve or update user profile information.
    
    - GET Request: Returns the user's profile with the given data
    - PUT Request: Updates the user's profile using given data
    """
    user = request.user

    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = UserSerializer(user, data=request.data, partial=True)  # Allow partial updates
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

# Change Password
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change the user's password.    
    """
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    # Check if the old password is correct
    if not user.check_password(old_password):
        return Response({'detail': 'Old password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Set and save the new password
    user.set_password(new_password)
    user.save()
    
    return Response({'detail': 'Password updated successfully'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_blogs(request):
    """
    Retrieve all blogs created by the authenticated user.
    """
    blogs = Blog.objects.filter(author=request.user)
    
    # Use the BlogSerializer with request context to properly handle media URLs
    serializer = BlogSerializer(blogs, many=True, context={'request': request})
    
    return Response(serializer.data)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_blog(request, blog_id):
    """
    Get a specific blog for the authenticated user by blog ID
    """
    try:
        blog = Blog.objects.get(id=blog_id, user=request.user)
        serializer = BlogSerializer(blog)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Blog.DoesNotExist:
        return Response(
            {"detail": "Blog not found or you don't have permission to view it"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        # Get the token from the request
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({'error': 'No valid token provided'}, status=401)
        
        token = auth_header.split(' ')[1]
        # Check if the token is valid
        request.user.auth_token.delete()
        
        return Response({'message': 'Successfully logged out'}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)