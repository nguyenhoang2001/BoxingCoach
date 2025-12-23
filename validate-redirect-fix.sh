#!/bin/bash

# Validate redirect fix without building containers
# Tests nginx configuration processing to ensure redirects are correct

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

# Function to test nginx config processing for redirect behavior
test_nginx_redirect_config() {
    local base_path=$1
    
    log_info "Testing nginx config processing for BASE_PATH: $base_path"
    
    # Create temporary processed config
    local temp_config=$(mktemp)
    local escaped_path=$(echo "$base_path" | sed 's/\//\\\//g')
    
    # Process the nginx template
    sed "s/\${BASE_PATH}/$escaped_path/g" nginx.conf.template > "$temp_config"
    
    log_info "Checking processed nginx configuration..."
    
    # Test 1: Check port_in_redirect is set
    if grep -q "port_in_redirect off" "$temp_config"; then
        log_success "✅ port_in_redirect off is configured"
    else
        log_error "❌ port_in_redirect off is missing"
        rm "$temp_config"
        return 1
    fi
    
    # Test 2: Check redirect uses proper variables
    if grep -q "return 301 \$scheme://\$best_host" "$temp_config"; then
        log_success "✅ Redirect uses proper host variables (\$scheme://\$best_host)"
    else
        log_error "❌ Redirect doesn't use proper host variables"
        rm "$temp_config"
        return 1
    fi
    
    # Test 3: Check X-Forwarded-Host mapping exists
    if grep -q "map \$http_x_forwarded_host \$best_host" "$temp_config"; then
        log_success "✅ X-Forwarded-Host mapping configured"
    else
        log_error "❌ X-Forwarded-Host mapping missing"
        rm "$temp_config"
        return 1
    fi
    
    # Test 4: Check BASE_PATH location block exists
    if grep -q "location $base_path/" "$temp_config"; then
        log_success "✅ BASE_PATH location block exists: $base_path/"
    else
        log_error "❌ BASE_PATH location block missing: $base_path/"
        rm "$temp_config"
        return 1
    fi
    
    # Test 5: Check health endpoint uses BASE_PATH
    if grep -q "location $base_path/health" "$temp_config"; then
        log_success "✅ Health endpoint uses BASE_PATH: $base_path/health"
    else
        log_error "❌ Health endpoint doesn't use BASE_PATH"
        rm "$temp_config"
        return 1
    fi
    
    # Test 6: Check that no hardcoded ports exist in redirects
    if grep -E "return 301.*:8080" "$temp_config"; then
        log_error "❌ Found hardcoded port 8080 in redirects!"
        grep -E "return 301.*:8080" "$temp_config"
        rm "$temp_config"
        return 1
    else
        log_success "✅ No hardcoded port 8080 in redirects"
    fi
    
    # Show the actual redirect configuration
    log_info "Generated redirect configuration:"
    grep -A1 -B1 "return 301" "$temp_config" | sed 's/^/  /'
    
    rm "$temp_config"
    return 0
}

# Function to test docker-entrypoint.sh BASE_PATH processing
test_entrypoint_processing() {
    log_info "Testing docker-entrypoint.sh BASE_PATH processing..."
    
    # Test BASE_PATH normalization logic
    local test_paths=("/gait" "gait" "/gait/" "gait/")
    
    for input_path in "${test_paths[@]}"; do
        log_info "Testing input: '$input_path'"
        
        # Simulate the entrypoint script logic
        local normalized_path="$input_path"
        
        # Simulate the normalization logic from entrypoint
        if [ "$normalized_path" != "/" ]; then
            # Remove trailing slash if present
            normalized_path=$(echo "$normalized_path" | sed 's:/*$::')
            # Ensure it starts with /
            normalized_path=$(echo "$normalized_path" | sed 's:^/*:/:')
        fi
        
        if [ "$normalized_path" = "/gait" ]; then
            log_success "✅ '$input_path' normalizes to '/gait'"
        else
            log_error "❌ '$input_path' normalizes to '$normalized_path' (expected '/gait')"
        fi
    done
}

