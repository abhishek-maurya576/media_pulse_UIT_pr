import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { CONFIG } from './config';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './components/public/PublicLayout';
import './index.css';

// ─── Auth Pages ───
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

// ─── Public Pages ───
const HomePage = lazy(() => import('./pages/public/HomePage'));
const ArticleView = lazy(() => import('./pages/public/ArticleView'));
const CategoryPage = lazy(() => import('./pages/public/CategoryPage'));
const BlogFeed = lazy(() => import('./pages/public/BlogFeed'));
const BlogPostView = lazy(() => import('./pages/public/BlogPostView'));
const SearchPage = lazy(() => import('./pages/public/SearchPage'));
const UserProfile = lazy(() => import('./pages/public/UserProfile'));

// ─── Dashboard Pages (Journalist+) ───
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EditionWorkspace = lazy(() => import('./pages/EditionWorkspace'));
const ArticleEditor = lazy(() => import('./pages/ArticleEditor'));
const ArticlesList = lazy(() => import('./pages/ArticlesList'));
const CategoryManager = lazy(() => import('./pages/CategoryManager'));
const TemplateManager = lazy(() => import('./pages/TemplateManager'));
const MediaLibrary = lazy(() => import('./pages/MediaLibrary'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogEditor = lazy(() => import('./pages/BlogEditor'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ─── Public Routes (PublicLayout: navbar + footer) ─── */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/article/:articleId" element={<ArticleView />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/blog" element={<BlogFeed />} />
              <Route path="/blog/:slug" element={<BlogPostView />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/profile/:username" element={<UserProfile />} />
            </Route>

            {/* ─── Auth Routes (no layout) ─── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ─── Dashboard Routes (Journalist+ — sidebar layout) ─── */}
            <Route element={<ProtectedRoute requiredRole="JOURNALIST" />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/editions" element={<Dashboard />} />
                <Route path="/editions/:editionId" element={<EditionWorkspace />} />

                <Route path="/dashboard/articles" element={<ArticlesList />} />
                <Route path="/dashboard/articles/new" element={<ArticleEditor />} />
                <Route path="/editions/:editionId/articles/new" element={<ArticleEditor />} />
                <Route path="/editions/:editionId/articles/:articleId" element={<ArticleEditor />} />

                {/* Blog Management */}
                <Route path="/dashboard/blog" element={<BlogList />} />
                <Route path="/dashboard/blog/new" element={<BlogEditor />} />
                <Route path="/dashboard/blog/:id/edit" element={<BlogEditor />} />

                {/* Categories (Editor+) */}
                <Route path="/dashboard/categories" element={<CategoryManager />} />

                {/* Templates (Admin+) */}
                <Route path="/dashboard/templates" element={<TemplateManager />} />

                {/* Media Library */}
                <Route path="/dashboard/media" element={<MediaLibrary />} />

                {/* Settings (Admin+) */}
                <Route path="/dashboard/settings" element={<SettingsPage />} />

                {/* User Management (Admin+) */}
                <Route path="/dashboard/users" element={<UserManagement />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--color-text)',
            border: `1px solid var(--color-border)`,
            borderRadius: CONFIG.radius.md,
            fontFamily: CONFIG.typography.bodyFont,
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
