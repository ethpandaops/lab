import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { CopyToClipboard } from './CopyToClipboard';

// Helper to render with NotificationProvider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<NotificationProvider>{ui}</NotificationProvider>);
};

// Mock ClipboardItem
global.ClipboardItem = class ClipboardItem {
  constructor(public data: Record<string, Blob>) {}
  get types(): string[] {
    return Object.keys(this.data);
  }
} as unknown as typeof ClipboardItem;

describe('CopyToClipboard', () => {
  let mockWriteText: ReturnType<typeof vi.fn>;
  let mockWrite: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Use vi.spyOn to mock navigator.clipboard methods
    mockWriteText = vi.fn().mockResolvedValue(undefined);
    mockWrite = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {
        writeText: mockWriteText,
        write: mockWrite,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders default clipboard icon button', () => {
    renderWithProvider(<CopyToClipboard content="test" />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });
    expect(button).toBeInTheDocument();
  });

  it('renders custom children when provided', () => {
    renderWithProvider(
      <CopyToClipboard content="test">
        <button type="button">Custom Button</button>
      </CopyToClipboard>
    );
    const button = screen.getByRole('button', { name: /custom button/i });
    expect(button).toBeInTheDocument();
  });

  it.skip('copies text content to clipboard on click', async () => {
    const user = userEvent.setup();

    renderWithProvider(<CopyToClipboard content="Hello World" />);

    // Verify notification is NOT visible initially
    expect(screen.queryByText(/copied to clipboard!/i)).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: /copy to clipboard/i });
    await user.click(button);

    // Wait for the success notification to appear (proves the copy completed)
    await waitFor(() => {
      expect(screen.getByText(/copied to clipboard!/i)).toBeInTheDocument();
    });

    // Then verify the clipboard API was called
    expect(mockWriteText).toHaveBeenCalledWith('Hello World');
  });

  it.skip('copies blob content to clipboard on click', async () => {
    mockWrite.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const blob = new Blob(['test'], { type: 'text/plain' });

    renderWithProvider(<CopyToClipboard content={blob} />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    // Wait for the success notification to appear
    await waitFor(() => {
      expect(screen.getByText(/copied to clipboard!/i)).toBeInTheDocument();
    });

    // Then verify the clipboard API was called
    expect(mockWrite).toHaveBeenCalledWith([
      expect.objectContaining({
        types: ['text/plain'],
      }),
    ]);
  });

  it('shows success notification after successful copy', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProvider(<CopyToClipboard content="test" />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/copied to clipboard!/i)).toBeInTheDocument();
    });
  });

  it('shows custom success message when provided', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProvider(<CopyToClipboard content="test" successMessage="Custom success!" />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/custom success!/i)).toBeInTheDocument();
    });
  });

  it.skip('shows error notification when copy fails', async () => {
    mockWriteText.mockRejectedValue(new Error('Copy failed'));
    const user = userEvent.setup();

    renderWithProvider(<CopyToClipboard content="test" />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/failed to copy to clipboard/i)).toBeInTheDocument();
    });
  });

  it.skip('shows custom error message when provided', async () => {
    mockWriteText.mockRejectedValue(new Error('Copy failed'));
    const user = userEvent.setup();

    renderWithProvider(<CopyToClipboard content="test" errorMessage="Custom error!" />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/custom error!/i)).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback after successful copy', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    renderWithProvider(<CopyToClipboard content="test" onSuccess={onSuccess} />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it.skip('calls onError callback when copy fails', async () => {
    const error = new Error('Copy failed');
    mockWriteText.mockRejectedValue(error);
    const onError = vi.fn();
    const user = userEvent.setup();

    renderWithProvider(<CopyToClipboard content="test" onError={onError} />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('does not copy when disabled', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProvider(<CopyToClipboard content="test" disabled />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    expect(mockWriteText).not.toHaveBeenCalled();
  });

  it('applies custom className to default button', () => {
    renderWithProvider(<CopyToClipboard content="test" className="custom-class" />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });
    expect(button).toHaveClass('custom-class');
  });

  it('uses custom aria-label when provided', () => {
    renderWithProvider(<CopyToClipboard content="test" ariaLabel="Copy this text" />);
    const button = screen.getByRole('button', { name: /copy this text/i });
    expect(button).toBeInTheDocument();
  });

  it.skip('handles async content preparation', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const asyncContent = vi.fn().mockResolvedValue('Async content');

    renderWithProvider(<CopyToClipboard content={asyncContent} />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    // Wait for the success notification to appear
    await waitFor(() => {
      expect(screen.getByText(/copied to clipboard!/i)).toBeInTheDocument();
    });

    // Then verify the async function was called and clipboard API was called
    expect(asyncContent).toHaveBeenCalled();
    expect(mockWriteText).toHaveBeenCalledWith('Async content');
  });

  it.skip('handles async blob content', async () => {
    mockWrite.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const blob = new Blob(['async test'], { type: 'text/plain' });
    const asyncContent = vi.fn().mockResolvedValue(blob);

    renderWithProvider(<CopyToClipboard content={asyncContent} />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    // Wait for the success notification to appear
    await waitFor(() => {
      expect(screen.getByText(/copied to clipboard!/i)).toBeInTheDocument();
    });

    // Then verify the async function was called and clipboard API was called
    expect(asyncContent).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalledWith([
      expect.objectContaining({
        types: ['text/plain'],
      }),
    ]);
  });

  it('shows error notification when async content preparation fails', async () => {
    const error = new Error('Preparation failed');
    const asyncContent = vi.fn().mockRejectedValue(error);
    const user = userEvent.setup();

    renderWithProvider(<CopyToClipboard content={asyncContent} />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/failed to copy to clipboard/i)).toBeInTheDocument();
    });
  });
});
