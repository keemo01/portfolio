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

# Function is for signing up and making an account
@api_view(['POST'])
def signup(request):
    # This checks to make sure the user info is correct 
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        user = User.objects.get(username=request.data['username'])
        user.set_password(request.data['password']) # Stores the password
        user.save() # Saves the updated user info
        token = Token.objects.create(user=user) # This creates a unique token for each user so they can be identified with
        return Response({'token': token.key, 'user': serializer.data})
    # Returns back error if something is wrong
    return Response(serializer.errors, status=status.HTTP_200_OK)

# Function is used to sign the user in
@api_view(['POST'])
def login(request):
    #Find the user by the username 
    user = get_object_or_404(User, username=request.data['username'])
    #Checks to make sure the password entered matches the users password
    if not user.check_password(request.data['password']):
        return Response("missing user", status=status.HTTP_404_NOT_FOUND)
    token, created = Token.objects.get_or_create(user=user)
    serializer = UserSerializer(user)
    return Response({'token': token.key, 'user': serializer.data})

# This function checks if the user is logged in using their special key
@api_view(['GET'])
@authentication_classes([SessionAuthentication, TokenAuthentication])
@permission_classes([IsAuthenticated])
def test_token(request):
    # If the user is logged in, it sends back a confirmation message
    return Response("Authorization has passed! for {}".format(request.user.email))

# Class is meant to bring back real time data from binance
class BinanceRealtime(View):
    def get(self, request):
        url = 'https://api.binance.com/api/v3/ticker/24hr' # Binance API Data
        
        try:
            # Make request with timeout
            response = requests.get(url, timeout=5)
            response.raise_for_status()  # Raises an error for bad status codes
            
            #This Parses JSON response
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
                    continue  
            
            if not all_data:
                return JsonResponse(
                    {'error': 'No valid data received'}, 
                    status=500
                )
                
            return JsonResponse(all_data, safe=False, status=200)
        # Sends this message if there's a timeout error    
        except requests.Timeout:
            return JsonResponse(
                {'error': 'Request timed out'}, 
                status=504
            )
        # If there’s a connection error, it sends this error message    
        except requests.ConnectionError:
            return JsonResponse(
                {'error': 'Could not connect to Binance'}, 
                status=503
            )
        # If the response isn’t valid JSON, it lets the user know    
        except JSONDecodeError:
            return JsonResponse(
                {'error': 'Invalid JSON response'}, 
                status=502
            )
        # For any other errors, it'll send a generic error message    
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