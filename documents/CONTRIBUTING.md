# �️ Contributing to ZINA Cantine BAD - Employee Food Ordering System

Thank you for your interest in contributing to ZINA Cantine BAD! This guide will help you get started with contributing to our **employee food ordering platform** designed specifically for BAD (Banque Africaine de Développement) employees.

## 🎯 Project Vision

ZINA Cantine BAD is a **modern employee food ordering platform** where BAD employees can:
- **Browse daily menus** from their workplace
- **Order meals online** through an intuitive interface
- **Pick up and pay** directly at the cantine (no online payment)
- **Save time** with quick reordering and favorites
- **Track nutrition** and dietary preferences

**Key Concept**: Employees order online → Pick up at cantine → Pay on-site

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

## 🤝 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards
- **Respect**: Treat everyone with respect and professionalism
- **Inclusivity**: Welcome contributions from everyone regardless of background
- **Collaboration**: Work together constructively
- **Learning**: Help others learn and grow

### Enforcement
Report any violations to the project maintainers.

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- Git
- Supabase account

### Setup
1. Fork the repository
2. Clone your fork
3. Create a virtual environment
4. Install dependencies
5. Set up environment variables
6. Run the development server

```bash
# Clone and setup
git clone https://github.com/your-username/zina-cantine-bad.git
cd zina-cantine-bad
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Environment Setup
```bash
# Copy environment template
cp .env.example .env
# Edit .env with your configuration
```

## 🔄 Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-fix-name
```

### 2. Branch Naming Convention
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test additions/updates
- `refactor/` - Code refactoring
- `hotfix/` - Critical fixes

### 3. Make Changes
- Follow coding standards
- Write tests
- Update documentation

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add user authentication system"
```

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

## 📝 Coding Standards

### Python (Backend)

#### Code Style
- Follow PEP 8
- Use 4 spaces for indentation
- Maximum line length: 88 characters
- Use f-strings for string formatting

#### Example
```python
# ✅ Good
def get_user_by_id(user_id: str) -> Optional[User]:
    """Get user by ID from database."""
    try:
        return db_service.get_user(user_id)
    except DatabaseError as e:
        logger.error(f"Failed to get user {user_id}: {e}")
        return None

# ❌ Bad
def getUser(id):
    return db.get(id)
```

#### Type Hints
- Use type hints for all functions
- Import from `typing` module
- Use `Optional` for nullable types

#### Documentation
- Use docstrings for all functions
- Include parameter descriptions
- Document return values

### JavaScript (Frontend)

#### Code Style
- Use camelCase for variables
- Use PascalCase for classes
- Use UPPER_CASE for constants
- Maximum line length: 100 characters

#### Example
```javascript
// ✅ Good
const getUserData = async (userId) => {
  try {
    const response = await fetch(`/api/users/${userId}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to get user ${userId}:`, error);
    return null;
  }
};

// ❌ Bad
function getuser(id){
  return fetch('/api/users/'+id).then(r=>r.json())
}
```

#### ES6+ Features
- Use arrow functions
- Use template literals
- Use destructuring
- Use async/await

### CSS/SCSS

#### Code Style
- Use kebab-case for class names
- Use BEM methodology
- Organize styles logically
- Use CSS variables

#### Example
```css
/* ✅ Good */
.menu-item {
  display: flex;
  padding: 1rem;
}

.menu-item__title {
  font-size: 1.2rem;
  font-weight: 600;
}

.menu-item--featured {
  background: var(--primary-color);
}

/* ❌ Bad */
.menuItem {
  display:flex;
  padding:10px;
}
```

## 🧪 Testing Guidelines

### Backend Testing
- Use pytest for unit tests
- Test all functions and classes
- Mock external dependencies
- Aim for 80%+ code coverage

#### Example Test
```python
def test_get_user_by_id_success():
    """Test successful user retrieval."""
    user_id = "test-user-123"
    expected_user = User(user_id=user_id, name="Test User")
    
    mock_db_service = Mock()
    mock_db_service.get_user.return_value = expected_user
    
    result = get_user_by_id(user_id, mock_db_service)
    
    assert result == expected_user
    mock_db_service.get_user.assert_called_once_with(user_id)
```

### Frontend Testing
- Use Jest for unit tests
- Test user interactions
- Mock API calls
- Test responsive design

#### Example Test
```javascript
describe('getUserData', () => {
  it('should return user data on success', async () => {
    const mockUser = { id: '123', name: 'Test User' };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUser)
      })
    );

    const result = await getUserData('123');
    expect(result).toEqual(mockUser);
  });
});
```

### Running Tests
```bash
# Backend tests
pytest tests/ -v --cov=zina_app

# Frontend tests
npm test

# All tests
npm run test:all
```

## 📚 Documentation

### Code Documentation
- Document all public functions
- Use clear, concise descriptions
- Include usage examples
- Document edge cases

### README Updates
- Update README for new features
- Include setup instructions
- Add troubleshooting section
- Update API documentation

### API Documentation
- Use OpenAPI/Swagger
- Document all endpoints
- Include request/response examples
- Document error codes

## 🔄 Pull Request Process

### Before Creating PR
1. **Code Quality**
   - Run linting tools
   - Fix any issues
   - Format code properly

2. **Testing**
   - Write tests for new code
   - Ensure all tests pass
   - Check coverage

3. **Documentation**
   - Update README
   - Add inline documentation
   - Update API docs

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process
1. **Automated Checks**
   - CI/CD pipeline runs
   - Code quality checks
   - Test coverage

2. **Peer Review**
   - At least one reviewer required
   - Address all feedback
   - Update based on suggestions

3. **Approval**
   - Maintainer approval required
   - Merge when approved
   - Delete feature branch

## 🏆 Recognition

### Contributors
- All contributors are recognized
- Special thanks for major contributions
- Contributor badges on GitHub

### Release Notes
- Contributors mentioned in releases
- Feature attribution
- Special recognition for bugs

## 📞 Getting Help

### Resources
- [Project Wiki](link-to-wiki)
- [API Documentation](link-to-api-docs)
- [Issue Tracker](link-to-issues)

### Contact
- Create an issue for questions
- Join our Discord server
- Email maintainers

## 🎯 Contribution Ideas

### High Priority
- [ ] Mobile app development
- [ ] Payment gateway integration
- [ ] Advanced analytics
- [ ] Multi-language support

### Medium Priority
- [ ] UI/UX improvements
- [ ] Performance optimization
- [ ] Security enhancements
- [ ] Documentation improvements

### Low Priority
- [ ] Bug fixes
- [ ] Code refactoring
- [ ] Test improvements
- [ ] Tooling updates

---

Thank you for contributing to ZINA Cantine BAD! 🎉

Your contributions help make this project better for everyone.
