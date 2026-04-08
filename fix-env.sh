#!/bin/bash
vars=(
  "NEXT_PUBLIC_FIREBASE_API_KEY:AIzaSyDaJOGyePB9Q_7M8PVHz-WZbAawtDp6KYg"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:punx-subscription-management.firebaseapp.com"
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL:https://punx-subscription-management-default-rtdb.firebaseio.com"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID:punx-subscription-management"
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:punx-subscription-management.firebasestorage.app"
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:390232201458"
  "NEXT_PUBLIC_FIREBASE_APP_ID:1:390232201458:web:c491a6c2f51406133a186b"
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:G-SXGTQSPLYM"
)

for env in "production" "preview" "development"; do
  for item in "${vars[@]}"; do
    key="${item%%:*}"
    val="${item#*:}"
    npx vercel env rm "$key" "$env" -y || true
    echo -n "$val" | npx vercel env add "$key" "$env"
  done
done

npx vercel --prod --yes
