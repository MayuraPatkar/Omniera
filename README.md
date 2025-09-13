# Omniera

Omniera is an advanced AI-powered chat application designed to deliver intelligent, secure, and engaging conversational experiences. Built with a modern web stack and a custom transformer-based language model, Omniera enables users to interact naturally with AI, manage conversations, and maintain privacy.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [AI Model](#ai-model)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Usage](#usage)
- [Limitations](#limitations)
- [License](#license)

---

## Features

- **AI-Powered Conversations:** Natural, context-aware chat powered by a custom transformer-based model.
- **Secure & Private:** All conversations are encrypted and stored securely.
- **User Management:** Signup, login, profile management, and session-based authentication.
- **Chat History:** View, update, and delete past conversations.
- **Responsive UI:** Modern, mobile-friendly interface with animated feedback.

## Architecture

- **Frontend:** HTML, CSS, EJS templates for chat, dashboard, profile, and authentication pages.
- **Backend:** Node.js/Express server with RESTful APIs for user and chat management.
- **Database:** MongoDB for storing user accounts, chat sessions, and histories.
- **AI Model:** Python-based transformer language model for generating responses.

## AI Model

Omniera uses a custom transformer-based language model implemented in PyTorch ([server/Omnira/model.py](server/Omnira/model.py)). Key details:

- **Model Type:** Decoder-only transformer (similar to GPT architectures).
- **Parameter Count:** ~275 million parameters.
- **Layers:** 12 decoder blocks, multi-head attention, feed-forward layers.
- **Training:** Trained for 37 epochs, achieving 92.5% accuracy and 0.8s average response time.
- **Config:** See [`get_config`](server/Omnira/config.py) for hyperparameters.
- **Inference:** Node.js backend communicates with Python model via child process for real-time responses.

## Project Structure

```
Omniera/
├── app.js                # Express app setup
├── server.js             # Main server entry point
├── package.json          # Node.js dependencies
├── tokenizer.json        # Tokenizer for AI model
├── assets/               # Images and animations
├── client/               # Frontend HTML/EJS files
├── server/
│   ├── DB/               # MongoDB models and connection
│   ├── Omnira/           # AI model code (Python)
│   └── routes/           # Express route handlers
├── static/               # CSS and JS for frontend
```

## Setup & Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/Omniera.git
   cd Omniera
   ```

2. **Install Node.js dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**
   - Create a `.env` file with your MongoDB URI and other secrets.

4. **Start the server:**
   ```sh
   npm start
   ```
   The server runs on `http://localhost:3000`.

5. **AI Model Setup:**
   - Ensure Python 3 and PyTorch are installed.
   - Place the trained model weights (`Omnira.pt`) and `tokenizer.json` in `server/Omnira/`.
   - The backend will spawn the Python process for inference automatically.

## Usage

- **Signup/Login:** Create an account or log in via `/signup` and `/login`.
- **Dashboard:** View and manage your chat sessions.
- **Chat:** Start a new conversation with the AI, change chat titles, and view history.
- **Profile:** Manage your account, clear chat data, or delete your account.

## Limitations

- Occasional inaccuracies in highly specialized queries.
- Limited understanding of slang or cultural nuances.
- Potential for overfitting in later training epochs.
- Model responses depend on training data diversity.

## License

This project is licensed under the MIT License.

---

For more details, see the [client/landingpage.html](client/landingpage.html) and [server/Omnira/model.py](server/Omnira/model.py)


