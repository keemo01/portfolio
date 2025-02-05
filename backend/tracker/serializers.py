from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Blog, BlogMedia, Comment

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

class BlogMediaSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()  # Ensures full URL is returned

    class Meta:
        model = BlogMedia
        fields = ['file']

    def get_file(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url

class BlogSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()
    media = BlogMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Blog
        fields = ['id', 'title', 'content', 'author', 'created_at', 'media']

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'author', 'content', 'created_at', 'parent', 'replies']

    def get_replies(self, obj):
        replies = Comment.objects.filter(parent=obj)
        serializer = CommentSerializer(replies, many=True, context=self.context)
        return serializer.data