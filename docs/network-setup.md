# Network Setup — Accessing the app from other devices

## Prerequisites

Both servers must be running with network exposure enabled.

**Backend** — bind to all interfaces:
```bash
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0
```

**Frontend** — `host: true` is already set in `vite.config.js`, so just:
```bash
cd frontend
npm run dev
```

---

## Step 1 — Windows Firewall rules

Run the following in **PowerShell as Administrator** (right-click → "Run as administrator"):

```powershell
New-NetFirewallRule -DisplayName "Typst Translator - Frontend (5173)" `
  -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private, Public

New-NetFirewallRule -DisplayName "Typst Translator - Backend (8000)" `
  -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -Profile Private, Public
```

These rules persist across reboots. You only need to run them once.

---

## Step 2 — Set the network profile to Private

Windows restricts inbound connections on Public networks. If your WiFi is marked as Public, change it:

```powershell
Set-NetConnectionProfile -InterfaceAlias "Wi-Fi 2" -NetworkCategory Private
```

Replace `"Wi-Fi 2"` with your actual interface name if different. To check:

```powershell
Get-NetConnectionProfile
```

---

## Step 3 — Disable AP Isolation on the router

AP Isolation (also called Client Isolation or Wireless Isolation) prevents WiFi devices from communicating directly with each other. It must be **disabled** for local network access to work.

1. Open your router admin panel in a browser (usually `http://192.168.1.1` or `http://192.168.0.1`)
2. Log in with your router credentials
3. Find the WiFi or Advanced Wireless settings
4. Look for **AP Isolation**, **Client Isolation**, or **Wireless Isolation**
5. Disable it and save

---

## Accessing the app

| From | URL |
|---|---|
| This machine | `http://localhost:5173` |
| Other devices (by IP) | `http://192.168.100.24:5173` |
| Other devices (by name) | `http://Tato1-PC.local:5173` |

> **Note:** `Tato1-PC.local` uses mDNS and works on most modern devices (Mac, Linux, iOS, Android, Windows 10+). If it doesn't resolve, use the IP directly.

---

## Debugging checklist

If other devices can't connect, go through these in order:

1. **Same network?** — The other device's IP should start with `192.168.100.` (same subnet as the server).
2. **Port reachable?** — Run on the server: `Test-NetConnection -ComputerName 192.168.100.24 -Port 5173`. Should return `TcpTestSucceeded: True`.
3. **Firewall rules active?** — Run: `netsh advfirewall firewall show rule name="Typst Translator - Frontend (5173)"`
4. **AP Isolation** — If everything else checks out, this is the most likely culprit. Disable it on the router (see Step 3).

> Ping (`ping 192.168.100.24`) will likely fail even when everything is working — Windows blocks ICMP by default. Use `Test-NetConnection` instead.
