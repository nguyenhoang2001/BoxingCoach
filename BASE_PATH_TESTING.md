# BASE_PATH Testing Documentation

## Overview

This document provides comprehensive testing instructions for the gait-detection container's BASE_PATH functionality. The container is designed to work with various subpath deployments by using runtime configuration.

## 🎯 Test Objectives

Verify that the gait-detection container works correctly with different BASE_PATH configurations:

- ✅ Static asset serving (JS, CSS, images)
- ✅ Health check endpoints  
- ✅ Application routing (SPA)
- ✅ Nginx configuration processing
- ✅ Runtime path injection
- ✅ Non-privileged operation

## 📋 Test Scenarios

| Test Case | BASE_PATH | Port | Description |
|-----------|-----------|------|-------------|
| **Root** | `/` | 8080 | Default root path deployment |
| **Gait** | `/gait` | 8081 | Current production configuration |
| **App** | `/app` | 8082 | Simple subpath |
| **Nested** | `/deeply/nested/path` | 8083 | Multi-level nested path |
| **Special** | `/test-with-hyphens` | 8084 | Hyphenated path |
| **API** | `/api/v1/gait` | 8085 | API-style versioned path |
| **Underscore** | `/gait_detection` | 8086 | Underscore in path |

## 🛠️ Testing Tools

### 1. Configuration Validation (validate-base-path-config.sh)

**Purpose**: Validates configuration files without running containers

```bash
# Run validation
./validate-base-path-config.sh

# Expected output: All validations pass ✅
```

**What it checks**:
- ✅ Nginx configuration template syntax
- ✅ Docker entrypoint script logic
- ✅ Dockerfile security settings
- ✅ Test configuration completeness
- ✅ BASE_PATH processing simulation

### 2. Container Testing (test-base-path.sh)

**Purpose**: Builds and tests container with multiple BASE_PATH values

```bash
# Run all tests
./test-base-path.sh

# Clean up after testing
./test-base-path.sh clean

# Show help
./test-base-path.sh help
```

**What it tests**:
- 🔥 Container startup and health
- 🌐 HTTP endpoint responses
- 📁 Static asset loading
- 🖥️ Application functionality
- ⚙️ Configuration processing

### 3. Docker Compose Configuration (docker-compose.test.yml)

**Purpose**: Defines test scenarios with different BASE_PATH values

```bash
# Test specific scenarios
docker-compose -f docker-compose.test.yml --profile test-root up
docker-compose -f docker-compose.test.yml --profile test-gait up
docker-compose -f docker-compose.test.yml --profile test-app up
```

## 🔧 Manual Testing Instructions

### Step 1: Build the Container

```bash
cd /path/to/gait-detection
docker build -t gait-detection-test:latest .
```

### Step 2: Test Individual Scenarios

#### Test ROOT path (BASE_PATH=/)
```bash
docker run -d -p 8080:8080 -e BASE_PATH=/ --name gait-test-root gait-detection-test:latest

# Test endpoints
curl http://localhost:8080/health                    # Health check
curl http://localhost:8080/                          # Main app
curl http://localhost:8080/image.png                 # Static asset
curl http://localhost:8080/manifest.json             # PWA manifest

# Cleanup
docker stop gait-test-root && docker rm gait-test-root
```

#### Test GAIT path (BASE_PATH=/gait)
```bash
docker run -d -p 8081:8080 -e BASE_PATH=/gait --name gait-test-gait gait-detection-test:latest

# Test endpoints
curl http://localhost:8081/gait/health               # Health check
curl http://localhost:8081/gait/                     # Main app
curl http://localhost:8081/gait/image.png            # Static asset
curl http://localhost:8081/gait/manifest.json        # PWA manifest

# Cleanup
docker stop gait-test-gait && docker rm gait-test-gait
```

#### Test NESTED path (BASE_PATH=/deeply/nested/path)
```bash
docker run -d -p 8083:8080 -e BASE_PATH=/deeply/nested/path --name gait-test-nested gait-detection-test:latest

# Test endpoints
curl http://localhost:8083/deeply/nested/path/health          # Health check
curl http://localhost:8083/deeply/nested/path/                # Main app
curl http://localhost:8083/deeply/nested/path/image.png       # Static asset
curl http://localhost:8083/deeply/nested/path/manifest.json   # PWA manifest

# Cleanup
docker stop gait-test-nested && docker rm gait-test-nested
```

