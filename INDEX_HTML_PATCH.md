# แก้ `index.html` เพื่อเปิดใช้ PWA

## 1) เพิ่มใน `<head>`

วางบรรทัดนี้หลัง `<meta name="viewport" ...>` และก่อน `<title>` หรือก่อน `<link rel="stylesheet" href="style.css" />`

```html
<meta name="theme-color" content="#0f5ea8" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Global Saving" />
<link rel="manifest" href="manifest.webmanifest" />
<link rel="apple-touch-icon" href="icons/icon-192.png" />
```

จากไฟล์ปัจจุบัน จุดนี้อยู่แถว `<head>` ที่มี `charset`, `viewport`, `title`, และ `style.css`.

## 2) เพิ่ม script ลงท้ายก่อน `</body>`

วางหลัง `app.js` แบบนี้:

```html
<script src="plans.js"></script>
<script src="calc.js"></script>
<script src="log.js"></script>
<script src="export-pdf.js"></script>
<script src="app.js"></script>
<script src="pwa.js"></script>
```

## 3) ไฟล์ใหม่ที่ต้องอัปโหลดไว้ root repo

- `manifest.webmanifest`
- `sw.js`
- `pwa.js`
- โฟลเดอร์ `icons/`

## 4) หลัง deploy แล้วทดสอบ

1. เปิด `https://globalsaving.vercel.app`
2. Chrome / Edge: DevTools > Application > Manifest ต้องเห็น manifest
3. DevTools > Application > Service Workers ต้องเห็น `sw.js` activated
4. กด Lighthouse > Progressive Web App หรือเปิดบนมือถือแล้วดูเมนู Install/Add to Home Screen

หมายเหตุ: Service Worker ใช้ไม่ได้กับการเปิดไฟล์แบบ `file://` ต้องเปิดผ่าน Vercel, localhost หรือ HTTPS เท่านั้น