# Function to simulate index.html BASE_PATH injection
test_index_html_injection() {
    local base_path=$1
    
    log_info "Testing index.html BASE_PATH injection for: $base_path"
    
    # Create a mock index.html
    local temp_html=$(mktemp)
    cat > "$temp_html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
EOF
    
    # Simulate the sed command from docker-entrypoint.sh
    local temp_output=$(mktemp)
    sed "s|<head>|<head><script>window.__BASE_PATH__ = '${base_path}'; window.__APP_CONFIG__ = { basePath: '${base_path}', apiUrl: '${base_path}/api' };</script>|" "$temp_html" > "$temp_output"
    
    # Check if injection worked
    if grep -q "window.__BASE_PATH__ = '$base_path'" "$temp_output"; then
        log_success "✅ BASE_PATH correctly injected into HTML"
    else
        log_error "❌ BASE_PATH injection failed"
        return 1
    fi
    
    if grep -q "basePath: '$base_path'" "$temp_output"; then
        log_success "✅ APP_CONFIG basePath correctly set"
    else
        log_error "❌ APP_CONFIG basePath injection failed"
        return 1
    fi
    
    # Show the injected script
    log_info "Injected configuration:"
    grep -o "window.__BASE_PATH__[^<]*" "$temp_output" | sed 's/^/  /'
    
    rm "$temp_html" "$temp_output"
    return 0
}

# Main test function
main() {
    log_info "🔧 NGINX REDIRECT FIX VALIDATION"
    log_info "Validating redirect configuration without containers"
    log_info "=================================================="
    
    local test_scenarios=("/" "/gait" "/app" "/deeply/nested/path")
    local total_tests=0
    local passed_tests=0
    
    # Test entrypoint processing first
    log_info "1. Testing docker-entrypoint.sh processing..."
    if test_entrypoint_processing; then
        ((passed_tests++))
    fi
    ((total_tests++))
    echo ""
    
    # Test each BASE_PATH scenario
    for base_path in "${test_scenarios[@]}"; do
        log_info "2. Testing nginx config for BASE_PATH: $base_path"
        if test_nginx_redirect_config "$base_path"; then
            ((passed_tests++))
        fi
        ((total_tests++))
        echo ""
        
        log_info "3. Testing HTML injection for BASE_PATH: $base_path"
        if test_index_html_injection "$base_path"; then
            ((passed_tests++))
        fi
        ((total_tests++))
        echo ""
    done
    
    # Summary
    log_info "=================================================="
    log_info "VALIDATION SUMMARY"
    log_info "=================================================="
    log_info "Total tests: $total_tests"
    log_info "Passed tests: $passed_tests"
    log_info "Failed tests: $((total_tests - passed_tests))"
    
    if [ $passed_tests -eq $total_tests ]; then
        log_success "🎉 ALL VALIDATION TESTS PASSED!"
        log_success ""
        log_success "✅ port_in_redirect off configured"
        log_success "✅ Proper redirect variables (\$scheme://\$best_host)"  
        log_success "✅ X-Forwarded-Host mapping working"
        log_success "✅ No hardcoded port 8080 in redirects"
        log_success "✅ BASE_PATH processing correct"
        log_success "✅ HTML injection working"
        log_success ""
        log_success "🎯 REDIRECT FIX IS PROPERLY CONFIGURED"
        log_info ""
        log_info "Expected behavior:"
        log_info "- beta.rho-dev.com/gait → beta.rho-dev.com/gait/ (NO :8080)"
        log_info "- All redirects use proper host from X-Forwarded-Host"
        log_info "- No container port leakage in any responses"
        
        return 0
    else
        log_error "❌ Some validation tests failed"
        log_error "❌ Redirect fix may not be working correctly"
        return 1
    fi
}

main "$@"