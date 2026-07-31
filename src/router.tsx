import { createHashRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BibliotecaScreen } from './screens/BibliotecaScreen'
import { EntradaScreen } from './screens/EntradaScreen'
import { RevisarScreen } from './screens/RevisarScreen'
import { EditarScreen } from './screens/EditarScreen'

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <BibliotecaScreen /> },
      { path: 'novo', element: <EntradaScreen /> },
      { path: 'revisar', element: <RevisarScreen /> },
      { path: 'editar/:id', element: <EditarScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
