from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

from tracker.views import user_views as views
from tracker.views.user_views import CustomTokenObtainPairView

def home(request):
    return HttpResponse("Welcome to the Crypto Portfolio Tracker API! Visit /api/coins/ for coin data.")

urlpatterns = [
    path('', home, name='home'),                    
    path('admin/', admin.site.urls),                
    path('api/', include('tracker.urls')),           

    # Authentication at root
    path('auth/', include([
        re_path(r'^login/?$',       CustomTokenObtainPairView.as_view(), name='login'),
        re_path(r'^signup/?$',      views.signup,            name='signup'),
        re_path(r'^test-token/?$',  views.test_token,        name='test_token'),
    ])),

    # Static and media files
    re_path(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT,
    }),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
