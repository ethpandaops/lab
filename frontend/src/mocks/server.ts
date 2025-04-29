import { setupServer } from 'msw/node'
import handlers from '@/mocks/handlers.ts'

const server = setupServer(...handlers)
export default server
