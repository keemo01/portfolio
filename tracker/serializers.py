from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Blog, BlogMedia, Bookmark, Comment, Community

class UserSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source='first_name', required=True)
    lastName = serializers.CharField(source='last_name', required=True)
    dob = serializers.DateField(required=False, allow_null=True)
    followers_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'firstName', 'lastName', 'dob', 'followers_count', 'is_following')
        read_only_fields = ('id',)

    def get_followers_count(self, obj):
        # Used the related name 'followers' to accurately count the number of followers
        return obj.followers.count()

    def get_is_following(self, obj):
        # Retrieved the current user from the context to determine if they follow the profile in question
        current_user = self.context.get('current_user')
        if current_user and current_user.is_authenticated:
            # Here, I filter on the Follow model's 'follower' field to verify the relationship
            return obj.followers.filter(follower__id=current_user.id).exists()
        return False

    def create(self, validated_data):
        # Utilizing Django's create_user method to ensure proper password hashing and secure user creation
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
        # Iterated over the validated data to update the user instance. This allows for flexible partial updates
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def to_representation(self, instance):
        # Used the to_representation method to customize the output format of the user data
        representation = super().to_representation(instance)
        representation.update({
            'id': instance.id,
            'username': instance.username,
            'email': instance.email,
            'firstName': instance.first_name,
            'lastName': instance.last_name,
            'dob': getattr(instance, 'dob', None),
            'followers_count': instance.followers.count(),
            'is_following': self.get_is_following(instance)
        })
        return representation


class BlogMediaSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = BlogMedia
        fields = ['file']

    def get_file(self, obj):
        # Built an absolute URL for media files if a request is present, to provide complete URLs
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
        # Returned the username of the blog author for clarity in the frontend
        if obj.author:
            return obj.author.username
        return None
    
    def get_author_id(self, obj):
        # Made the author's ID available, which may be useful for navigation or further queries
        if obj.author:
            return obj.author.id
        return None
        
    def to_representation(self, instance):
        # Ensured that the media field is always returned as a list, even if it is empty
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
        # Recursively serialize any replies to ensure that nested comments are properly handled
        replies = Comment.objects.filter(parent=obj)
        serializer = CommentSerializer(replies, many=True, context=self.context)
        return serializer.data


class BookmarkSerializer(serializers.ModelSerializer):
    # Displayed the associated blog details by using the existing BlogSerializer
    blog = BlogSerializer(read_only=True)
    # Included the blog ID for easier reference in the frontend
    blog_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Bookmark
        fields = ['id', 'blog', 'blog_id', 'created_at']

class CommunitySerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    class Meta:
        model = Community
        fields = ['id', 'name', 'description', 'owner', 'created_at']