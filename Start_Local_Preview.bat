@echo off
title MIS TA-DA Portal - Local Development Preview
color 0a

echo ===============================================================================
echo            MIS TA-DA PORTAL - LOCAL DEVELOPMENT PREVIEW
echo                 Designed by Dev. Anil Kumar Chahar (8126390611)
echo ===============================================================================
echo.
echo Starting local development server at http://localhost:5173 ...
echo Press Ctrl + C in this window to stop the server.
echo.

start "" "http://localhost:5173"
call npm run dev
