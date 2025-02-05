# tracker/urls.py
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import (
    change_password, signup, login, logout, 
    get_blogs, create_blog, delete_blog, 
    blog_detail, user_profile, user_blogs,
    blog_comments, delete_comment
)

urlpatterns = [
    path('signup/', signup, name='signup'),
    path('login/', login, name='login'),
    path('logout/', logout, name='logout'), 
    path('blogs/', get_blogs, name='get_blogs'),
    path('blogs/<int:pk>/', blog_detail, name='blog_detail'),
    path('blogs/create/', create_blog, name='create_blog'),
    path('blogs/delete/<int:blog_id>/', delete_blog, name='delete_blog'),
    path('profile/', user_profile, name='user_profile'),
    path('change-password/', change_password, name='change_password'),
    path('user-blogs/', user_blogs, name='user_blogs'),
    path('blogs/<int:blog_id>/comments/', blog_comments, name='blog_comments'),
    path('blogs/<int:blog_id>/comments/<int:comment_id>/', delete_comment, name='delete_comment'),
    
    # Public endpoints
    path('api/blogs/<int:pk>/', blog_detail, name='blog-detail'),
    
    # Protected endpoints
    path('api/blogs/<int:blog_id>/comments/', blog_comments, name='blog-comments'),
    path('api/comments/<int:comment_id>/', delete_comment, name='delete-comment'),  # Updated URL pattern
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)