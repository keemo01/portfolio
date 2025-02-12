from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Blog, BlogMedia, Comment

# Serializer to handle User model data
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        # Ensures the password is only writable and not included in responses
        extra_kwargs = {'password': {'write_only': True}}

# Serializer to handle BlogMedia model, including media files with full URLs
class BlogMediaSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()  # Ensures full URL is returned for the media file

    class Meta:
        model = BlogMedia
        fields = ['file']

    # Method to get the absolute URL of the media file
    def get_file(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)  # Returns the full URL
        return obj.file.url  # Fallback to file URL if no request context is available

# Serializer to handle Blog model data, including associated media
class BlogSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()  # Represents author as a string (username)
    media = BlogMediaSerializer(many=True, read_only=True)  # Nested media serializer

    class Meta:
        model = Blog
        fields = ['id', 'title', 'content', 'author', 'created_at', 'media']

# Serializer to handle Comment model, including nested replies
class CommentSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()  # Represents author as a string (username)
    replies = serializers.SerializerMethodField()  # To fetch nested replies

    class Meta:
        model = Comment
        fields = ['id', 'author', 'content', 'created_at', 'parent', 'replies']

    # Method to get nested replies for a comment
    def get_replies(self, obj):
        replies = Comment.objects.filter(parent=obj)  # Find replies to the current comment
        serializer = CommentSerializer(replies, many=True, context=self.context)  # Serialize replies
        return serializer.data  # Return serialized replies
