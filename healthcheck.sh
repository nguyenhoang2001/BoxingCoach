#!/bin/sh
# Health check script for Human Pose Detection and Motion Tracking Application

# Check if nginx is running
if ! pgrep nginx > /dev/null; then
    echo "ERROR: nginx is not running"
    exit 1
fi

# Check if the application is responding
if ! curl -f http://localhost/health > /dev/null 2>&1; then
    echo "ERROR: Application health check failed"
    exit 1
fi

# Check if static files are accessible
if ! curl -f http://localhost/index.html > /dev/null 2>&1; then
    echo "ERROR: Static files not accessible"
    exit 1
fi

# Check if TensorFlow.js models are accessible
if ! curl -f http://localhost/models/ > /dev/null 2>&1; then
    echo "WARNING: TensorFlow.js models may not be accessible"
fi

echo "Health check passed"
exit 0