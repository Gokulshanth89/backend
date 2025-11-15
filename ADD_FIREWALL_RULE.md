# ⚠️ CRITICAL: Add Firewall Rule

## The Problem
Your Samsung phone cannot connect because **Windows Firewall is blocking port 5000**.

## The Solution (Choose ONE method)

### Method 1: Run PowerShell Script (Easiest) ⭐

1. **Right-click on PowerShell** → **Run as Administrator**
2. Navigate to backend folder:
   ```powershell
   cd C:\Users\fahmy\Desktop\hotel_management_system\backend
   ```
3. Run the test script:
   ```powershell
   .\test-connection.ps1
   ```
   This will automatically add the firewall rule and test everything!

### Method 2: Manual Command

1. **Right-click on PowerShell** → **Run as Administrator**
2. Run this command:
   ```powershell
   netsh advfirewall firewall add rule name="Node.js Backend Port 5000" dir=in action=allow protocol=TCP localport=5000
   ```
3. You should see: "Ok."

### Method 3: Windows Firewall GUI

1. Press `Windows + R`
2. Type: `wf.msc` and press Enter
3. Click **"Inbound Rules"** on the left
4. Click **"New Rule"** on the right
5. Select **"Port"** → Click **Next**
6. Select **"TCP"** → Enter **"5000"** in "Specific local ports" → Click **Next**
7. Select **"Allow the connection"** → Click **Next**
8. Check all three boxes (Domain, Private, Public) → Click **Next**
9. Name it: **"Node.js Backend Port 5000"** → Click **Finish**

## After Adding Firewall Rule

1. **Test from Samsung phone browser:**
   - Open Chrome on your Samsung phone
   - Go to: `http://192.168.8.163:5000/api/health`
   - You should see: `{"status":"OK","message":"Server is running"}`
   - ✅ If this works, the connection is fixed!

2. **If phone browser works, restart Flutter app:**
   ```bash
   cd mobile
   flutter run
   ```

3. **Try the OTP request again in the app**

## Verify Firewall Rule Was Added

Run this command to check:
```powershell
netsh advfirewall firewall show rule name="Node.js Backend Port 5000"
```

You should see the rule details. If you see "No rules match", the rule wasn't added.

## Still Not Working?

If you added the firewall rule but phone browser still can't connect:

1. **Check WiFi networks match:**
   - Samsung phone: Settings → WiFi → Note the network name
   - Computer: Check WiFi network name
   - They MUST be the same!

2. **Temporarily disable firewall (for testing only):**
   - Windows Security → Firewall & network protection
   - Turn off firewall for **Private network** (temporarily)
   - Test connection
   - **Turn it back on** after testing

3. **Check router settings:**
   - Some routers have "AP Isolation" or "Client Isolation"
   - This prevents devices from talking to each other
   - Disable this feature in router settings

---

**The firewall rule is the #1 issue. Add it first!**

