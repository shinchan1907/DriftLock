# Contributing line to Driftlock 🔒

First off, thank you for considering contributing to Driftlock! It's people like you that make Driftlock such a great tool for the community.

## 🌈 Our Vision

Driftlock aims to provide the most beautiful, user-friendly, and robust self-hosted Dynamic DNS solution. We value simplicity, premium aesthetics, and rock-solid reliability.

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct (be kind, be professional, be helpful).

## 🚀 How Can I Contribute?

### Reporting Bugs
- **Search first**: Check if the issue has already been reported.
- **Provide detail**: Include your OS, Docker version, and clear steps to reproduce.
- **Logs are life**: Attach logs from `docker compose logs -f`.

### Suggesting Enhancements
- **The "Why"**: Explain why this feature is useful and who it's for.
- **Visuals**: If it's a UI change, a mockup or sketch is worth a thousand words.

### Technical Contributions
1. **Fork & Clone**: Fork the repo and clone it locally.
2. **Branch**: Create a feature branch (`git checkout -b feature/amazing-feature`).
3. **Coding Standards**:
   - Backend: Follow PEP 8 (FastAPI).
   - Frontend: Use Tailwind CSS and follow the existing design system (React + TypeScript).
   - Commit Messages: Use [Conventional Commits](https://www.conventionalcommits.org/).
4. **Test**: Ensure your changes don't break the build or setup script.
5. **PR**: Submit a Pull Request with a clear description of what changed.

## 🛠️ Development Setup

```bash
# 1. Clone your fork
git clone https://github.com/YOUR_USERNAME/DriftLock.git
cd DriftLock

# 2. Local Environment
cp .env.example .env

# 3. Spin up dev stack
docker compose up --build
```

- **Frontend**: Accessible at `http://localhost:80` (or the port defined in override).
- **Backend API**: Accessible at `http://localhost:8000`.
- **API Docs**: Swagger UI at `http://localhost:8000/docs`.

## 🎨 Design System
We use a premium "Dark Glassmorphism" aesthetic.
- **Primary Color**: Blue-600 (`#2563eb`)
- **Background**: Slate-950 (`#020617`)
- **Cards**: Slate-900 with subtle borders (`#0f172a`)
- **Typography**: Inter (Sans-serif)

## ⚖️ License
By contributing, you agree that your contributions will be licensed under the MIT License of the project.

---

**Questions?** Open an Issue or reach out to the maintainers. Happy coding! 🚀
