#!/bin/bash

# Specific testing script for nginx redirect fix
# Tests that redirects don't include port 8080 in URLs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to test redirect behavior specifically
test_redirect_behavior() {
    local container_name=$1
    local port=$2
    local base_path=$3
    local test_url
    
    if [ "$base_path" = "/" ]; then
        # For root path, test a different redirect scenario
        test_url="http://localhost:$port"
    else
        # Test the BASE_PATH without trailing slash (should redirect to with slash)
        test_url="http://localhost:$port$base_path"
    fi
    
    log_info "Testing redirect from: $test_url"
    
    # Get redirect response with curl
    local response=$(curl -s -I -w "%{redirect_url}|%{http_code}" "$test_url" || echo "000")
    local redirect_url=$(echo "$response" | cut -d'|' -f1)
    local status_code=$(echo "$response" | cut -d'|' -f2)
    
    log_info "Status code: $status_code"
    log_info "Redirect URL: $redirect_url"
    
    # Check if redirect URL contains port 8080
    if echo "$redirect_url" | grep -q ":8080"; then
        log_error "❌ REDIRECT CONTAINS PORT 8080: $redirect_url"
        return 1
    elif [ -n "$redirect_url" ] && [ "$redirect_url" != "" ]; then
        log_success "✅ Redirect URL clean (no port): $redirect_url"
        return 0
    elif [ "$status_code" = "200" ]; then
        log_success "✅ No redirect needed (direct 200 response)"
        return 0
    else
        log_warning "⚠️ Unexpected response: $status_code"
        return 1
    fi
}

# Function to test proxy headers
test_proxy_headers() {
    local container_name=$1
    local port=$2
    local base_path=$3
    
    log_info "Testing proxy header handling..."
    
    local test_url
    if [ "$base_path" = "/" ]; then
        test_url="http://localhost:$port/"
    else
        test_url="http://localhost:$port$base_path/"
    fi
    
    # Test with X-Forwarded-Host header
    local response=$(curl -s -I \
        -H "X-Forwarded-Host: beta.rho-dev.com" \
        -H "X-Forwarded-Proto: https" \
        "$test_url" || echo "ERROR")
    
    if echo "$response" | grep -q "HTTP.*200"; then
        log_success "✅ Proxy headers handled correctly"
        return 0
    else
        log_error "❌ Proxy header handling failed"
        log_info "Response: $response"
        return 1
    fi
}

# Function to test for port leakage in all responses
test_port_leakage() {
    local container_name=$1
    local port=$2
    local base_path=$3
    
    log_info "Testing for port leakage in responses..."
    
    local test_urls=()
    if [ "$base_path" = "/" ]; then
        test_urls=("http://localhost:$port/" "http://localhost:$port/health")
    else
        test_urls=(
            "http://localhost:$port$base_path/"
            "http://localhost:$port$base_path/health"
            "http://localhost:$port$base_path"  # Without trailing slash
        )
    fi
    
    local issues=0
    
    for url in "${test_urls[@]}"; do
        log_info "Checking: $url"
        
        # Get full response including headers
        local full_response=$(curl -s -D- "$url" 2>/dev/null || echo "ERROR")
        
        # Check for port 8080 in any headers or content
        if echo "$full_response" | grep -i ":8080" | grep -v "curl\|connect"; then
            log_error "❌ Found port 8080 in response from $url"
            ((issues++))
        else
            log_success "✅ No port leakage in $url"
        fi
    done
    
    return $issues
}

