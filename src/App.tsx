import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ThemeProvider } from './hooks/useTheme'
import { AuthProvider } from './hooks/useAuth'
import { TooltipProvider } from './components/ui/tooltip'
import { Toaster } from './components/ui/sonner'

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
