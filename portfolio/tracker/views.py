import requests
from django.http import JsonResponse
from django.views import View
from requests.exceptions import RequestException
from rest_framework. decorators import api_view
from rest_framework. response  import Response
from json.decoder import JSONDecodeError

from .serializers import UserSerializer
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

from rest_framework.decorators import authentication_classes, permission_classes
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated

@api_view(['POST'])
def signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        user = User.objects.get(username=request.data['username'])
        user.set_password(request.data['password'])
        user.save()
        token = Token.objects.create(user=user)
        return Response({'token': token.key, 'user': serializer.data})
    return Response(serializer.errors, status=status.HTTP_200_OK)

@api_view(['POST'])
def login(request):
    user = get_object_or_404(User, username=request.data['username'])
    if not user.check_password(request.data['password']):
        return Response("missing user", status=status.HTTP_404_NOT_FOUND)
    token, created = Token.objects.get_or_create(user=user)
    serializer = UserSerializer(user)
    return Response({'token': token.key, 'user': serializer.data})

@api_view(['GET'])
@authentication_classes([SessionAuthentication, TokenAuthentication])
@permission_classes([IsAuthenticated])
def test_token(request):
    return Response("Authorization has passed! for {}".format(request.user.email))

class BinanceRealtime(View):
    def get(self, request):
        url = 'https://api.binance.com/api/v3/ticker/24hr'
        
        try:
            # Make request with timeout
            response = requests.get(url, timeout=5)
            response.raise_for_status()  # Raises an error for bad status codes
            
            # Parse JSON response
            data = response.json()
            
            # Format data
            all_data = []
            for coin in data:
                try:
                    coin_data = {
                        'symbol': coin['symbol'],
                        'price': coin['lastPrice'],
                        'change': coin['priceChangePercent'],
                        'timestamp': coin['closeTime']
                    }
                    all_data.append(coin_data)
                except KeyError:
                    continue  # Skip malformed coin data
            
            if not all_data:
                return JsonResponse(
                    {'error': 'No valid data received'}, 
                    status=500
                )
                
            return JsonResponse(all_data, safe=False, status=200)
            
        except requests.Timeout:
            return JsonResponse(
                {'error': 'Request timed out'}, 
                status=504
            )
            
        except requests.ConnectionError:
            return JsonResponse(
                {'error': 'Could not connect to Binance'}, 
                status=503
            )
            
        except JSONDecodeError:
            return JsonResponse(
                {'error': 'Invalid JSON response'}, 
                status=502
            )
            
        except RequestException as e:
            return JsonResponse(
                {'error': f'API request failed: {str(e)}'}, 
                status=500
            )
            
        except Exception as e:
            return JsonResponse(
                {'error': 'An unexpected error occurred'}, 
                status=500
            )