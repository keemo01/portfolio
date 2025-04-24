import requests
from django.http import JsonResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404

from tracker.models import Blog, Bookmark
from tracker.serializers import BlogSerializer, UserSerializer




class CustomTokenObtainPairView(TokenObtainPairView):
    """Handles user login and JWT issuance"""
    permission_classes = (AllowAny,)


class PublicTokenRefreshView(TokenRefreshView):
    """
    Allow anonymous clients to POST a refresh token
    and receive new access (and refresh) tokens.
    """
    permission_classes = (AllowAny,)


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """Register a new user and issue JWT tokens"""
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.set_password(request.data['password'])
        user.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': serializer.data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def logout(request):
    """Blacklist the provided refresh token to log out"""
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except Exception as e:
            return Response(
                {'detail': f'Invalid or expired token: {e}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    return Response({'detail': 'Logout successful'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def test_token(request):
    """Verify that the access token is valid and return user info"""
    return Response({
        'status': 'success',
        'user': {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Retrieve or update the authenticated user's profile"""
    user = request.user
    if request.method == 'GET':
        serializer = UserSerializer(user, context={'current_user': user})
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = UserSerializer(
        user,
        data=request.data,
        partial=True,
        context={'current_user': user}
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Allow the authenticated user to change their password"""
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    if not old_password or not new_password:
        return Response(
            {'detail': 'Provide old_password and new_password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if not user.check_password(old_password):
        return Response(
            {'detail': 'Old password incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )
    user.set_password(new_password)
    user.save()
    return Response(
        {'detail': 'Password updated successfully'},
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def user_blogs(request):
    """List all blogs created by the authenticated user"""
    blogs = Blog.objects.filter(author=request.user).order_by('-created_at')
    serializer = BlogSerializer(blogs, many=True, context={'request': request})
    return Response({
        'blogs': serializer.data,
        'count':  blogs.count()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_blog(request, blog_id):
    """Get a specific blog of the authenticated user"""
    blog = get_object_or_404(Blog, id=blog_id, author=request.user)
    serializer = BlogSerializer(blog, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_posts(request, user_id):
    """Get all posts for a specific user by ID"""
    user_obj = get_object_or_404(User, id=user_id)
    blogs = Blog.objects.filter(author=user_obj).order_by('-created_at')
    serializer = BlogSerializer(blogs, many=True, context={'request': request})
    return Response({'status': 'success', 'data': serializer.data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_profile(request, user_id):
    """Retrieve profile info for a specific user"""
    user_obj = get_object_or_404(User, id=user_id)
    serializer = UserSerializer(user_obj, context={'current_user': request.user})
    return Response({'status': 'success', 'data': serializer.data}, status=status.HTTP_200_OK)
