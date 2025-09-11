# 🚀 Ingents Node Server

> A robust Node.js/Express API server with MongoDB and AWS S3 integration, designed for scalable web applications.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.2+-green.svg)](https://www.mongodb.com/)
[![AWS S3](https://img.shields.io/badge/AWS-S3-orange.svg)](https://aws.amazon.com/s3/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🎯 Overview

Ingents Node Server is a production-ready backend API built with modern Node.js technologies. It provides a solid foundation for building scalable web applications with features like user authentication, file uploads, and seamless cloud integration.

### 🌟 Key Highlights

- **TypeScript First**: Full type safety and enhanced developer experience
- **Modular Architecture**: Clean separation of concerns with controllers, services, and models
- **Secure Authentication**: JWT-based auth with httpOnly cookies
- **File Management**: Seamless file uploads to AWS S3
- **Database Transactions**: MongoDB transactions for data consistency
- **Email Integration**: Built-in email service integration
- **Production Ready**: Environment-based configuration and error handling

## ✨ Features

### 🔐 Authentication & Authorization

- JWT token-based authentication
- Secure cookie handling with httpOnly flags
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Google OAuth integration

### 📁 File Management

- Multi-file upload support via Multer
- Automatic AWS S3 integration
- MIME type validation
- Timestamped file naming

### 📧 Communication

- Email service integration
- Template-based email sending
- Welcome emails for new users

### 🛡️ Security & Validation

- Zod schema validation
- CORS configuration
- Input sanitization
- Error handling middleware

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Express API    │───▶│    MongoDB      │
│  (Frontend)     │    │   (Node.js)     │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     AWS S3      │
                       │  File Storage   │
                       └─────────────────┘
```

### 📂 Directory Structure

```
src/
├── api/v1/              # API version 1
│   ├── controller/      # Request handlers
│   ├── middlewares/     # Custom middleware
│   └── routes/          # Route definitions
├── config/              # Configuration files
├── constants/           # Application constants
├── models/              # Database models & schemas
├── services/            # Business logic services
└── types/               # TypeScript interfaces
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 4.4+
- AWS Account (for S3)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/ingents-node-server.git
   cd ingents-node-server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**

   ```bash
   npm run start:dev
   ```

5. **Verify installation**
   ```bash
   curl http://localhost:3000
   # Should return: <h1>Received Successfully</h1>
   ```

## ⚙️ Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/ingents-db

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Email Service
MAIL_SERVER_URL=https://your-mail-service.com

# AWS S3 (Update aws.config.ts with your credentials)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=bidready
```

> ⚠️ **Security Note**: Currently AWS credentials are hardcoded in `aws.config.ts`. Move them to environment variables for production use.

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| POST   | `/api/v1/auth/signup`          | Register new user with company |
| POST   | `/api/v1/auth/login`           | User login                     |
| POST   | `/api/v1/auth/google-signup`   | Google OAuth signup            |
| POST   | `/api/v1/auth/verify-token`    | Verify JWT token               |
| POST   | `/api/v1/auth/logout`          | User logout                    |
| PATCH  | `/api/v1/auth/change-password` | Change password                |

### Example: User Signup

```javascript
// POST /api/v1/auth/signup
// Content-Type: multipart/form-data

const formData = new FormData();
formData.append(
  "user_details",
  JSON.stringify({
    full_name: "John Doe",
    email: "john@example.com",
    password: "securePassword123",
  })
);
formData.append(
  "company_details",
  JSON.stringify({
    name: "Acme Corporation",
    industry: "Technology",
  })
);
formData.append("company_logo", logoFile);
formData.append("user_avatar", avatarFile);

const response = await fetch("/api/v1/auth/signup", {
  method: "POST",
  body: formData,
});
```

### Response Format

**Success Response:**

```json
{
  "message": "User created successfully",
  "data": {
    "user": {
      /* user object */
    },
    "token": "jwt-token-here"
  }
}
```

**Error Response:**

```json
{
  "message": "Error description",
  "error": {
    /* error details */
  }
}
```

## 🛠️ Development

### Available Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run start:dev` | Start development server with hot reload |
| `npm test`          | Run test suite (to be implemented)       |
| `npm run build`     | Build for production                     |

### Code Patterns

#### Controller Pattern

```typescript
export const controllerName = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Business logic here
    await session.commitTransaction();
    res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(500).json({ message: "Error", error });
  } finally {
    session.endSession();
  }
};
```

#### Schema Definition

```typescript
const userSchema = new Schema<IUser>(
  {
    email: { ...SCHEMA_DEFINITION_PROPERTY.requiredString, unique: true },
    company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
  },
  GENERAL_SCHEMA_OPTIONS
);
```

#### Route with File Upload

```typescript
router.post(
  "/endpoint",
  upload.fields([{ name: "file", maxCount: 1 }]),
  fileUploadHelper,
  userAuth,
  controller
);
```

## 🚦 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🌐 Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Build the project
npm run build

# Start with PM2
pm2 start dist/index.js --name "ingents-server"
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Environment Variables for Production

- Set `NODE_ENV=production`
- Use secure MongoDB URI
- Configure proper CORS origins
- Set secure JWT secret
- Move AWS credentials to environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use the established patterns for controllers, services, and models
- Include proper error handling with transactions
- Update API documentation for new endpoints
- Ensure all middleware chains are properly configured

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@ingents.com or join our Slack channel.

---

<div align="center">
  <strong>Built with ❤️ by the Ingents Team</strong>
</div>
