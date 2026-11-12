import { describe, it, expect, vi, type MockInstance } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { CopyToClipboard } from './CopyToClipboard';

// Helper to render with NotificationProvider
const renderWithProvider = (ui: React.ReactElement): ReturnType<typeof render> => {
  return render(<NotificationProvider>{ui}</NotificationProvider>);
};

// Mock ClipboardItem
global.ClipboardItem = class ClipboardItem {
  data: Record<string, Blob>;
  constructor(data: Record<string, Blob>) {
    this.data = data;
  }
  get types(): string[] {
    return Object.keys(this.data);
  }
} as unknown as typeof ClipboardItem;

describe('CopyToClipboard', () => {
  /**
   * A user, and spies on the clipboard. userEvent.setup() puts its own clipboard on
   * navigator, so the spies go on that one, after it.
   */
  const setup = (): {
    user: ReturnType<typeof userEvent.setup>;
    writeText: MockInstance<Clipboard['writeText']>;
    write: MockInstance<Clipboard['write']>;
  } => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const write = vi.spyOn(navigator.clipboard, 'write').mockResolvedValue(undefined);
    return { user, writeText, write };
  };

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

  it('copies text content to clipboard on click', async () => {
    const { user, writeText } = setup();

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
    expect(writeText).toHaveBeenCalledWith('Hello World');
  });

  it('copies blob content to clipboard on click', async () => {
    const { user, write } = setup();
    write.mockResolvedValue(undefined);
    const blob = new Blob(['test'], { type: 'text/plain' });

    renderWithProvider(<CopyToClipboard content={blob} />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    // Wait for the success notification to appear
    await waitFor(() => {
      expect(screen.getByText(/copied to clipboard!/i)).toBeInTheDocument();
    });

    // Then verify the clipboard API was called
    expect(write).toHaveBeenCalledWith([
      expect.objectContaining({
        types: ['text/plain'],
      }),
    ]);
  });

  it('shows success notification after successful copy', async () => {
    const { user, writeText } = setup();
    writeText.mockResolvedValue(undefined);

    renderWithProvider(<CopyToClipboard content="test" />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/copied to clipboard!/i)).toBeInTheDocument();
    });
  });

  it('shows custom success message when provided', async () => {
    const { user, writeText } = setup();
    writeText.mockResolvedValue(undefined);

    renderWithProvider(<CopyToClipboard content="test" successMessage="Custom success!" />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/custom success!/i)).toBeInTheDocument();
    });
  });

  it('shows error notification when copy fails', async () => {
    const { user, writeText } = setup();
    writeText.mockRejectedValue(new Error('Copy failed'));

    renderWithProvider(<CopyToClipboard content="test" />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/failed to copy to clipboard/i)).toBeInTheDocument();
    });
  });

  it('shows custom error message when provided', async () => {
    const { user, writeText } = setup();
    writeText.mockRejectedValue(new Error('Copy failed'));

    renderWithProvider(<CopyToClipboard content="test" errorMessage="Custom error!" />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/custom error!/i)).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback after successful copy', async () => {
    const { user, writeText } = setup();
    writeText.mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    renderWithProvider(<CopyToClipboard content="test" onSuccess={onSuccess} />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls onError callback when copy fails', async () => {
    const { user, writeText } = setup();
    const error = new Error('Copy failed');
    writeText.mockRejectedValue(error);
    const onError = vi.fn();

    renderWithProvider(<CopyToClipboard content="test" onError={onError} />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('does not copy when disabled', async () => {
    const { user, writeText } = setup();
    writeText.mockResolvedValue(undefined);

    renderWithProvider(<CopyToClipboard content="test" disabled />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    expect(writeText).not.toHaveBeenCalled();
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

  it('handles async content preparation', async () => {
    const { user, writeText } = setup();
    writeText.mockResolvedValue(undefined);
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
    expect(writeText).toHaveBeenCalledWith('Async content');
  });

  it('handles async blob content', async () => {
    const { user, write } = setup();
    write.mockResolvedValue(undefined);
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
    expect(write).toHaveBeenCalledWith([
      expect.objectContaining({
        types: ['text/plain'],
      }),
    ]);
  });

  it('shows error notification when async content preparation fails', async () => {
    const { user } = setup();
    const error = new Error('Preparation failed');
    const asyncContent = vi.fn().mockRejectedValue(error);

    renderWithProvider(<CopyToClipboard content={asyncContent} />);
    const button = screen.getByRole('button', { name: /copy to clipboard/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/failed to copy to clipboard/i)).toBeInTheDocument();
    });
  });
});
