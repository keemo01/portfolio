from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from tracker.models import Follow
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def follow_user(request, user_id):
    """
    I created this view to enable an authenticated user to follow another user.
    The endpoint accepts a POST request and expects a valid JWT token.
    """
    try:
        # Attempted to retrieve the target user based on the provided user_id
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        # If the user does not exist, return a 404 response
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Ensured that users are not allowed to follow themselves
    if request.user == target_user:
        return Response({'detail': 'You cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)

    # Checked if the follow relationship already exists
    if Follow.objects.filter(follower=request.user, following=target_user).exists():
        return Response({'detail': 'Already following this user'}, status=status.HTTP_400_BAD_REQUEST)

    # Created the new follow relationship
    follow_relation = Follow.objects.create(follower=request.user, following=target_user)
    return Response({
        'detail': f'Now following {target_user.username}',
        'follow_id': follow_relation.id
    }, status=status.HTTP_201_CREATED)
    
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def unfollow_user(request, user_id):
    """
    I designed this view to allow an authenticated user to unfollow another user.
    It confirms the existence of the follow relationship and then deletes it.
    """
    try:
        # Retrieve the target user based on the user_id
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        # If the target user does not exist,  return a 404 error
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Locate the follow relationship if it exists
    follow_relation = Follow.objects.filter(follower=request.user, following=target_user).first()
    if not follow_relation:
        # If no such relationship exists, I notify the requester with a 400 response.
        return Response({'detail': 'You are not following this user'}, status=status.HTTP_400_BAD_REQUEST)

    # Delete the follow record to effectively "unfollow" the target user.
    follow_relation.delete()
    return Response({'detail': f'Unfollowed {target_user.username}'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def user_followers(request, user_id):
    """
    I implemented this endpoint to retrieve the list of followers for a given user.
    The result includes basic information about each follower, making it useful for profile displays.
    """
    try:
        # Obtained the target user whose followers need to be listed.
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        # If the target user is not found, respond with a 404 error.
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Accessed the related Follow records via the 'followers' related name.
    followers = target_user.followers.all()
    data = [{
        'id': f.follower.id,
        'username': f.follower.username
    } for f in followers]

    return Response({'followers': data}, status=status.HTTP_200_OK)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def user_following(request, user_id):
    """
    I created this endpoint to retrieve the list of users that a given user is following.
    This information is valuable when one wants to inspect the social graph of a particular user.
    """
    try:
        # I retrieve the target user based on user_id.
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        # I return a 404 response if the user does not exist.
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # I retrieve the Follow relationships via the 'following' related name.
    following = target_user.following.all()
    data = [{
        'id': f.following.id,
        'username': f.following.username
    } for f in following]

    return Response({'following': data}, status=status.HTTP_200_OK)
