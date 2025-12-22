# Frontend – Next.js

## Prerequisites

- Node.js 14 or higher
- npm (Node package manager)

## Quick Setup

### Windows
Run the setup script:
```bash
setup.bat
```

### Linux/macOS
Run the setup script:
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

Create a `.env.local` file in the `frontend` directory (optional):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

This tells the frontend where to find the backend API. The default is `http://localhost:8000`.

## Running the Development Server

After setup, run:
```bash
npm run dev
```

The frontend will be available at:
- http://localhost:3000

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
