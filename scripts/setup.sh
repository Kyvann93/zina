#!/bin/bash
# ========================================
# ZINA Cantine BAD - Development Setup Script
# ========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Python version
check_python() {
    print_status "Checking Python version..."
    
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        print_success "Python $PYTHON_VERSION found"
        
        # Check if version is >= 3.8
        if python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
            print_success "Python version is compatible"
        else
            print_error "Python 3.8 or higher is required. Current version: $PYTHON_VERSION"
            exit 1
        fi
    else
        print_error "Python 3 is not installed. Please install Python 3.8 or higher."
        exit 1
    fi
}

# Check Node.js version
check_node() {
    print_status "Checking Node.js version..."
    
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION found"
    else
        print_warning "Node.js is not installed. Some frontend tools may not work."
    fi
}

# Check Git
check_git() {
    print_status "Checking Git..."
    
    if command_exists git; then
        GIT_VERSION=$(git --version)
        print_success "$GIT_VERSION found"
    else
        print_error "Git is not installed. Please install Git."
        exit 1
    fi
}

# Create virtual environment
create_venv() {
    print_status "Creating virtual environment..."
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_success "Virtual environment created"
    else
        print_warning "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        print_success "Virtual environment activated"
    else
        print_error "Failed to activate virtual environment"
        exit 1
    fi
}

# Install Python dependencies
install_python_deps() {
    print_status "Installing Python dependencies..."
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install requirements
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
        print_success "Python dependencies installed"
    else
        print_error "requirements.txt not found"
        exit 1
    fi
    
    # Install development dependencies
    if [ -f "requirements-dev.txt" ]; then
        pip install -r requirements-dev.txt
        print_success "Development dependencies installed"
    fi
}

# Setup environment variables
setup_env() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success ".env file created from .env.example"
            print_warning "Please edit .env file with your configuration"
        else
            print_error ".env.example not found"
            exit 1
        fi
    else
        print_warning ".env file already exists"
    fi
}

# Setup pre-commit hooks
setup_precommit() {
    print_status "Setting up pre-commit hooks..."
    
    if command_exists pre-commit; then
        pre-commit install
        print_success "Pre-commit hooks installed"
    else
        print_warning "pre-commit not found. Install with: pip install pre-commit"
    fi
}

# Initialize database
init_database() {
    print_status "Initializing database..."
    
    if [ -f "scripts/init_db.py" ]; then
        python scripts/init_db.py
        print_success "Database initialized"
    else
        print_warning "Database initialization script not found"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    directories=("uploads" "logs" "static/uploads" "static/media" "backups")
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        fi
    done
}

# Setup Git hooks
setup_git_hooks() {
    print_status "Setting up Git hooks..."
    
    hooks_dir=".git/hooks"
    commit_msg_hook="$hooks_dir/commit-msg"
    
    if [ -d "$hooks_dir" ]; then
        # Create commit message hook
        cat > "$commit_msg_hook" << 'EOF'
#!/bin/sh
# Commit message hook for ZINA Cantine BAD

commit_regex='^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "Invalid commit message format!"
    echo "Expected format: type(scope): description"
    echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
    echo "Example: feat(auth): add user login functionality"
    exit 1
fi
EOF
        
        chmod +x "$commit_msg_hook"
        print_success "Git hooks installed"
    else
        print_warning "Git hooks directory not found"
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    if command_exists pytest; then
        pytest tests/ -v --cov=zina_app --cov-report=term-missing
        print_success "Tests completed"
    else
        print_warning "pytest not found. Install with: pip install pytest"
    fi
}

# Start development server
start_server() {
    print_status "Starting development server..."
    
    if [ -f "app.py" ]; then
        python app.py
    else
        print_error "app.py not found"
        exit 1
    fi
}

# Main setup function
main() {
    print_status "Setting up ZINA Cantine BAD development environment..."
    echo
    
    # Check prerequisites
    check_python
    check_node
    check_git
    echo
    
    # Setup environment
    create_venv
    install_python_deps
    setup_env
    create_directories
    echo
    
    # Setup development tools
    setup_precommit
    setup_git_hooks
    echo
    
    # Initialize application
    init_database
    echo
    
    print_success "Setup completed successfully!"
    echo
    print_status "Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Run 'python app.py' to start the development server"
    echo "3. Visit http://localhost:5000 in your browser"
    echo "4. Run 'pytest' to run tests"
    echo
    
    # Ask if user wants to start server
    read -p "Do you want to start the development server now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_server
    fi
}

# Handle script arguments
case "${1:-}" in
    "test")
        run_tests
        ;;
    "server")
        start_server
        ;;
    "clean")
        print_status "Cleaning up..."
        rm -rf venv/
        rm -rf __pycache__/
        rm -rf .pytest_cache/
        rm -rf .coverage
        rm -rf htmlcov/
        find . -name "*.pyc" -delete
        print_success "Cleanup completed"
        ;;
    "help"|"-h"|"--help")
        echo "ZINA Cantine BAD Setup Script"
        echo
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  (none)    Run full setup"
        echo "  test      Run tests only"
        echo "  server    Start development server only"
        echo "  clean     Clean up generated files"
        echo "  help      Show this help message"
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
