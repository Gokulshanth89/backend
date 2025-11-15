# URGENT: Fix "Site Cannot Be Reached" Error

## The Problem
Your Samsung phone cannot reach the backend server even though the server is running.

## Step-by-Step Fix

### Step 1: Verify Backend is Running
Check your backend terminal - you should see:
```
Server is running on port 5000
Server accessible at:
  - http://localhost:5000
  - http://127.0.0.1:5000
  - http://192.168.8.163:5000 (Network IP)
```

### Step 2: Add Firewall Rule (CRITICAL!)

**You MUST run PowerShell as Administrator:**

1. **Right-click on PowerShell** → **Run as Administrator**
2. Run this command:
   ```powershell
   netsh advfirewall firewall add rule name="Node.js Backend Port 5000" dir=in action=allow protocol=TCP localport=5000
   ```
3. You should see: "Ok."
4. Verify it was added:
   ```powershell
   netsh advfirewall firewall show rule name="Node.js Backend Port 5000"
   ```

### Step 3: Temporarily Disable Windows Firewall (For Testing)

If Step 2 doesn't work, temporarily disable firewall to test:

1. Open **Windows Security**
2. Click **Firewall & network protection**
3. Click **Private network**
4. Turn OFF the firewall (temporarily)
5. Test from phone browser: `http://192.168.8.163:5000/api`
6. **If it works, turn firewall back ON and add the rule properly**

### Step 4: Verify Same WiFi Network

**CRITICAL:** Phone and computer MUST be on the same WiFi!

1. **On your computer:**
   - Check WiFi network name
   - Run `ipconfig` and note the IP (should be 192.168.8.163)

2. **On your Samsung phone:**
   - Settings → WiFi
   - Check the network name
   - **Must match your computer's WiFi network exactly**

3. **If they're different:**
   - Connect phone to the same WiFi as your computer

### Step 5: Check Router Settings

Some routers block device-to-device communication:

1. Access your router admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Look for:
   - "AP Isolation"
   - "Client Isolation"
   - "Wireless Isolation"
3. **Disable this feature** if it's enabled

### Step 6: Try Different IP Address

Your computer might have multiple IP addresses. Try the other one:

1. Run `ipconfig`
2. Look for IPv4 addresses
3. Try the one that's NOT `192.168.56.1` (that's VirtualBox)
4. Update `mobile/lib/services/api_service.dart` line 19 with the new IP

### Step 7: Test from Computer Browser First

Before testing on phone, test from your computer:

1. Open browser on your **computer**
2. Go to: `http://192.168.8.163:5000/api`
3. Should work from computer
4. If it doesn't work from computer, the backend isn't running correctly

### Step 8: Alternative - Use USB Connection

If WiFi still doesn't work, use USB:

1. Connect phone via USB
2. Enable USB Debugging on phone
3. Find ADB path (usually in Android SDK)
4. Run: `adb reverse tcp:5000 tcp:5000`
5. Change API URL in `api_service.dart` to: `http://localhost:5000/api`

## Quick Checklist

- [ ] Backend server is running
- [ ] Firewall rule added (run PowerShell as Admin)
- [ ] Phone and computer on SAME WiFi network
- [ ] Tested from computer browser (should work)
- [ ] Router AP Isolation disabled (if applicable)
- [ ] Correct IP address in `api_service.dart`

## Most Common Issues

1. **Firewall not configured** - Add the rule as Administrator
2. **Different WiFi networks** - Phone and computer must be on same network
3. **Router blocking** - AP Isolation enabled in router
4. **Wrong IP address** - Check `ipconfig` for correct IP

## Still Not Working?

Try this test:
1. On your computer, open Command Prompt
2. Run: `ping 192.168.8.163`
3. Should get replies
4. If no replies, the IP is wrong or network is misconfigured

