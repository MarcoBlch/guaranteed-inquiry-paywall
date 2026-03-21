import React from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
);
