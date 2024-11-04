from django.urls import path
from .views import BinanceRealtime

urlpatterns = [
    path('coins/', BinanceRealtime.as_view(), name='get_binance_data'),  # Use the class-based view
]
