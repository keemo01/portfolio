import requests
from django.http import JsonResponse
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import api_view, authentication_classes, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

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
    Delete a blog post if it belongs to the authenticated user.
    """
    blog = get_object_or_404(Blog, id=blog_id)  # Get the blog or return 404 if not found
    
    if blog.author != request.user:  # Makes the user is the owner of the Blog
        return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    blog.delete()  # Delete the blog
    return Response(status=status.HTTP_204_NO_CONTENT)  # Return success response

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
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def blog_comments(request, blog_id):
    blog = get_object_or_404(Blog, id=blog_id)
    if request.method == 'GET':
        # Get all comments, including the replies
        parent_comments = Comment.objects.filter(blog=blog, parent=None)
        serializer = CommentSerializer(parent_comments, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        # Create new comments
        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                blog=blog,
                author=request.user,
                parent_id=request.data.get('parent')  # Allow for replies
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def delete_comment(request, comment_id):
    """
    DELETE /api/comments/<comment_id>/
    """
    try:
        comment = get_object_or_404(Comment, id=comment_id)
        
        # Check if user is authorized to delete the comment
        if comment.author != request.user:
            return Response(
                {'detail': 'You can only delete your own comments'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Delete the comment and its replies
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Comment.DoesNotExist:
        return Response({'detail': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
