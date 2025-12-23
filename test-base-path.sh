#!/bin/bash

# Comprehensive BASE_PATH testing script for gait-detection container
# This script tests the container with different BASE_PATH values to ensure
# all functionality works correctly across various deployment scenarios.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_TIMEOUT=30
CURL_TIMEOUT=10

# Test cases
declare -A TEST_CASES=(
    ["root"]="/ 8080"
    ["gait"]="/gait 8081"
    ["app"]="/app 8082"
    ["nested"]="/deeply/nested/path 8083"
    ["special"]="/test-with-hyphens 8084"
    ["api"]="/api/v1/gait 8085"
    ["underscore"]="/gait_detection 8086"
)

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to wait for container to be ready
wait_for_container() {
    local container_name=$1
    local timeout=$2
    
    log_info "Waiting for container $container_name to be ready..."
    
    local count=0
    while [ $count -lt $timeout ]; do
        if docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"; then
            if docker exec "$container_name" ps aux | grep -q "nginx"; then
                log_success "Container $container_name is ready"
                return 0
            fi
        fi
        sleep 1
        ((count++))
    done
    
    log_error "Container $container_name failed to start within $timeout seconds"
    return 1
}

# Function to test HTTP endpoints
test_http_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    log_info "Testing: $description"
    log_info "URL: $url"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $CURL_TIMEOUT "$url" || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        log_success "✓ $description - HTTP $response"
        return 0
    else
        log_error "✗ $description - Expected HTTP $expected_status, got HTTP $response"
        return 1
    fi
}

# Function to test static assets
test_static_assets() {
    local base_url=$1
    local base_path=$2
    
    local assets=(
        "image.png"
        "manifest.json"
    )
    
    local success_count=0
    local total_count=${#assets[@]}
    
    for asset in "${assets[@]}"; do
        local asset_url
        if [ "$base_path" = "/" ]; then
            asset_url="$base_url/$asset"
        else
            asset_url="$base_url$base_path/$asset"
        fi
        
        if test_http_endpoint "$asset_url" "200" "Static asset: $asset"; then
            ((success_count++))
        fi
    done
    
    log_info "Static assets test: $success_count/$total_count passed"
    return $([ $success_count -eq $total_count ] && echo 0 || echo 1)
}

# Function to test application functionality
test_application() {
    local base_url=$1
    local base_path=$2
    
    local app_url
    if [ "$base_path" = "/" ]; then
        app_url="$base_url/"
    else
        app_url="$base_url$base_path/"
    fi
    
    # Test main application page
    local response=$(curl -s --max-time $CURL_TIMEOUT "$app_url" || echo "")
    
    if echo "$response" | grep -q "Gait Detection System"; then
        log_success "✓ Application loads correctly"
        return 0
    else
        log_error "✗ Application failed to load or missing expected content"
        return 1
    fi
}

# Function to run a single test case
run_test_case() {
    local test_name=$1
    local base_path=$2
    local port=$3
    
    log_info "=========================================="
    log_info "Testing BASE_PATH: $base_path (Port: $port)"
    log_info "=========================================="
    
    local container_name="gait-test-$test_name"
    local base_url="http://localhost:$port"
    local health_url
    
    if [ "$base_path" = "/" ]; then
        health_url="$base_url/health"
    else
        health_url="$base_url$base_path/health"
    fi
    
    # Start the container
    log_info "Starting container with profile test-$test_name..."
    docker-compose -f docker-compose.test.yml --profile "test-$test_name" up -d
    
    # Wait for container to be ready
    if ! wait_for_container "$container_name" $TEST_TIMEOUT; then
        log_error "Container failed to start"
        docker-compose -f docker-compose.test.yml --profile "test-$test_name" down
        return 1
    fi
    
    # Test health endpoint
    local tests_passed=0
    local total_tests=0
    
    ((total_tests++))
    if test_http_endpoint "$health_url" "200" "Health check endpoint"; then
        ((tests_passed++))
    fi
    
    # Test static assets
    ((total_tests++))
    if test_static_assets "$base_url" "$base_path"; then
        ((tests_passed++))
    fi
    
    # Test main application
    ((total_tests++))
    if test_application "$base_url" "$base_path"; then
        ((tests_passed++))
    fi
    
    # Test nginx configuration processing
    ((total_tests++))
    if docker exec "$container_name" cat /tmp/nginx.conf | grep -q "$base_path"; then
        log_success "✓ Nginx configuration processed correctly"
        ((tests_passed++))
    else
        log_error "✗ Nginx configuration not processed correctly"
    fi
    
    # Test index.html BASE_PATH injection
    ((total_tests++))
    if docker exec "$container_name" cat /tmp/html/index.html | grep -q "window.__BASE_PATH__"; then
        log_success "✓ BASE_PATH injected into index.html"
        ((tests_passed++))
    else
        log_error "✗ BASE_PATH not injected into index.html"
    fi
    
    # Show container logs for debugging
    if [ $tests_passed -ne $total_tests ]; then
        log_warning "Container logs for debugging:"
        docker logs "$container_name" | tail -20
    fi
    
    # Clean up
    log_info "Stopping container..."
    docker-compose -f docker-compose.test.yml --profile "test-$test_name" down
    
    log_info "Test Results: $tests_passed/$total_tests tests passed"
    
    if [ $tests_passed -eq $total_tests ]; then
        log_success "✓ All tests passed for BASE_PATH: $base_path"
        return 0
    else
        log_error "✗ Some tests failed for BASE_PATH: $base_path"
        return 1
    fi
}

# Main test execution
main() {
    log_info "Starting comprehensive BASE_PATH testing for gait-detection container"
    log_info "Testing ${#TEST_CASES[@]} different BASE_PATH configurations"
    
    # Build the container first
    log_info "Building gait-detection container..."
    if ! docker-compose -f docker-compose.test.yml build; then
        log_error "Failed to build container"
        exit 1
    fi
    
    local overall_success=0
    local total_test_cases=${#TEST_CASES[@]}
    
    # Run each test case
    for test_name in "${!TEST_CASES[@]}"; do
        IFS=' ' read -r base_path port <<< "${TEST_CASES[$test_name]}"
        
        if run_test_case "$test_name" "$base_path" "$port"; then
            ((overall_success++))
        fi
        
        # Add delay between tests
        sleep 2
    done
    
    # Final summary
    echo ""
    log_info "=========================================="
    log_info "FINAL TEST SUMMARY"
    log_info "=========================================="
    log_info "Total test cases: $total_test_cases"
    log_info "Successful test cases: $overall_success"
    log_info "Failed test cases: $((total_test_cases - overall_success))"
    
    if [ $overall_success -eq $total_test_cases ]; then
        log_success "🎉 ALL TESTS PASSED! Container works correctly with all BASE_PATH configurations."
        exit 0
    else
        log_error "❌ Some tests failed. Please review the output above."
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "clean")
        log_info "Cleaning up test containers..."
        docker-compose -f docker-compose.test.yml down --remove-orphans
        docker system prune -f
        log_success "Cleanup completed"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  Run all BASE_PATH tests"
        echo "  clean      Clean up test containers and images"
        echo "  help       Show this help message"
        echo ""
        echo "Test cases:"
        for test_name in "${!TEST_CASES[@]}"; do
            IFS=' ' read -r base_path port <<< "${TEST_CASES[$test_name]}"
            echo "  $test_name: BASE_PATH=$base_path (port $port)"
        done
        ;;
    *)
        main "$@"
        ;;
esac