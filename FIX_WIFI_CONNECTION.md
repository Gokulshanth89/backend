# Fix WiFi Connection - Step by Step Guide

## Problem: "This site cannot be reached" from phone

This happens because Windows Firewall is blocking port 5000. Follow these steps:

## Step 1: Verify Backend is Running

1. Make sure your backend server is running:
   ```bash
   cd backend
   npm run dev
   ```

2. You should see:
   ```
   Server is running on port 5000
   Server accessible at:
     - http://localhost:5000
     - http://127.0.0.1:5000
     - http://192.168.8.163:5000 (Network IP)
   ```

## Step 2: Test from Your Computer's Browser

1. Open a browser on your **computer** (not phone)
2. Go to: `http://192.168.8.163:5000/api/health`
3. You should see: `{"status":"OK","message":"Server is running"}`
4. If this doesn't work, the backend isn't running correctly

## Step 3: Add Windows Firewall Rule

### Option A: Using PowerShell Script (Easiest)

1. **Right-click on PowerShell** → **Run as Administrator**
2. Navigate to backend folder:
   ```powershell
   cd C:\Users\fahmy\Desktop\hotel_management_system\backend
   ```
3. Run the script:
   ```powershell
   .\fix-firewall.ps1
   ```

### Option B: Manual Method

1. Press `Windows + R`
2. Type: `wf.msc` and press Enter
3. Click **"Inbound Rules"** on the left
4. Click **"New Rule"** on the right
5. Select **"Port"** → Click **Next**
6. Select **"TCP"** → Enter **"5000"** in "Specific local ports" → Click **Next**
7. Select **"Allow the connection"** → Click **Next**
8. Check all three boxes (Domain, Private, Public) → Click **Next**
9. Name it: **"Node.js Backend Port 5000"** → Click **Finish**

### Option C: Using Command Line (Run as Administrator)

```powershell
netsh advfirewall firewall add rule name="Node.js Backend Port 5000" dir=in action=allow protocol=TCP localport=5000
```

## Step 4: Verify Phone and Computer are on Same WiFi

1. **On your computer:**
   - Check WiFi network name
   - Run `ipconfig` and note the IP address (should be 192.168.8.163)

2. **On your phone:**
   - Go to Settings → WiFi
   - Check the network name
   - **Must be the same as your computer's WiFi network**

3. **If they're different:**
   - Connect your phone to the same WiFi network as your computer

## Step 5: Test from Phone Browser

1. Open Chrome or any browser on your **phone**
2. Go to: `http://192.168.8.163:5000/api/health`
3. You should see: `{"status":"OK","message":"Server is running"}`
4. If you see this, the connection works! ✅

## Step 6: Update Mobile App

The API URL is already set to `http://192.168.8.163:5000/api` in `mobile/lib/services/api_service.dart`

Just hot reload your Flutter app (press `r` in terminal) or restart it.

## Step 7: Test the App

1. Open the mobile app
2. Enter an employee email
3. Click "Request OTP"
4. It should work now! ✅

---

## Still Not Working?

### Check IP Address

1. Run `ipconfig` again
2. If your IP changed, update `mobile/lib/services/api_service.dart` line 19:
   ```dart
   static const String baseUrl = 'http://YOUR_NEW_IP:5000/api';
   ```

### Temporarily Disable Firewall (For Testing Only)

1. Open Windows Security
2. Firewall & network protection
3. Turn off firewall for **Private network** (temporarily)
4. Test the connection
5. **Turn it back on** after testing

### Check Router Settings

Some routers have "AP Isolation" or "Client Isolation" enabled, which prevents devices from talking to each other. Check your router settings and disable this feature.

---

## Quick Checklist

- [ ] Backend server is running
- [ ] Backend accessible from computer browser (`http://192.168.8.163:5000/api/health`)
- [ ] Firewall rule added for port 5000
- [ ] Phone and computer on same WiFi network
- [ ] Backend accessible from phone browser (`http://192.168.8.163:5000/api/health`)
- [ ] API URL in mobile app is `http://192.168.8.163:5000/api`
- [ ] Flutter app restarted/hot reloaded

If all checkboxes are checked, it should work! 🎉

