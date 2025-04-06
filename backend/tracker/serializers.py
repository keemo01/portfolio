from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Blog, BlogMedia, Bookmark, Comment


class UserSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source='first_name', required=True)
    lastName = serializers.CharField(source='last_name', required=True)
    dob = serializers.DateField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'firstName', 'lastName', 'dob')
        read_only_fields = ('id',)

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        if 'dob' in validated_data:
            user.dob = validated_data['dob']
        user.save()
        return user

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation.update({
            'id': instance.id,
            'username': instance.username,
            'email': instance.email,
            'firstName': instance.first_name,
            'lastName': instance.last_name,
            'dob': getattr(instance, 'dob', None)
        })
        return representation


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
    author = serializers.SerializerMethodField()
    author_id = serializers.SerializerMethodField()
    media = BlogMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Blog
        fields = ['id', 'title', 'content', 'author', 'author_id', 'created_at', 'media']
    
    def get_author(self, obj):
        if obj.author:
            return obj.author.username
        return None
    
    def get_author_id(self, obj):
        if obj.author:
            return obj.author.id
        return None
        
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

class BookmarkSerializer(serializers.ModelSerializer):
    # Display the blog details using your existing BlogSerializer
    blog = BlogSerializer(read_only=True)
    # Allow posting a bookmark by specifying the blog id
    blog_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Bookmark
        fields = ['id', 'blog', 'blog_id', 'created_at']