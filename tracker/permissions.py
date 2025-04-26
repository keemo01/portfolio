from rest_framework import permissions
from .models import APIKey

class IsAPIKeyOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of an API key to access it.
    """
    def has_object_permission(self, request, view, obj):
        # Check if user is trying to access their own API keys
        if isinstance(obj, APIKey):
            return obj.user == request.user
        
        # For other objects, check if user is authenticated
        return request.user.is_authenticated

    def has_permission(self, request, view):
        # Allow authenticated users to list/create
        return request.user.is_authenticated
