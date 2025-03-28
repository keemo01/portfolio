from django.db.models import Q
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication

from tracker.models import Blog
from tracker.serializers import BlogSerializer, UserSerializer

# Search view to search for blogs and users
@api_view(['GET'])
@permission_classes([AllowAny])  # Allows anyone to access this view
def search(request):
    """
    Search for blogs and users
    Query parameters:
    - q: search query
    - type: 'blogs' or 'users' (optional)
    """
    query = request.GET.get('q', '')  # Get search query from request parameters
    search_type = request.GET.get('type', 'all')  # Get type of search ('blogs', 'users', or 'all')

    if not query:  # If no query is provided, return an error
        return Response({'detail': 'Please provide a search query'}, 
                       status=status.HTTP_400_BAD_REQUEST)

    response = {}

    # Search for blogs if type is 'all' or 'blogs'
    if search_type in ['all', 'blogs']:
        blogs = Blog.objects.filter(
            Q(title__icontains=query) |  # Search in blog title
            Q(content__icontains=query)  # Search in blog content
        )
        response['blogs'] = BlogSerializer(blogs, many=True, 
                                        context={'request': request}).data

    # Search for users if type is 'all' or 'users'
    if search_type in ['all', 'users']:
        users = User.objects.filter(
            Q(username__icontains=query) |  # Search in username
            Q(email__icontains=query)  # Search in email
        )
        response['users'] = UserSerializer(users, many=True).data

    return Response(response)  # Return the search results

# View to get user profile details by user ID
@api_view(['GET'])
@permission_classes([AllowAny])  # Allows anyone to access this view
def get_user_profile(request, user_id):
    """
    Get user profile details by user ID
    """
    try:
        user = User.objects.get(id=user_id)  # Get user by ID
        serializer = UserSerializer(user)  # Convert user data for the response
        return Response(serializer.data)  # Return the user data for the response
    except User.DoesNotExist:  # If user does not exist, return error
        return Response({'detail': 'User not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

# View to get all posts by a specific user
@api_view(['GET'])
@permission_classes([AllowAny])  # Allows anyone to access this view
def get_user_posts(request, user_id):
    """
    Get all posts by a specific user
    """
    try:
        user = User.objects.get(id=user_id)  # Get user by ID
        blogs = Blog.objects.filter(author=user)  # Get all blogs written by the user
        serializer = BlogSerializer(blogs, many=True, context={'request': request})  # Convert blog data for the response
    except User.DoesNotExist:  # If user does not exist, return error
        return Response({'detail': 'User not found'}, 
                       status=status.HTTP_404_NOT_FOUND)
