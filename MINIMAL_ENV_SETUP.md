# Minimal .env Setup

Your `.env` file can work with just the essential variables. The global config system provides sensible defaults for everything else.

## Minimal .env (8 lines or less)

Here's what you need at minimum:

```env
PORT=5050

JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
```

That's it! The system will:
- Use `localhost` for network IP (if NETWORK_IP not set)
- Use `http://localhost:3000` for frontend URL (if FRONTEND_URL not set)
- Auto-generate API and Socket URLs based on PORT and network IP

## Recommended .env (for network access)

If you want to access the backend from other devices on your network:

```env
PORT=5050
NETWORK_IP=192.168.8.163

JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Environment Variable Reference

### Required
- `PORT` - Server port (default: 5050)

- `JWT_SECRET` - Secret key for JWT tokens (default: your-secret-key-change-this-in-production)

### Optional (with defaults)
- `NETWORK_IP` or `BACKEND_IP` - Network IP address (default: localhost)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)
- `NODE_ENV` - Environment mode (default: development)
- `API_URL` - Full API URL (auto-generated if not set)
- `SOCKET_URL` - Full Socket.io URL (auto-generated if not set)

## How It Works

The global config (`backend/src/config/globalConfig.ts`) automatically:
1. Reads environment variables
2. Provides sensible defaults if variables are missing
3. Generates URLs based on PORT and NETWORK_IP
4. Logs the configuration on startup

## Example: Minimal Setup

**Your .env:**
```env
PORT=5050

JWT_SECRET=my-secret-key
```

**What happens:**
- Network IP defaults to `localhost`
- API URL becomes `http://localhost:5050`
- Socket URL becomes `http://localhost:5050`
- Frontend URL defaults to `http://localhost:3000`

## Example: Network Setup

**Your .env:**
```env
PORT=5050
NETWORK_IP=192.168.8.163

JWT_SECRET=my-secret-key
```

**What happens:**
- Network IP is `192.168.8.163`
- API URL becomes `http://192.168.8.163:5050`
- Socket URL becomes `http://192.168.8.163:5050`
- Frontend URL defaults to `http://localhost:3000`

## Compatibility

The system supports both:
- `MONGODB_URI` (preferred)
- `MONGO_URI` (legacy, for backward compatibility)

Both will work the same way.