### Step 3: Browser Testing

After starting a container, open your browser to:

- **Root**: http://localhost:8080/
- **Gait**: http://localhost:8081/gait/
- **App**: http://localhost:8082/app/
- **Nested**: http://localhost:8083/deeply/nested/path/

**Expected behavior**:
- ✅ Application loads without 404 errors
- ✅ Static assets (JS, CSS, images) load correctly
- ✅ Browser console shows no path-related errors
- ✅ Application functions normally

## 🔍 Verification Checklist

For each BASE_PATH configuration, verify:

### HTTP Responses
- [ ] Health endpoint returns 200 OK
- [ ] Main application returns 200 OK
- [ ] Static assets return 200 OK
- [ ] Manifest.json returns 200 OK

### Browser Functionality
- [ ] No 404 errors in browser console
- [ ] JavaScript files load correctly
- [ ] CSS styles apply correctly
- [ ] Images display correctly
- [ ] Application is interactive

### Container Health
- [ ] Container starts successfully
- [ ] Health checks pass
- [ ] No error logs in container output
- [ ] Nginx serves requests properly

### Security
- [ ] Container runs as non-root (nginx user)
- [ ] Uses non-privileged port 8080
- [ ] Read-only root filesystem works
- [ ] No privilege escalation

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. 404 Errors for Static Assets
**Symptoms**: CSS/JS files return 404
**Solution**: Check nginx location blocks and BASE_PATH processing

#### 2. Health Check Failures
**Symptoms**: Container health check fails
**Solution**: Verify health endpoint path includes BASE_PATH

#### 3. Application Won't Load
**Symptoms**: Blank page or errors
**Solution**: Check BASE_PATH injection in index.html

#### 4. Permission Denied Errors
**Symptoms**: nginx can't bind to port
**Solution**: Ensure using port 8080 (non-privileged)

### Debug Commands

```bash
# Check container logs
docker logs <container-name>

# Inspect processed nginx config
docker exec <container-name> cat /tmp/nginx.conf

# Check processed index.html
docker exec <container-name> cat /tmp/html/index.html

# List files in container
docker exec <container-name> ls -la /tmp/html/

# Test internal health check
docker exec <container-name> curl -f http://localhost:8080/path/health
```

## 📊 Expected Test Results

### ✅ Success Criteria

All test scenarios should:
1. **Start successfully** - Container reaches running state
2. **Pass health checks** - Health endpoint returns 200
3. **Serve application** - Main page loads correctly
4. **Load assets** - All static files accessible
5. **Process config** - BASE_PATH correctly applied

### ⚠️ Performance Expectations

- **Startup time**: < 10 seconds
- **Health check response**: < 100ms
- **Static asset loading**: < 500ms
- **Memory usage**: < 256MB
- **CPU usage**: < 100m (0.1 CPU)

## 🔄 Continuous Testing

### Automated Testing Pipeline

```bash
#!/bin/bash
# Add to CI/CD pipeline

# 1. Validate configuration
./validate-base-path-config.sh || exit 1

# 2. Run comprehensive tests  
./test-base-path.sh || exit 1

# 3. Clean up
./test-base-path.sh clean
```

### Integration with Kubernetes

After container testing, validate Kubernetes deployment:

```bash
# Apply to test namespace
kubectl apply -k cluster-configuration/beta/

# Verify deployment
kubectl get pods -n beta -l app=gait-detection
kubectl get svc -n beta gait-detection
kubectl get ingressroute -n beta gait-detection

# Test external access
curl -f https://beta.rho-dev.com/gait/health
```

## 📝 Test Reporting

Document test results with:

- ✅ Test case name and BASE_PATH value
- ✅ Pass/Fail status for each check
- ✅ Response times and performance metrics
- ✅ Any errors or warnings encountered
- ✅ Browser compatibility notes

## 🎉 Conclusion

This comprehensive testing framework ensures the gait-detection container works reliably across different deployment scenarios. The combination of configuration validation, automated testing, and manual verification provides confidence in the BASE_PATH functionality.

---

**Last Updated**: 2025-07-08  
**Version**: 1.0  
**Tested Configurations**: 7 BASE_PATH scenarios  
**Status**: ✅ All validations passing