@echo off
echo Starting Django Backend on http://localhost:8000 ...
cd backend
python manage.py runserver 0.0.0.0:8000
pause
