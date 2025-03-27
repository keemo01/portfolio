from django.db.models import Q
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication

from tracker.models import Blog
from tracker.serializers import BlogSerializer, UserSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def search(request):
    """
    Search for blogs and users
    Query parameters:
    - q: search query
    - type: 'blogs' or 'users' (optional)
    """
    query = request.GET.get('q', '')
    search_type = request.GET.get('type', 'all')

    if not query:
        return Response({'detail': 'Please provide a search query'}, 
                       status=status.HTTP_400_BAD_REQUEST)

    response = {}

    if search_type in ['all', 'blogs']:
        blogs = Blog.objects.filter(
            Q(title__icontains=query) |
            Q(content__icontains=query)
        )
        response['blogs'] = BlogSerializer(blogs, many=True, 
                                        context={'request': request}).data

    if search_type in ['all', 'users']:
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query)
        )
        response['users'] = UserSerializer(users, many=True).data

    return Response(response)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_profile(request, user_id):
    """
    Get user profile details by user ID
    """
    try:
        user = User.objects.get(id=user_id)
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_posts(request, user_id):
    """
    Get all posts by a specific user
    """
    try:
        user = User.objects.get(id=user_id)
        blogs = Blog.objects.filter(author=user)
        serializer = BlogSerializer(blogs, many=True, context={'request': request})
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, 
                       status=status.HTTP_404_NOT_FOUND)
