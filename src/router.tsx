import { createHashRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BibliotecaScreen } from './screens/BibliotecaScreen'
import { EntradaScreen } from './screens/EntradaScreen'
import { RevisarScreen } from './screens/RevisarScreen'

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <BibliotecaScreen /> },
      { path: 'novo', element: <EntradaScreen /> },
      { path: 'revisar', element: <RevisarScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
