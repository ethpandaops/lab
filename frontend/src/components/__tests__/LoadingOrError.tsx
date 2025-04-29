import { render, screen } from '@testing-library/react'
import LoadingOrError from '@/components/__tests__/LoadingOrError'

describe('<LoadingOrError />', () => {
	it('renders', () => {
		render(<LoadingOrError />)

		expect(screen.getByText('Loading...')).toBeInTheDocument()
	})
	it('renders with an error message', () => {
		render(<LoadingOrError error={new Error('Failed to fetch')} />)

		expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
	})
})
