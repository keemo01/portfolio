from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Blog, BlogMedia, Comment


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

class BlogMediaSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = BlogMedia
        fields = ['file']

    def get_file(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None

class BlogSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(source='author.username')
    author_id = serializers.IntegerField(source='author.id', read_only=True)
    media = BlogMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Blog
        fields = ['id', 'title', 'content', 'author', 'author_id', 'created_at', 'media']
        
    def to_representation(self, instance):
        """
        Ensure media is always a list, even if empty
        """
        representation = super().to_representation(instance)
        representation['media'] = representation.get('media', [])
        return representation

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