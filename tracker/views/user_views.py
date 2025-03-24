import requests
from django.http import JsonResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

import time
from urllib.parse import urlencode

from tracker.serializers import UserSerializer

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
@authentication_classes([TokenAuthentication])
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
@authentication_classes([TokenAuthentication])
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
