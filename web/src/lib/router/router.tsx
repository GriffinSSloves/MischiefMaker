import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import Layout from '@/components/layouts/Layout/Layout';

// Lazy load route components to reduce initial bundle size
const Home = lazy(() => import('@/pages/Home/Home'));
const Encode = lazy(() => import('@/pages/Encode/Encode'));
const Decode = lazy(() => import('@/pages/Decode/Decode'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-pulse">Loading...</div>
  </div>
);

const LazyRoute = ({ Component }: { Component: React.ComponentType }) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// Layout wrapper component that provides the Layout with Outlet for nested routes
const LayoutWrapper = () => (
  <Layout>
    <Outlet />
  </Layout>
);

export const AppRouter = createBrowserRouter([
  {
    path: '/',
    element: <LayoutWrapper />,
    children: [
      {
        index: true,
        element: <LazyRoute Component={Home} />,
      },
      {
        path: 'encode',
        element: <LazyRoute Component={Encode} />,
      },
      {
        path: 'decode',
        element: <LazyRoute Component={Decode} />,
      },
    ],
    // You can add an error element here when you create an error page
    // errorElement: <ErrorPage />
  },
]);
