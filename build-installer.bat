@echo off
echo ========================================
echo Design Upload Manager - Build Installer
echo ========================================
echo.

echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b %errorlevel%
)
echo.

echo [2/3] Building application...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b %errorlevel%
)
echo.

echo [3/3] Creating installer...
call npm run electron:build
if %errorlevel% neq 0 (
    echo ERROR: Installer creation failed
    pause
    exit /b %errorlevel%
)
echo.

echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Installer location: release\Design Upload Manager-Setup-[version].exe
echo Update file location: release\latest.yml
echo.
echo Next steps:
echo 1. Update version number in package.json before next release
echo 2. Create a new GitHub Release with the version tag
echo 3. Upload both files to the GitHub Release
echo.
pause
