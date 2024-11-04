import requests
from django.http import JsonResponse
from django.views import View
from requests.exceptions import RequestException
from json.decoder import JSONDecodeError

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