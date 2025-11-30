# .env Compatibility Check

## ✅ Your Current .env Works!

The global config system is designed to work with your existing minimal `.env` file. Here's what you need:

## Minimal Required Variables

Your `.env` file can have just these essential variables:

```env
PORT=5050
MONGODB_URI=mongodb://localhost:27017/hotel_management
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
```

## What Happens Automatically

If you **don't set** `NETWORK_IP`, the system will:
- ✅ Default to `localhost`
- ✅ Generate API URL: `http://localhost:5050`
- ✅ Generate Socket URL: `http://localhost:5050`
- ✅ Use default frontend URL: `http://localhost:3000`

**Everything will work perfectly!**

## Adding Network IP (Optional)

If you want to access from other devices, just add **one line**:

```env
PORT=5050
NETWORK_IP=192.168.8.163
MONGODB_URI=mongodb://localhost:27017/hotel_management
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
```

That's it! The system will automatically:
- Use `192.168.8.163` for all network connections
- Generate API URL: `http://192.168.8.163:5050`
- Generate Socket URL: `http://192.168.8.163:5050`

## Environment Variable Support

The global config supports **both** variable names for MongoDB:
- `MONGODB_URI` ✅ (preferred)
- `MONGO_URI` ✅ (also works, for backward compatibility)

## Default Values

| Variable | Default Value | Required? |
|----------|--------------|-----------|
| `PORT` | `5050` | No (has default) |
| `NETWORK_IP` | `localhost` | No (has default) |
| `MONGODB_URI` | `mongodb://localhost:27017/hotel_management` | No (has default) |
| `JWT_SECRET` | `your-secret-key-change-this-in-production` | No (has default) |
| `NODE_ENV` | `development` | No (has default) |
| `FRONTEND_URL` | `http://localhost:3000` | No (has default) |

## Testing Your Setup

1. **With minimal .env (no NETWORK_IP):**
   - Backend will use `localhost`
   - Works for local development
   - Frontend should use: `NEXT_PUBLIC_API_URL=http://localhost:5050`

2. **With NETWORK_IP set:**
   - Backend will use your network IP
   - Works for network access (mobile app, other devices)
   - Frontend should use: `NEXT_PUBLIC_API_URL=http://YOUR_NETWORK_IP:5050`

## Summary

✅ **Your current .env works as-is!**  
✅ **No changes required** - defaults handle everything  
✅ **Add NETWORK_IP only if you need network access**  
✅ **System is backward compatible** with existing setups  

The global config system is designed to be **non-breaking** - it enhances your existing setup without requiring changes.

