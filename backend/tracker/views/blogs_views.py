import requests
from django.http import JsonResponse
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import api_view, authentication_classes, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.authentication import JWTAuthentication
from tracker.models import Blog, BlogMedia
from tracker.serializers import BlogSerializer, CommentSerializer
from tracker.models import Comment  
from urllib.parse import urlencode

# Blog Endpoints
@api_view(['GET'])
def get_blogs(request):
    blogs = Blog.objects.all().order_by('-created_at')
    serializer = BlogSerializer(blogs, many=True, context={'request': request})  # Pass request
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def blog_detail(request, pk):
    try:
        blog = Blog.objects.get(pk=pk)
        serializer = BlogSerializer(blog, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Blog.DoesNotExist:
        return Response({'detail': 'Blog not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
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
        for file in request.FILES.getlist('media'):
            BlogMedia.objects.create(blog=blog, file=file)
        # Return the complete blog data including media URLs:
        serializer = BlogSerializer(blog, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(blog_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_blog(request, blog_id):
    """
    Delete a blog post if it belongs to the authenticated user.
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
    
    Returns:
    - List of the user's blogs (ordered by creation date, newest first).
    - Total count of blogs.
    """
    try:
        print(f"Fetching blogs for user: {request.user.username}")  # Debugging log
        blogs = Blog.objects.filter(author=request.user).order_by('-created_at')  # Fetch user's blogs

        print(f"Found {blogs.count()} blogs")  # Debugging log
        
        # Convert the blogs to return JSON data
        serializer = BlogSerializer(blogs, many=True, context={'request': request})
        
        return Response({
            'blogs': serializer.data,
            'count': blogs.count()
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        print(f"Error in user_blogs: {str(e)}")  # Debugging log
        return Response(
            {'detail': f'Error fetching user blogs: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        
@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def blog_comments(request, blog_id):  # Changed parameter name to match URL
    blog = get_object_or_404(Blog, id=blog_id)
    if request.method == 'GET':
        # Get all comments, including the replies
        parent_comments = Comment.objects.filter(blog=blog, parent=None)
        serializer = CommentSerializer(parent_comments, many=True, context={'request': request})
        return Response(serializer.data)
    elif request.method == 'POST':
        # Create new comments
        serializer = CommentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(
                blog=blog,
                author=request.user,
                parent_id=request.data.get('parent')
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_comment(request, comment_id):
    """
    DELETE /api/comments/<comment_id>/
    """
    comment = get_object_or_404(Comment, id=comment_id)
    if comment.author != request.user:
        return Response(
            {'detail': 'You can only delete your own comments'},
            status=status.HTTP_403_FORBIDDEN
        )
    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

