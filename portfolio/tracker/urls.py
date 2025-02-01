# tracker/urls.py
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import change_password, signup, login, logout, get_blogs, create_blog, delete_blog, blog_detail, user_profile

urlpatterns = [
    path('signup/', signup, name='signup'),
    path('login/', login, name='login'),
    path('logout/', logout, name='logout'),  # Add logout endpoint
    path('blogs/', get_blogs, name='get_blogs'),
    path('blogs/<int:pk>/', blog_detail, name='blog_detail'),
    path('blogs/create/', create_blog, name='create_blog'),
    path('blogs/delete/<int:blog_id>/', delete_blog, name='delete_blog'),
    path('profile/', user_profile, name='user_profile'),
    path('change-password/', change_password, name='change_password'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)