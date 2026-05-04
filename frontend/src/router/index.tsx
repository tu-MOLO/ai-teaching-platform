import React, { Suspense } from 'react';
import { RouteObject } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuthStore } from '../stores/auth';
import { Navigate } from 'react-router-dom';

// 懒加载所有页面组件
const Login = React.lazy(() => import('../pages/Login'));
const Register = React.lazy(() => import('../pages/Register'));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const ResourceCenter = React.lazy(() => import('../pages/ResourceCenter'));
const UploadPage = React.lazy(() => import('../pages/ResourceCenter/Upload'));
const ResourceDetail = React.lazy(() => import('../pages/ResourceCenter/Detail'));
const Portfolio = React.lazy(() => import('../pages/Portfolio'));
const StudentDetail = React.lazy(() => import('../pages/Portfolio/StudentDetail'));
const AddRecord = React.lazy(() => import('../pages/Portfolio/AddRecord'));
const LessonPlanner = React.lazy(() => import('../pages/LessonPlanner'));
const LessonPlanList = React.lazy(() => import('../pages/LessonPlanner/List'));
const CreateLessonPlan = React.lazy(() => import('../pages/LessonPlanner/Create'));
const LessonPlanDetail = React.lazy(() => import('../pages/LessonPlanner/Detail'));
const Courses = React.lazy(() => import('../pages/Courses'));
const Students = React.lazy(() => import('../pages/Students'));
const Settings = React.lazy(() => import('../pages/Settings'));
const CreateCourse = React.lazy(() => import('../pages/Courses/Create'));
const EditCourse = React.lazy(() => import('../pages/Courses/Edit'));
const Reports = React.lazy(() => import('../pages/Reports'));
const Profile = React.lazy(() => import('../pages/Profile'));
const Notifications = React.lazy(() => import('../pages/Notifications'));
const CreateStudent = React.lazy(() => import('../pages/Students/Create'));
const EditStudent = React.lazy(() => import('../pages/Students/Edit'));
const PortfolioCreateStudent = React.lazy(() => import('../pages/Portfolio/Create'));
const PortfolioEditStudent = React.lazy(() => import('../pages/Portfolio/Edit'));
const EditRecord = React.lazy(() => import('../pages/Portfolio/EditRecord'));

// 加载中组件
const PageLoading = () => (
  <div style={{ padding: 24, textAlign: 'center' }}>
    <div>加载中...</div>
  </div>
);

// 包装懒加载组件的辅助函数
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <Suspense fallback={<PageLoading />}>
    <Component />
  </Suspense>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const router: RouteObject[] = [
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      {
        path: '',
        element: withSuspense(Dashboard)
      },
      {
        path: 'courses',
        element: withSuspense(Courses)
      },
      {
        path: 'courses/create',
        element: withSuspense(CreateCourse)
      },
      {
        path: 'courses/:id/edit',
        element: withSuspense(EditCourse)
      },
      {
        path: 'students',
        element: withSuspense(Students)
      },
      {
        path: 'students/create',
        element: withSuspense(CreateStudent)
      },
      {
        path: 'students/:id/edit',
        element: withSuspense(EditStudent)
      },
      {
        path: 'resource-center',
        element: withSuspense(ResourceCenter)
      },
      {
        path: 'resource-center/upload',
        element: withSuspense(UploadPage)
      },
      {
        path: 'resource-center/:id',
        element: withSuspense(ResourceDetail)
      },
      {
        path: 'lesson-planner',
        element: withSuspense(LessonPlanner)
      },
      {
        path: 'lesson-planner/list/:status',
        element: withSuspense(LessonPlanList)
      },
      {
        path: 'lesson-planner/create',
        element: withSuspense(CreateLessonPlan)
      },
      {
        path: 'lesson-planner/:id',
        element: withSuspense(LessonPlanDetail)
      },
      {
        path: 'lesson-planner/:id/edit',
        element: withSuspense(CreateLessonPlan)
      },
      {
        path: 'portfolio',
        element: withSuspense(Portfolio)
      },
      {
        path: 'portfolio/:id',
        element: withSuspense(StudentDetail)
      },
      {
        path: 'portfolio/:id/add-record',
        element: withSuspense(AddRecord)
      },
      {
        path: 'portfolio/:id/edit-record/:recordId',
        element: withSuspense(EditRecord)
      },
      {
        path: 'portfolio/create',
        element: withSuspense(PortfolioCreateStudent)
      },
      {
        path: 'portfolio/:id/edit',
        element: withSuspense(PortfolioEditStudent)
      },
      {
        path: 'settings',
        element: withSuspense(Settings)
      },
      {
        path: 'reports',
        element: withSuspense(Reports)
      },
      {
        path: 'profile',
        element: withSuspense(Profile)
      },
      {
        path: 'notifications',
        element: withSuspense(Notifications)
      }
    ]
  },
  {
    path: '/login',
    element: withSuspense(Login)
  },
  {
    path: '/register',
    element: withSuspense(Register)
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
];

export default router;
