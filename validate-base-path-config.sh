#!/bin/bash

# Configuration validation script for BASE_PATH functionality
# This script validates the configuration files without running containers

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

# Function to validate nginx configuration template
validate_nginx_config() {
    local config_file="nginx.conf.template"
    local issues=0
    
    log_info "Validating nginx configuration template..."
    
    if [ ! -f "$config_file" ]; then
        log_error "nginx.conf.template not found"
        return 1
    fi
    
    # Check for BASE_PATH variable usage
    if grep -q '${BASE_PATH}' "$config_file"; then
        log_success "✓ BASE_PATH variable found in nginx config"
    else
        log_error "✗ BASE_PATH variable not found in nginx config"
        ((issues++))
    fi
    
    # Check for health endpoint with BASE_PATH
    if grep -q '${BASE_PATH}/health' "$config_file"; then
        log_success "✓ Health endpoint uses BASE_PATH"
    else
        log_error "✗ Health endpoint doesn't use BASE_PATH"
        ((issues++))
    fi
    
    # Check for location block with BASE_PATH
    if grep -q 'location ${BASE_PATH}' "$config_file"; then
        log_success "✓ Location block uses BASE_PATH"
    else
        log_error "✗ Location block doesn't use BASE_PATH"
        ((issues++))
    fi
    
    # Check for alias directive
    if grep -q 'alias /tmp/html' "$config_file"; then
        log_success "✓ Correct alias path for static files"
    else
        log_error "✗ Incorrect or missing alias path"
        ((issues++))
    fi
    
    # Check for static asset handling
    if grep -q '\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)' "$config_file"; then
        log_success "✓ Static asset handling configured"
    else
        log_error "✗ Static asset handling not configured"
        ((issues++))
    fi
    
    return $issues
}

# Function to validate docker-entrypoint script
validate_entrypoint() {
    local script_file="docker-entrypoint.sh"
    local issues=0
    
    log_info "Validating docker-entrypoint.sh..."
    
    if [ ! -f "$script_file" ]; then
        log_error "docker-entrypoint.sh not found"
        return 1
    fi
    
    # Check for BASE_PATH environment variable processing
    if grep -q 'BASE_PATH=' "$script_file"; then
        log_success "✓ BASE_PATH environment variable processing"
    else
        log_error "✗ BASE_PATH environment variable not processed"
        ((issues++))
    fi
    
    # Check for nginx config template processing
    if grep -q 'envsubst.*nginx.conf' "$script_file"; then
        log_success "✓ Nginx config template processing"
    else
        log_error "✗ Nginx config template not processed"
        ((issues++))
    fi
    
    # Check for index.html BASE_PATH injection
    if grep -q 'window.__BASE_PATH__' "$script_file"; then
        log_success "✓ BASE_PATH injection into index.html"
    else
        log_error "✗ BASE_PATH not injected into index.html"
        ((issues++))
    fi
    
    # Check for file copying to writable location
    if grep -q 'cp.*app/dist.*tmp/html' "$script_file"; then
        log_success "✓ Static files copied to writable location"
    else
        log_error "✗ Static files not copied to writable location"
        ((issues++))
    fi
    
    return $issues
}

# Function to validate Dockerfile
validate_dockerfile() {
    local dockerfile="Dockerfile"
    local issues=0
    
    log_info "Validating Dockerfile..."
    
    if [ ! -f "$dockerfile" ]; then
        log_error "Dockerfile not found"
        return 1
    fi
    
    # Check for non-root user
    if grep -q 'USER nginx' "$dockerfile"; then
        log_success "✓ Container runs as non-root user (nginx)"
    else
        log_error "✗ Container doesn't specify non-root user"
        ((issues++))
    fi
    
    # Check for port 8080 (non-privileged)
    if grep -q 'EXPOSE 8080' "$dockerfile"; then
        log_success "✓ Uses non-privileged port 8080"
    else
        log_error "✗ Doesn't use non-privileged port 8080"
        ((issues++))
    fi
    
    # Check for BASE_PATH environment variable
    if grep -q 'ENV BASE_PATH' "$dockerfile"; then
        log_success "✓ BASE_PATH environment variable defined"
    else
        log_error "✗ BASE_PATH environment variable not defined"
        ((issues++))
    fi
    
    # Check for health check with BASE_PATH
    if grep -q 'localhost:8080.*BASE_PATH.*health' "$dockerfile"; then
        log_success "✓ Health check uses BASE_PATH"
    else
        log_error "✗ Health check doesn't use BASE_PATH properly"
        ((issues++))
    fi
    
    return $issues
}

