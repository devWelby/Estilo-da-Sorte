@echo off
set FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9399
set FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5301
set FIRESTORE_EMULATOR_HOST=127.0.0.1:8388
node tests/helpers/seedTestData.js > functions-test-output.log 2>&1
if errorlevel 1 exit /b 1
npx mocha tests/functions/functions.emulator.test.js --timeout 30000 --reporter spec >> functions-test-output.log 2>&1
