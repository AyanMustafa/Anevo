# Anevo - Note Sharing Application

A modern, full-stack note-taking and sharing application built with React, TypeScript, FastAPI, and SQLite.

## 📋 Overview

Anevo is a feature-rich note management application that allows users to create, edit, organize, and share notes with others. It features Google OAuth authentication, real-time sync indicators, and a beautiful UI built with shadcn/ui components.

## ✨ Features

- 🔐 **Authentication**: Username/password and Google OAuth login
- 📝 **Note Management**: Create, edit, and delete notes
- 🏷️ **Tags**: Organize notes with custom tags
- 🔍 **Search**: Fast search across all notes and tags
- 🤝 **Note Sharing**: Share notes with other users (read-only or edit permissions)
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🎨 **Modern UI**: Beautiful interface with Tailwind CSS and shadcn/ui
- ⚡ **Real-time Sync**: Visual sync indicators for data updates

## 🚀 Project Structure

```
Anevo/
├── backend/               # FastAPI backend
│   ├── main.py           # Main API server
│   └── requirements.txt  # Python dependencies
├── pastel-ink-sync/      # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities
│   │   └── pages/        # Page components
│   └── package.json      # Node dependencies
└── README.md             # This file
```

## 🛠️ Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for fast builds
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Query** for data fetching
- **React Router** for navigation
- **Google OAuth** for authentication

### Backend

- **FastAPI** (Python web framework)
- **SQLAlchemy** for database ORM
- **SQLite** for data storage
- **JWT** for token-based authentication
- **Google OAuth2** for social login

## 📦 Installation

### Prerequisites

- Node.js (v18+)
- Python (v3.8+)
- Git

### Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/Anevo.git
cd Anevo
```

### Backend Setup

See [backend/README.md](./backend/README.md) for detailed backend setup instructions.

### Frontend Setup

See [pastel-ink-sync/README.md](./pastel-ink-sync/README.md) for detailed frontend setup instructions.

## 🏃 Running the Application

### Start Backend Server

```bash
cd backend
python main.py
```

The API will be available at `http://localhost:8000`

### Start Frontend Development Server

```bash
cd pastel-ink-sync
npm run dev
```

The app will be available at `http://localhost:5173`

## 📖 API Documentation

Once the backend is running, visit:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🔑 Environment Variables

### Backend

Create a `.env` file in the `backend/` directory:

```env
SECRET_KEY=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
```

### Frontend

Create a `.env` file in the `pastel-ink-sync/` directory:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

**Ayan Mustafa**

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the amazing UI components
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent Python framework
- [React](https://react.dev/) for the powerful frontend library
