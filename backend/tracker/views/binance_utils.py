import requests
import logging

logger = logging.getLogger(__name__)

def get_binance_price(coin):
    """
    Fetch the current price from Binance API
    """
    if coin.upper() == 'USDT':
        return 1.0
        
    try:
        url = f'https://api.binance.com/api/v3/ticker/price'
        params = {'symbol': f'{coin}USDT'}
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            return float(data['price'])
        return None
    except Exception as e:
        logger.error(f"Error fetching Binance price for {coin}: {e}")
        return None
