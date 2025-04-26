import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings

@api_view(['GET'])
@permission_classes([AllowAny])
def crypto_news(request):
    params = {
        'apiKey': settings.NEWSAPI_KEY,
        'q': 'cryptocurrency OR bitcoin OR crypto',
        'language': 'en',
        'sortBy': 'publishedAt',
        'pageSize': 8,
    }
    r = requests.get('https://newsapi.org/v2/everything', params=params)
    if r.status_code == 200:
        return Response(r.json().get('articles', []))
    return Response({'detail':'news fetch error'}, status=r.status_code)
