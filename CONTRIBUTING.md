# Contributing to NagaraTrack Lite

Thank you for your interest in contributing to NagaraTrack Lite! This guide will help you get started with contributing to our public transportation tracking system.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/NagaraTrack-Lite-SIH-Project.git
   cd NagaraTrack-Lite-SIH-Project
   ```
3. **Set up development environment**:
   ```bash
   cp .env.example .env
   docker-compose up -d
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📋 Development Guidelines

### Code Style

**Backend (Python):**
- Follow PEP 8 guidelines
- Use type hints for function signatures
- Add docstrings for classes and functions
- Run linting: `flake8 backend/ --max-line-length=120`
- Format code: `black backend/`

**Frontend (TypeScript/React):**
- Use TypeScript for all new code
- Follow React functional component patterns
- Use Tailwind CSS for styling
- Run linting: `npm run lint`
- Format code: `npm run format`

### Testing

- Write tests for new features
- Ensure all existing tests pass
- Backend: `cd backend && python -m pytest`
- Frontend: `cd frontend-pwa && npm test`

### Commit Messages

Use conventional commit format:
- `feat: add new bus route visualization`
- `fix: resolve map rendering issue`
- `docs: update installation guide`
- `test: add validation tests`

## 🏗️ Project Structure

```
├── backend/           # FastAPI Python backend
├── frontend-pwa/      # React TypeScript frontend
├── bot/              # Telegram bot (optional)
├── data/             # Sample CSV data
├── docs/             # Documentation
├── infra/            # Infrastructure configs
├── scripts/          # Utility scripts
└── .github/          # GitHub workflows
```

## 🛠️ Development Setup

### Prerequisites
- Docker Desktop
- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend development)
- Git

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Development
```bash
cd frontend-pwa
npm install
npm run dev
```

### Environment Variables
- Copy `.env.example` to `.env`
- Update database and API URLs as needed
- Never commit real credentials

## 📝 Making Changes

### 1. Issues First
- Check existing issues before creating new ones
- Use issue templates when available
- Clearly describe the problem or feature request

### 2. Feature Development
- Create a feature branch from `main`
- Keep changes focused and atomic
- Write tests for new functionality
- Update documentation if needed

### 3. Pull Requests
- Fill out the PR template completely
- Link to related issues
- Ensure CI passes
- Request review from maintainers

## 🔍 Code Review Process

1. **Automated Checks**: CI must pass (linting, tests, build)
2. **Peer Review**: At least one maintainer review required
3. **Testing**: Verify changes work in development environment
4. **Documentation**: Ensure docs are updated if needed

## 🐛 Bug Reports

When reporting bugs, include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Docker version)
- Screenshots/logs if applicable

## 💡 Feature Requests

For new features:
- Check if similar functionality exists
- Describe the use case clearly
- Consider implementation complexity
- Discuss in issues before starting work

## 📚 Documentation

- Update relevant documentation for your changes
- Use clear, concise language
- Include code examples where helpful
- Test documentation steps work

## 🏷️ Release Process

1. Features are merged to `main` branch
2. Releases are tagged with semantic versioning
3. Release notes are generated automatically
4. Docker images are built and published

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and contribute
- Provide constructive feedback
- Follow the code of conduct

## 📞 Getting Help

- GitHub Issues: For bugs and feature requests
- Discussions: For questions and general discussion
- Documentation: Check the `docs/` folder first

## 🏆 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Special recognition for significant contributions

Thank you for contributing to NagaraTrack Lite! 🚌💨