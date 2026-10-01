# מחשבון סכם והמלצת מיון · רפואה שש-שנתי אריאל

כלי לא רשמי של קבוצת המועמדים. גרסה 2.0.

- **index.html** – המחשבון (GitHub Pages). עובד גם בלי שרת, על עותק נתוני הסקר המוטמע בקובץ.
- **backend/Code.gs** – שרת נתונים ב-Google Apps Script: קריאת נתוני הסקר, שמירת נתונים מהמחשבון (שורה אחת לכל חשבון Google), והגדרת טופס הסקר לתשובה אחת לאדם עם עריכה בדיעבד.

## הפעלת שמירה והתחברות Google (פעם אחת, כ-15 דקות)

### שלב 1 – מזהה OAuth
1. [Google Cloud Console](https://console.cloud.google.com/) → פרויקט חדש (למשל `sechem-calculator`).
2. APIs & Services → OAuth consent screen → External → למלא שם אפליקציה ומייל תמיכה → Save. ב-Audience ללחוץ **Publish app** (אחרת רק משתמשי בדיקה יוכלו להתחבר).
3. APIs & Services → Credentials → Create credentials → **OAuth client ID** → Web application.
   - Authorized JavaScript origins: `https://naaman6.github.io`
   - (Redirect URIs לא נדרש)
4. להעתיק את ה-Client ID (מסתיים ב-`.apps.googleusercontent.com`).

### שלב 2 – Apps Script
1. לפתוח את [גיליון התגובות](https://docs.google.com/spreadsheets/d/1YVkOOZewABO6NKHNd0T33HaMMAgNGZRIPy4F1xZGPOM/edit) → תוספים → Apps Script.
2. למחוק את התוכן ולהדביק את `backend/Code.gs`.
3. למלא ב-`CONFIG`: `CLIENT_ID` (משלב 1) ו-`SALT` (כל מחרוזת אקראית ארוכה).
4. לבחור את הפונקציה `configureForm` → הרצה → לאשר הרשאות. זה מגדיר את הטופס לתשובה אחת לכל חשבון Google עם אפשרות עריכה.
5. פריסה → פריסה חדשה → סוג: **אפליקציית אינטרנט** → "הרץ בתור": **אני** → "למי יש גישה": **כל אחד** → פריסה. להעתיק את כתובת ה-Web app.

### שלב 3 – חיבור המחשבון
בקובץ `index.html`, בבלוק `CONFIG` בראש ה-`<script>`:
```js
CLIENT_ID: '....apps.googleusercontent.com',
API_URL: 'https://script.google.com/macros/s/..../exec',
```
לשמור ולדחוף ל-GitHub. תוך דקה GitHub Pages מתעדכן.

### עדכון קוד השרת
אחרי כל שינוי ב-Code.gs: פריסה → ניהול פריסות → עריכה → גרסה חדשה → פריסה (אותה כתובת נשמרת).

## פרטיות
- במחשבון נשמרים: מזהה מוצפן (SHA-256 של מזהה Google + מלח), סכם קוגניטיבי, מו"ר, מסלול, והאם מולא גם הטופס. לא נשמרים שם או מייל.
- המזהה משמש רק כדי שעדכון חוזר יחליף את השורה הקיימת ולא ייספר פעמיים.
- הטופס אינו אוסף מייל; ההגבלה לתשובה אחת נאכפת על ידי Google.
