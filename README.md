# Problem Discovery and Solution Ideation Platform

A web application for discovering problems and ideating solutions, built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Problem statement creation and management
- Interactive brainstorming tools
- Solution ideation and definition
- AI-powered solution analysis using Hugging Face API

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Hugging Face API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
DB_URL=your_mongodb_connection_string
SECRET=your_session_secret
HUGGINGFACE_API_KEY=your_huggingface_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- POST `/login` - User login
- POST `/register` - User registration
- GET `/logout` - User logout

### Problem Management
- GET `/campgrounds` - List all problems
- POST `/campgrounds` - Create new problem
- GET `/campgrounds/:id` - View problem details
- PUT `/campgrounds/:id` - Update problem
- DELETE `/campgrounds/:id` - Delete problem

### Ideation
- GET `/ideation` - Access ideation tool
- GET `/ideation/my-brainstorms` - View user's brainstorms
- POST `/api/ideas` - Create new idea
- POST `/api/frames` - Create new frame
- POST `/api/save` - Save board state

### Solutions
- POST `/api/deepseek` - Generate solution analysis
- GET `/solution-details` - View solution details

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
