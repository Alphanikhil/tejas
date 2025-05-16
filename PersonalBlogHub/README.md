# Personal Blog Hub

A full-stack blog application with React frontend and Express backend.

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT, Express-session
- **Image Storage**: Cloudinary

## Deployment on Render

### Prerequisites

1. Create a [Render](https://render.com/) account
2. Create a PostgreSQL database on Render or use another provider like [Neon](https://neon.tech)
3. Set up a [Cloudinary](https://cloudinary.com/) account for image storage

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database
DATABASE_URL=postgres://username:password@host:port/database_name

# JWT Secret for authentication
JWT_SECRET=your_jwt_secret_key_here

# Session Secret for Express
SESSION_SECRET=your_session_secret_here

# Node Environment
NODE_ENV=production

# Port (Render will provide its own PORT)
PORT=5000

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Deployment Steps

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Log in to [Render](https://render.com/)
3. Click on "New" and select "Web Service"
4. Connect your Git repository
5. Configure the service with the following settings:

   - **Name**: personal-blog-hub (or any name you prefer)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Select appropriate plan (Free tier works for testing)

6. Add the environment variables from your `.env` file
7. Click "Create Web Service"

### Database Setup

After deploying, you need to run migrations:

1. Connect to your deployed service via SSH in the Render dashboard
2. Run: `npm run db:push`

Or modify your build command to include migrations:
`npm install && npm run build && npm run db:push`

## Local Development

1. Clone the repository
2. Create a `.env` file with the variables mentioned above
3. Install dependencies: `npm install`
4. Run the development server: `npm run dev`
5. Open http://localhost:5000 in your browser

## License

MIT 