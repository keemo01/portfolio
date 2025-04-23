from collections import defaultdict
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

def aggregate_portfolio_holdings(holdings_list):
    """
    Aggregates holdings from multiple sources into a consolidated portfolio view
    holdings_list: List of dictionaries containing holdings from different sources
    """
    consolidated = defaultdict(lambda: {
        'total_amount': Decimal('0'),
        'total_value': Decimal('0'),
        'current_price': None,
        'sources': [],
        'transferable': Decimal('0'),
        'original_value': Decimal('0')
    })

    for holding in holdings_list:
        coin = holding['coin'].upper()
        amount = Decimal(str(holding['amount']))
        current_value = Decimal(str(holding['current_value']))
        
        entry = consolidated[coin]
        entry['total_amount'] += amount
        entry['total_value'] += current_value
        entry['current_price'] = Decimal(str(holding['current_price']))
        entry['transferable'] += Decimal(str(holding['transferable']))
        
        # Track original value if available
        orig_val = holding.get('original_value')
        if orig_val is not None and Decimal(str(orig_val)) > 0:
            entry['original_value'] += Decimal(str(orig_val))
        
        # Track source info
        entry['sources'].append({
            'exchange': holding['exchange'],
            'account_type': holding['account_type'],
            'amount': amount,
            'value': current_value
        })

    return consolidated

def calculate_portfolio_metrics(consolidated_holdings):
    """
    Calculates key portfolio metrics from consolidated holdings with improved P&L tracking
    """
    metrics = {
        'total_value': Decimal('0'),
        'total_cost': Decimal('0'),
        'pnl': defaultdict(lambda: {
            'absolute': Decimal('0'),
            'percentage': Decimal('0'),
            'realized': Decimal('0'),
            'unrealized': Decimal('0')
        }),
        'allocation': [],
        'exchange_distribution': defaultdict(Decimal),
        'total_pnl_percentage': Decimal('0')
    }
    
    for coin, data in consolidated_holdings.items():
        metrics['total_value'] += data['total_value']
        
        if data['original_value']:
            metrics['total_cost'] += data['original_value']
            pnl_absolute = data['total_value'] - data['original_value']
            pnl_percentage = (pnl_absolute / data['original_value'] * 100) if data['original_value'] > 0 else Decimal('0')
            
            metrics['pnl'][coin] = {
                'absolute': pnl_absolute,
                'percentage': pnl_percentage,
                'unrealized': pnl_absolute,  # Assuming unrealized is the same as absolute for now
                'realized': Decimal('0')       # Realized P&L is not tracked in this context
            }
        
        # Track exchange distribution
        for source in data['sources']:
            metrics['exchange_distribution'][source['exchange']] += source['value']
    
    if metrics['total_value'] > 0:
        for coin, data in consolidated_holdings.items():
            percentage = (data['total_value'] / metrics['total_value']) * 100
            pnl_data = metrics['pnl'][coin]
            
            metrics['allocation'].append({
                'coin': coin,
                'percentage': float(percentage),
                'value': float(data['total_value']),
                'original_value': float(data['original_value']) if data['original_value'] else None,
                'pnl_absolute': float(pnl_data['absolute']),
                'pnl_percentage': float(pnl_data['percentage']),
                'price': float(data['current_price'])
            })
    
    if metrics['total_cost'] > 0:
        total_pnl = metrics['total_value'] - metrics['total_cost']
        metrics['total_pnl_percentage'] = (total_pnl / metrics['total_cost'] * 100)
    
    return metrics

