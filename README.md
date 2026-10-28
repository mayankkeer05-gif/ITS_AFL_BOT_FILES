# MC Bot Panel

Ek web panel jisse **max 10 Minecraft AFK bots** banao, chalao, rokko aur delete karo.
Har bot ki **alag settings file, alag console, alag timers** hain - kuch mix nahi hota.

## Features
- Panel login (password) - bina login ke koi bot control nahi kar sakta
- Max 10 bots: create / delete / start / stop / restart
- Har bot ki live console + console se chat/command bhejna
- Har bot ki settings: name, IP, port, chat messages + interval
- Leave / Rejoin: server me kitni der rahega, kitni der leave rahega (min-max random)
- Auto reconnect: kick/disconnect par wapas join, baar baar fail ho to delay badhta hai
- Server login: `/register` aur `/login` apne aap (AuthMe servers)
- Anti-AFK (jump / look / swing)
- Redeploy ke baad running bots apne aap wapas start (3s gap se)

## Files
```
server.js            -> panel + API + live updates
src/botWorker.js     -> ek bot ka poora logic
src/botManager.js    -> 10 bots ka manager
src/store.js         -> per-bot config file
src/logger.js        -> per-bot console log
src/auth.js          -> panel login
public/              -> panel UI
data/bots/<id>/config.json   (har bot ki apni settings)
data/bots/<id>/console.log   (har bot ki apni console history)
```

## Railway par deploy
1. Ye poora folder GitHub repo me push karo (`node_modules` aur `data` ignore hain).
2. Railway > New Project > Deploy from GitHub repo.
3. **Variables** me add karo: `PANEL_PASSWORD` = tumhara password.
4. **Settings > Networking > Generate Domain** - ye panel ka link hai.
5. **Zaroori:** Service me **Volume** add karo (mount path `/data`) taaki redeploy par bots aur settings na udein.
   Volume lagate hi path apne aap detect hota hai (`RAILWAY_VOLUME_MOUNT_PATH`). Chaho to `DATA_DIR=/data` bhi set kar sakte ho.
6. Pehle se purani `package-lock.json` repo me ho to delete kar do (naye dependencies alag hain). Railway `npm install` khud kar lega.

`PANEL_PASSWORD` set nahi kiya to ek random password ban jata hai aur Railway **Deploy Logs** me print hota hai.

## Local chalane ke liye
```
npm install
PANEL_PASSWORD=1234 npm start
```
Phir http://localhost:3000 kholo.

## Notes
- Bots **offline-mode (cracked)** account se join karte hain (Aternos jaise servers ke liye theek).
- Version khali chhodoge to auto detect hota hai.
- Ek hi server par ek hi naam ke 2 bots nahi ban sakte (wo ek dusre ko kick karte).
- Panel Settings ke "Save" par agar bot chal raha hai to wo restart hota hai.