# Function to validate test configurations
validate_test_configs() {
    local test_compose="docker-compose.test.yml"
    local test_script="test-base-path.sh"
    local issues=0
    
    log_info "Validating test configurations..."
    
    # Check test docker-compose file
    if [ -f "$test_compose" ]; then
        log_success "✓ Test docker-compose file exists"
        
        # Check for different BASE_PATH test cases
        local test_cases=("/" "/gait" "/app" "/deeply/nested/path" "/test-with-hyphens")
        for case in "${test_cases[@]}"; do
            if grep -q "BASE_PATH=$case" "$test_compose"; then
                log_success "✓ Test case for BASE_PATH=$case"
            else
                log_warning "⚠ Missing test case for BASE_PATH=$case"
            fi
        done
    else
        log_error "✗ Test docker-compose file not found"
        ((issues++))
    fi
    
    # Check test script
    if [ -f "$test_script" ]; then
        log_success "✓ Test script exists"
        if [ -x "$test_script" ]; then
            log_success "✓ Test script is executable"
        else
            log_warning "⚠ Test script is not executable"
        fi
    else
        log_error "✗ Test script not found"
        ((issues++))
    fi
    
    return $issues
}

# Function to simulate BASE_PATH processing
simulate_base_path_processing() {
    local test_paths=("/" "/gait" "/app" "/deeply/nested/path" "/test-with-hyphens" "/api/v1/gait")
    
    log_info "Simulating BASE_PATH processing for different values..."
    
    for path in "${test_paths[@]}"; do
        log_info "Testing BASE_PATH: $path"
        
        # Simulate nginx config processing
        local temp_nginx=$(mktemp)
        local escaped_path=$(echo "$path" | sed 's/\//\\\//g')
        sed "s/\${BASE_PATH}/$escaped_path/g" nginx.conf.template > "$temp_nginx"
        
        # Check if processing was successful
        if [ "$path" = "/" ]; then
            if grep -q "location /" "$temp_nginx" && grep -q "/health" "$temp_nginx"; then
                log_success "✓ Nginx config processed correctly for $path"
            else
                log_error "✗ Nginx config processing failed for $path"
            fi
        else
            if grep -q "location $path" "$temp_nginx" && grep -q "$path/health" "$temp_nginx"; then
                log_success "✓ Nginx config processed correctly for $path"
            else
                log_error "✗ Nginx config processing failed for $path"
            fi
        fi
        
        rm "$temp_nginx"
    done
}

# Main validation function
main() {
    log_info "Starting BASE_PATH configuration validation"
    log_info "=========================================="
    
    local total_issues=0
    
    # Run all validations
    validate_nginx_config || total_issues=$((total_issues + $?))
    echo ""
    
    validate_entrypoint || total_issues=$((total_issues + $?))
    echo ""
    
    validate_dockerfile || total_issues=$((total_issues + $?))
    echo ""
    
    validate_test_configs || total_issues=$((total_issues + $?))
    echo ""
    
    simulate_base_path_processing
    echo ""
    
    # Final summary
    log_info "=========================================="
    log_info "VALIDATION SUMMARY"
    log_info "=========================================="
    
    if [ $total_issues -eq 0 ]; then
        log_success "🎉 ALL VALIDATIONS PASSED!"
        log_success "The configuration appears to be correct for BASE_PATH functionality."
        log_info ""
        log_info "To run the actual tests with Docker:"
        log_info "  ./test-base-path.sh"
        log_info ""
        log_info "To clean up test containers:"
        log_info "  ./test-base-path.sh clean"
        exit 0
    else
        log_error "❌ Found $total_issues configuration issues."
        log_error "Please fix the issues above before running container tests."
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "This script validates the BASE_PATH configuration without running containers."
        echo ""
        echo "Commands:"
        echo "  (no args)  Run all validations"
        echo "  help       Show this help message"
        ;;
    *)
        main "$@"
        ;;
esac