# Function to run comprehensive redirect testing
run_redirect_tests() {
    local test_name=$1
    local base_path=$2
    local port=$3
    
    log_info "=========================================="
    log_info "REDIRECT TESTING: $base_path (Port: $port)"
    log_info "=========================================="
    
    local container_name="gait-test-$test_name"
    
    # Start container
    log_info "Starting container for redirect testing..."
    docker-compose -f docker-compose.test.yml --profile "test-$test_name" up -d
    
    # Wait for container to be ready
    local count=0
    while [ $count -lt 30 ]; do
        if docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"; then
            if docker exec "$container_name" ps aux | grep -q "nginx"; then
                log_success "Container $container_name is ready"
                break
            fi
        fi
        sleep 1
        ((count++))
    done
    
    if [ $count -eq 30 ]; then
        log_error "Container failed to start"
        docker-compose -f docker-compose.test.yml --profile "test-$test_name" down
        return 1
    fi
    
    local test_results=0
    
    # Test 1: Redirect behavior
    log_info "Test 1: Redirect behavior"
    if ! test_redirect_behavior "$container_name" "$port" "$base_path"; then
        ((test_results++))
    fi
    echo ""
    
    # Test 2: Proxy headers
    log_info "Test 2: Proxy header handling"
    if ! test_proxy_headers "$container_name" "$port" "$base_path"; then
        ((test_results++))
    fi
    echo ""
    
    # Test 3: Port leakage
    log_info "Test 3: Port leakage detection"
    if ! test_port_leakage "$container_name" "$port" "$base_path"; then
        ((test_results++))
    fi
    echo ""
    
    # Show nginx config for debugging
    log_info "Generated nginx config snippet:"
    docker exec "$container_name" grep -A5 -B5 "return 301" /tmp/nginx.conf || log_info "No redirects in config"
    echo ""
    
    # Clean up
    log_info "Cleaning up container..."
    docker-compose -f docker-compose.test.yml --profile "test-$test_name" down
    
    if [ $test_results -eq 0 ]; then
        log_success "✅ ALL REDIRECT TESTS PASSED for $base_path"
        return 0
    else
        log_error "❌ $test_results redirect tests FAILED for $base_path"
        return 1
    fi
}

# Main testing function
main() {
    log_info "🔧 NGINX REDIRECT FIX TESTING"
    log_info "Testing that redirects don't include port 8080"
    log_info "=========================================="
    
    # Test scenarios focusing on redirect behavior
    declare -A REDIRECT_TEST_CASES=(
        ["gait"]="/gait 8081"
        ["app"]="/app 8082"
        ["nested"]="/deeply/nested/path 8083"
    )
    
    # Build container first
    log_info "Building container with redirect fixes..."
    if ! docker-compose -f docker-compose.test.yml build; then
        log_error "Failed to build container"
        exit 1
    fi
    
    local overall_success=0
    local total_tests=${#REDIRECT_TEST_CASES[@]}
    
    # Run redirect tests for each scenario
    for test_name in "${!REDIRECT_TEST_CASES[@]}"; do
        IFS=' ' read -r base_path port <<< "${REDIRECT_TEST_CASES[$test_name]}"
        
        if run_redirect_tests "$test_name" "$base_path" "$port"; then
            ((overall_success++))
        fi
        
        # Brief pause between tests
        sleep 2
    done
    
    # Final summary
    echo ""
    log_info "=========================================="
    log_info "REDIRECT FIX TEST SUMMARY"
    log_info "=========================================="
    log_info "Total scenarios tested: $total_tests"
    log_info "Successful scenarios: $overall_success"
    log_info "Failed scenarios: $((total_tests - overall_success))"
    
    if [ $overall_success -eq $total_tests ]; then
        log_success "🎉 ALL REDIRECT TESTS PASSED!"
        log_success "✅ Port 8080 redirect issue is FIXED"
        log_success "✅ Nginx redirects work correctly"
        log_success "✅ Proxy headers handled properly"
        exit 0
    else
        log_error "❌ Some redirect tests failed"
        log_error "❌ Port 8080 issue may still exist"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "clean")
        log_info "Cleaning up test containers..."
        docker-compose -f docker-compose.test.yml down --remove-orphans
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Test nginx redirect fix for port 8080 issue"
        echo ""
        echo "Commands:"
        echo "  (no args)  Run redirect tests"
        echo "  clean      Clean up test containers"
        echo "  help       Show this help message"
        ;;
    *)
        main "$@"
        ;;
esac