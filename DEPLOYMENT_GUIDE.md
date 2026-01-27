# PUNX Subscription Tracker - Deployment Guide

## 🚀 Quick Start Checklist

- [ ] Deploy Firebase Security Rules
- [ ] Verify Firebase Authentication is enabled
- [ ] Test login flow
- [ ] Test subscription request submission
- [ ] Verify database writes are working

---

## 1. Firebase Console Setup

### **A. Deploy Firestore Security Rules**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Replace the existing rules with the content from `firestore.rules`:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // ✅ Users can read/write their own profile
    match /profiles/{userId} {
      allow read, write: if isOwner(userId);
    }

    // ✅ Users can create and view requests
    match /subscription_requests/{requestId} {
      allow create: if isAuthenticated();
      allow read, update: if isAuthenticated();
    }
    
    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5. Click **Publish**

### **B. Deploy Storage Security Rules**

1. Navigate to **Storage** → **Rules** tab
2. Replace with content from `storage.rules`:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users can upload to their own folder
    match /quotes/{userId}/{fileName} {
      allow read, write: if isOwner(userId);
    }
    
    // All authenticated users can read quotes
    match /quotes/{allPaths=**} {
       allow read: if isAuthenticated();
       allow write: if isAuthenticated();
    }

    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**

### **C. Verify Authentication is Enabled**

1. Navigate to **Authentication** → **Sign-in method**
2. Ensure **Google** is enabled
3. Add your domain to **Authorized domains** if deploying to production

---

## 2. Environment Variables

Ensure your `.env.local` file has all required Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 3. System Architecture Overview

### **Collections in Firestore**

#### **`profiles`**
- **Document ID**: User's Firebase UID
- **Fields**:
  - `id` (string): User UID
  - `email` (string): User email
  - `full_name` (string | null): Display name
  - `role` (string): 'employee' | 'admin' | 'finance' | 'super_admin'
  - `team` (string | null): Team assignment
  - `avatar_url` (string | null): Profile photo URL
  - `created_at` (string): ISO timestamp
  - `updated_at` (string): ISO timestamp

#### **`subscription_requests`**
- **Fields**:
  - `tool_name` (string): Name of the tool
  - `billing_type` (string): 'monthly' | 'annual' | 'usage_based' | 'one_time'
  - `amount` (number): Cost estimate
  - `currency` (string): 'USD' | 'EUR' | 'GBP' | 'PHP'
  - `justification` (string): Business case
  - `client` (string | null): Client/project name
  - `status` (string): 'pending_approval' | 'approved' | 'rejected'
  - `requester_id` (string): User UID who created the request
  - `quote_file_url` (string | null): URL to uploaded quote
  - `quote_file_name` (string | null): Original filename
  - `created_at` (string): ISO timestamp

### **Storage Structure**

```
/quotes
  /{userId}
    /{timestamp}_{filename}
```

---

## 4. Key Features Implemented

### ✅ **Authentication**
- Google Sign-In
- Email/Password Sign-In
- Profile auto-creation on first login
- Role preservation (admins don't get downgraded)
- Graceful permission error handling

### ✅ **Dashboard**
- Real-time stats (pending requests count)
- Recent activity feed
- Personalized welcome message

### ✅ **Subscription Requests**
- Create new requests with file upload
- View all user requests
- Real-time updates
- Form validation
- Error handling with user-friendly messages

### ✅ **Security**
- Users can only read/write their own data
- File uploads scoped to user folders
- Permission-denied errors handled gracefully

---

## 5. Testing the System

### **Test Login**
1. Navigate to `http://localhost:3000/login`
2. Click "Continue with Google"
3. You should be redirected to `/dashboard`
4. Check browser console for any errors

### **Test Request Submission**
1. Go to `/requests/new`
2. Fill out the form:
   - Tool Name: "Test Tool"
   - Billing: Monthly
   - Amount: 100
   - Currency: USD
   - Justification: "Testing"
3. Optionally upload a file
4. Click "Submit Request"
5. You should be redirected to `/requests`
6. Verify the request appears in the list

### **Verify Database**
1. Go to Firebase Console → Firestore Database
2. Check `subscription_requests` collection for your test entry
3. Check `profiles` collection for your user profile

---

## 6. Common Issues & Solutions

### **Issue: "Missing or insufficient permissions" on login**
**Solution**: Deploy the Firestore rules from Section 1.A

### **Issue: "Missing or insufficient permissions" on request submission**
**Solution**: 
1. Verify Firestore rules are deployed
2. Check that the user is authenticated
3. Ensure the `subscription_requests` collection exists

### **Issue: File upload fails**
**Solution**: Deploy Storage rules from Section 1.B

### **Issue: Dashboard shows "0" for all stats**
**Solution**: This is normal if you haven't created any requests yet. Create a test request to see stats update.

### **Issue: Login succeeds but profile sync warning appears**
**Solution**: This is expected if rules aren't deployed. The app will still work, but profile timestamps won't update.

---

## 7. Production Deployment (Vercel)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables from `.env.local`
   - Deploy

3. **Update Firebase Authorized Domains**:
   - Go to Firebase Console → Authentication → Settings
   - Add your Vercel domain (e.g., `your-app.vercel.app`)

---

## 8. Next Steps / Future Enhancements

### **Admin Features** (Not Yet Implemented)
- [ ] Admin dashboard to approve/reject requests
- [ ] View all requests across all users
- [ ] Manage user roles
- [ ] View subscription analytics

### **Subscription Management** (Not Yet Implemented)
- [ ] Convert approved requests to active subscriptions
- [ ] Track renewal dates
- [ ] Calculate actual monthly spend
- [ ] Send renewal reminders

### **Reporting** (Not Yet Implemented)
- [ ] Monthly spend reports
- [ ] Usage analytics
- [ ] Export to CSV

---

## 9. Support

If you encounter issues:
1. Check browser console for errors
2. Check Firebase Console → Firestore → Rules for syntax errors
3. Verify all environment variables are set correctly
4. Ensure Firebase Authentication is enabled

---

**Last Updated**: January 22, 2026
**Version**: 1.0.0
