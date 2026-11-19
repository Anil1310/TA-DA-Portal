@echo off
setlocal enabledelayedexpansion
title MIS TA-DA Portal - 1-Click Cloud Deployer
color 0b

echo ===============================================================================
echo            MIS TA-DA PORTAL - 1-CLICK GOOGLE CLOUD DEPLOYMENT
echo                 Designed by Dev. Anil Kumar Chahar (8126390611)
echo ===============================================================================
echo.

echo [1/3] Compiling React Production Bundle (Vite)...
call npm run build
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Vite build failed! Check errors above.
    pause
    exit /b %errorlevel%
)
echo [OK] React production bundle compiled successfully!
echo.

echo [2/3] Inlining HTML, CSS, and JS into Google Apps Script Bundle...
call node scripts/inline-for-appscript.js
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Inlining script failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Standalone Apps Script bundle generated!
echo.

echo [3/3] Pushing Code to Google Apps Script (Clasp Push)...
call npx @google/clasp push --force
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Clasp push failed! Check internet connection or Google login.
    pause
    exit /b %errorlevel%
)

color 0a
echo.
echo ===============================================================================
echo   SUCCESS! MIS TA-DA PORTAL DEPLOYED LIVE TO GOOGLE CLOUD!
echo ===============================================================================
echo.
echo Your changes are now live on your Google Apps Script Web App.
echo.
pause
