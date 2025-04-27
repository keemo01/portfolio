from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from cloudinary_storage.storage import MediaCloudinaryStorage
from tracker.models import BlogMedia

class Command(BaseCommand):
    help = "Upload existing local media files up to Cloudinary"

    def handle(self, *args, **options):
        local = FileSystemStorage(location=settings.MEDIA_ROOT)
        cloud = MediaCloudinaryStorage()
        for media in BlogMedia.objects.all():
            orig_name = media.file.name 

            # Skip if files on Cloudinary
            if media.file.url.startswith("https://res.cloudinary.com"):
                self.stdout.write(f"✔ already on Cloudinary: {orig_name}")
                continue

            # skip if files on local
            if not local.exists(orig_name):
                self.stdout.write(self.style.WARNING(f"⚠ missing locally: {orig_name}"))
                continue

            # Upload to Cloudinary
            with local.open(orig_name, "rb") as f:
                new_name = cloud.save(orig_name, f)

            # Update the files name to the Cloudinary URL
            media.file.name = new_name
            media.save(update_fields=["file"])
            self.stdout.write(self.style.SUCCESS(f"↑ migrated {orig_name} → {new_name}"))
