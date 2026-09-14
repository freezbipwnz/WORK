import { BrowserRouter, Route, Routes } from 'react-router'
import Layout from './components/Layout'
import GameScreen from './pages/GameScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<GameScreen />} />
          <Route path="*" element={<GameScreen />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
