from django.core.management.base import BaseCommand
from tracker.models import PortfolioHistory
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Change coin keys in PortfolioHistory records to uppercase'

    def handle(self, *args, **kwargs):
        count = 0
        for history in PortfolioHistory.objects.all():
            if history.coin_values:
                old_values = history.coin_values
                new_values = {k.upper(): v for k, v in old_values.items()}
                
                if old_values != new_values:
                    history.coin_values = new_values
                    history.save()
                    count += 1
                    
        self.stdout.write(self.style.SUCCESS(
            f'Successfully Changed {count} PortfolioHistory records'
        ))
