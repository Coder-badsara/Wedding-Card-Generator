from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CardProjectViewSet, GenerationBatchViewSet, GeneratedCardViewSet, FontListView, TransliterateView

router = DefaultRouter()
router.register(r'projects', CardProjectViewSet, basename='project')
router.register(r'batches', GenerationBatchViewSet, basename='batch')
router.register(r'cards', GeneratedCardViewSet, basename='card')

urlpatterns = [
    path('fonts/', FontListView.as_view(), name='font-list'),
    path('transliterate/', TransliterateView.as_view(), name='transliterate'),
    path('', include(router.urls)),
]
