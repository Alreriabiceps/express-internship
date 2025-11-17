@echo off
set JWT_SECRET=dev-secret-key-12345
set MONGODB_URI=mongodb+srv://ecainternship1:coqWBAfvldNb4GUj@cluster0.muqh00a.mongodb.net/ecainternship?retryWrites=true^&w=majority
set PORT=5000
set NODE_ENV=development

echo ========================================
echo Starting Backend Server
echo ========================================
echo JWT_SECRET: SET
echo MONGODB_URI: SET  
echo PORT: 5000
echo ========================================
echo.

node server.js

