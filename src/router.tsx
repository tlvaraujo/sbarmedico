import { createHashRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ListScreen } from './screens/ListScreen'
import { PatientForm } from './screens/PatientForm'
import { SbarPreview } from './screens/SbarPreview'
import { HandoffScreen } from './screens/HandoffScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ImportScreen } from './screens/ImportScreen'

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <ListScreen /> },
      { path: 'novo', element: <PatientForm /> },
      { path: 'importar', element: <ImportScreen /> },
      { path: 'paciente/:id', element: <PatientForm /> },
      { path: 'sbar/:id', element: <SbarPreview /> },
      { path: 'passagem', element: <HandoffScreen /> },
      { path: 'ajustes', element: <SettingsScreen /> },
    ],
  },
])
