#!/bin/bash
set -e

echo "=== Simulating GitHub Actions Frontend Tests ==="
echo ""

echo "Step 1: Run linting"
npm run lint
if [ $? -eq 0 ]; then
    echo "✅ Linting passed"
else
    echo "❌ Linting failed"
    exit 1
fi

echo ""
echo "Step 2: Run type checking"
npm run type-check
if [ $? -eq 0 ]; then
    echo "✅ Type checking passed"
else
    echo "❌ Type checking failed"
    exit 1
fi

echo ""
echo "Step 3: Run unit tests"
npm run test:ci
if [ $? -eq 0 ]; then
    echo "✅ Unit tests passed"
else
    echo "❌ Unit tests failed"
    exit 1
fi

echo ""
echo "Step 4: Build application"
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "=== All CI checks passed\! ✅ ==="
