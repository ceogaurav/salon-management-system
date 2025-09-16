@echo off
echo ========================================
echo    Salon Management System 
echo    GitHub Upload Helper
echo ========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo Step 1: Cleaning up any existing git locks...
if exist ".git\index.lock" (
    del ".git\index.lock"
    echo   - Removed git lock file
)

echo.
echo Step 2: Initializing git repository...
if not exist ".git" (
    git init
    echo   - Git repository initialized
) else (
    echo   - Git repository already exists
)

echo.
echo Step 3: Adding all files (this respects .gitignore)...
git add .
echo   - Files added to staging area

echo.
echo Step 4: Creating initial commit...
git commit -m "Initial commit: Complete salon management system for Vercel deployment"
if errorlevel 1 (
    echo   - No changes to commit or commit failed
) else (
    echo   - Commit created successfully
)

echo.
echo Step 5: Setting up remote repository...
echo PLEASE REPLACE 'YOUR_USERNAME' WITH YOUR ACTUAL GITHUB USERNAME:
echo.
echo Example commands (replace YOUR_USERNAME):
echo   git remote add origin https://github.com/YOUR_USERNAME/salon-management-system.git
echo   git branch -M main
echo   git push -u origin main
echo.

REM Try to get current remote
git remote -v 2>nul
if errorlevel 1 (
    echo No remote repository configured yet.
    echo Please run the commands above with your GitHub username.
) else (
    echo Current remote repository:
    git remote -v
    echo.
    echo To push your changes, run: git push
)

echo.
echo ========================================
echo Next Steps:
echo 1. Copy the git remote add command above
echo 2. Replace YOUR_USERNAME with your GitHub username  
echo 3. Run the commands in order
echo 4. Your project will be uploaded to GitHub!
echo 5. Then deploy on Vercel from GitHub
echo ========================================
pause