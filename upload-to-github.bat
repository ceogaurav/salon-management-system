@echo off
echo Starting Git setup and deployment...

REM Remove git lock file if it exists
if exist ".git\index.lock" del ".git\index.lock"

REM Initialize git if not already done
if not exist ".git" (
    git init
    echo Git repository initialized
)

REM Add files (this will respect .gitignore)
git add .

REM Commit
git commit -m "Initial commit: Salon Management System ready for Vercel"

REM Add remote origin (replace YOUR_USERNAME with your GitHub username)
echo.
echo IMPORTANT: Replace YOUR_USERNAME with your actual GitHub username in the next command
echo Example: git remote add origin https://github.com/johndoe/salon-management-system.git
echo.
echo git remote add origin https://github.com/YOUR_USERNAME/salon-management-system.git

REM Instructions for user
echo.
echo Next steps:
echo 1. Replace YOUR_USERNAME in the command above with your GitHub username
echo 2. Run that command
echo 3. Run: git branch -M main
echo 4. Run: git push -u origin main
echo.
echo Your project will then be uploaded to GitHub!

pause