# Deergayu Website - Deployment Guide

මේ project එකේ අනාගතයේදී මොනවා හරි වෙනස්කම් කරලා (Update කරලා) ඒවා Live Website එකට (deergayu.com එකට) දාන්න ඕන වුණාම මේ පියවර 4 අනුගමනය කරන්න:

## 1. Local එකේ Build කිරීම
Frontend එකේ මොනවා හරි වෙනස් කළා නම්, ඒක අනිවාර්යයෙන්ම Build කරන්න ඕනේ.
- VS Code Terminal එකේ `frontend` folder එකට යන්න (`cd frontend`)
- `npm run build` කියන command එක දෙන්න. (එතකොට අලුත් වෙනස්කම් ටික `dist` folder එකට හැදෙනවා).

## 2. GitHub එකට Push කිරීම
ඔයා කරපු ඔක්කොම වෙනස්කම් GitHub එකට යවන්න:
- Terminal එකේ Project එකේ ප්‍රධාන folder එකට එන්න (`cd ..`)
- `git add .`
- `git commit -m "Updated website"`
- `git push`

## 3. cPanel එකට අලුත් Code එක ගැනීම (Pull)
දැන් cPanel එකේ Terminal එක Open කරලා මේ ටික දෙන්න:
- `cd /home/dilspxws/deergayu`
- `git pull` (මේක දුන්න ගමන් GitHub එකට දාපු අලුත් කෝඩ් එක සර්වර් එකට එනවා!)

*(Backend එකේ අලුතින් packages මොනවා හරි දැම්මා නම් විතරක් `cd backend` ගිහින් `npm install` කරලා Node.js App එක Restart කරන්න).*

## 4. Frontend එක Live කිරීම
cPanel File Manager එකට ගිහින්:
- `/home/dilspxws/deergayu/frontend/dist/` කියන තැන තියෙන අලුත් files ටික Copy කරගන්න.
- ඒ ටික `/home/dilspxws/deergayu.com/` ෆෝල්ඩරේට ගිහින් Paste කරන්න (පරණ ඒවා Replace කරන්න).

එච්චරයි! දැන් Site එක Refresh කළාම අලුත් වෙනස්කම් පෙනේවි.
