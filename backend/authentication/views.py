from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        # Get the token from the request
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({'error': 'No valid token provided'}, status=401)
        
        token = auth_header.split(' ')[1]
        
        # Blacklist or invalidate the token if you're using JWT
        # If using Knox or similar:
        request.user.auth_token.delete()
        
        return Response({'message': 'Successfully logged out'}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)