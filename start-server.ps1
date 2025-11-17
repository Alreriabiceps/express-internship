# Set environment variables
$env:JWT_SECRET = "your-super-secret-jwt-key-for-development-12345"
$env:MONGODB_URI = "mongodb+srv://ecainternship1:coqWBAfvldNb4GUj@cluster0.muqh00a.mongodb.net/ecainternship?retryWrites=true&w=majority"
$env:PORT = "5000"
$env:NODE_ENV = "development"

Write-Host "🚀 Starting backend server with environment variables..."
Write-Host "JWT_SECRET: SET"
Write-Host "MONGODB_URI: SET"
Write-Host "PORT: 5000"
Write-Host ""

# Start the server
node server.js

