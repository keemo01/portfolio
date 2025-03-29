from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

from tracker.views import user_views as views

def home(request):
    return HttpResponse("Welcome to the Crypto Portfolio Tracker API! Visit /api/coins/ for coin data.")

urlpatterns = [
    path('', home, name='home'),  # home URL
    path('admin/', admin.site.urls),  # Admin interface
    path('api/', include('tracker.urls')),  # Include routes from the tracker app
    re_path('login', views.login),
    re_path('signup', views.signup),
    re_path('test_token', views.test_token),
    # Add explicit media serving URL pattern
    re_path(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT,
    }),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)