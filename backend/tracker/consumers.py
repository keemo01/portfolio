import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from decimal import Decimal
from .views.portfolio_utils import calculate_portfolio_metrics, aggregate_portfolio_holdings
import aiohttp

class PortfolioConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.price_update_task = None
        
        if self.user.is_authenticated:
            await self.accept()
            self.price_update_task = asyncio.create_task(self.periodic_price_updates())
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.price_update_task:
            self.price_update_task.cancel()
            try:
                await self.price_update_task
            except asyncio.CancelledError:
                pass

    async def periodic_price_updates(self):
        while True:
            try:
                portfolio_data = await self.get_portfolio_data()
                if portfolio_data:
                    updated_data = await self.update_prices(portfolio_data)
                    consolidated = aggregate_portfolio_holdings(updated_data)
                    metrics = calculate_portfolio_metrics(consolidated)
                    
                    metrics_json = {
                        'total_value': float(metrics['total_value']),
                        'total_cost': float(metrics['total_cost']),
                        'total_pnl_percentage': float(metrics['total_pnl_percentage']),
                        'allocation': metrics['allocation'],
                        'exchange_distribution': {k: float(v) for k, v in metrics['exchange_distribution'].items()},
                        'pnl': {k: {pk: float(pv) for pk, pv in v.items()} for k, v in metrics['pnl'].items()}
                    }
                    
                    await self.send(text_data=json.dumps({
                        'type': 'portfolio_update',
                        'data': metrics_json
                    }))
            except Exception as e:
                print(f"Error in price update: {str(e)}")
            
            # Wait for 2 seconds before the next update
            await asyncio.sleep(2)

    @database_sync_to_async
    def get_portfolio_data(self):
        # Fetch  holdings
        from tracker.models import PortfolioHolding, APIKey
        import time, hmac, hashlib
        from urllib.parse import urlencode
        portfolio_data = []
        manual_holdings = PortfolioHolding.objects.filter(user=self.user)
        for hold in manual_holdings:
            portfolio_data.append({
                'exchange': 'Manual',
                'account_type': 'Manual',
                'coin': hold.coin.upper(),
                'amount': str(hold.amount),
                'current_price': 0,  # Recalculated after price update
                'current_value': 0,  # Recalculated after price update
                'transferable': str(hold.amount),
                'original_value': hold.amount * hold.purchase_price
            })
        
        # Fetch API keys
        # and holdings from exchanges
        try:
            api_keys = APIKey.objects.get(user=self.user)
            # Binance holdings
            if api_keys.binance_api_key and api_keys.binance_secret_key:
                timestamp = str(int(time.time() * 1000))
                params = {'timestamp': timestamp, 'recvWindow': '5000'}
                query_string = urlencode(params)
                signature = hmac.new(
                    api_keys.binance_secret_key.encode('utf-8'),
                    query_string.encode('utf-8'),
                    hashlib.sha256
                ).hexdigest()
                binance_url = f"https://api.binance.com/api/v3/account?{query_string}&signature={signature}"
                headers = {'X-MBX-APIKEY': api_keys.binance_api_key}
                try:
                    resp = __import__("requests").get(binance_url, headers=headers, timeout=10)
                    data = resp.json()
                    for balance in data.get('balances', []):
                        amount = float(balance.get("free", 0)) + float(balance.get("locked", 0))
                        if amount > 0:
                            portfolio_data.append({
                                'exchange': 'Binance',
                                'account_type': 'Spot',
                                'coin': balance['asset'],
                                'amount': str(amount),
                                'current_price': 0,  # 
                                'current_value': 0,
                                'transferable': balance.get("free", "0"),
                                'original_value': None
                            })
                except Exception as e:
                    # Log or pass on Binance errors in this context
                    pass

            # Bybit holdings
            if api_keys.bybit_api_key and api_keys.bybit_secret_key:
                # Import the synchronous version from our portfolio views
                from tracker.views.portfolio_views import get_bybit_holdings
                bybit_holdings = get_bybit_holdings(api_keys.bybit_api_key, api_keys.bybit_secret_key)
                for holding in bybit_holdings:
                    amount = float(holding['amount'])
                    portfolio_data.append({
                        'exchange': 'Bybit',
                        'account_type': holding['account_type'],
                        'coin': holding['coin'],
                        'amount': str(amount),
                        'current_price': 0,  # Placeholder; will be updated later
                        'current_value': 0,
                        'transferable': str(holding['transferable']),
                        'original_value': holding['original_value']
                    })
        except Exception:
            pass

        return portfolio_data

    async def update_prices(self, portfolio_data):
        updated_data = []
        async with aiohttp.ClientSession() as session:
            for holding in portfolio_data:
                coin = holding['coin']
                try:
                    binance_url = f"https://api.binance.com/api/v3/ticker/price?symbol={coin}USDT"
                    async with session.get(binance_url) as response:
                        if response.status == 200:
                            price_data = await response.json()
                            holding['current_price'] = float(price_data['price'])
                            holding['current_value'] = holding['current_price'] * float(holding['amount'])
                except Exception:
                    pass
                updated_data.append(holding)
        return updated_data
