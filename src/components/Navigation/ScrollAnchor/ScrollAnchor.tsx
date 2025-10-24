import { type JSX, useEffect, useState } from 'react';
import clsx from 'clsx';
import { LinkIcon, CheckIcon } from '@heroicons/react/20/solid';
import type { ScrollAnchorProps } from './ScrollAnchor.types';

/**
 * ScrollAnchor wraps content and makes it linkable via URL hash.
 *
 * Features:
 * - Smooth scrolls to the element when clicked
 * - Updates URL hash without page reload
 * - Supports deep linking - scrolls to element on page load if hash matches
 * - Shows copy-to-clipboard link icon on hover
 * - Visual feedback when link is copied
 *
 * @example
 * ```tsx
 * <ScrollAnchor id="attestations">
 *   <Header size="xs" title="Attestations" />
 * </ScrollAnchor>
 * ```
 */
export function ScrollAnchor({
  id,
  children,
  className,
  showLinkIcon = true,
  scrollOffset = 80,
  onClick,
}: ScrollAnchorProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  /**
   * Scrolls to the anchor element with smooth behavior
   */
  const scrollToAnchor = (anchorId: string, offset: number): void => {
    const element = document.getElementById(anchorId);
    if (!element) return;

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  };

  /**
   * Handles click on the anchor - updates URL and scrolls
   */
  const handleClick = (): void => {
    // Update URL hash
    window.history.pushState(null, '', `#${id}`);

    // Scroll to element
    scrollToAnchor(id, scrollOffset);

    // Call optional callback
    onClick?.();
  };

  /**
   * Copies the full URL with hash to clipboard
   */
  const handleCopyLink = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation(); // Prevent triggering scroll

    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    await navigator.clipboard.writeText(url);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * On mount, check if URL hash matches this anchor and scroll to it
   */
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove '#' prefix
    if (hash === id) {
      // Small delay to ensure DOM is ready
      setTimeout(() => scrollToAnchor(id, scrollOffset), 100);
    }
  }, [id, scrollOffset]);

  return (
    <div id={id} className={clsx('group inline-flex items-start gap-2', className)}>
      {/* Clickable wrapper */}
      <div
        onClick={handleClick}
        className="cursor-pointer transition-opacity hover:opacity-80"
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`Link to ${id} section`}
      >
        {children}
      </div>

      {/* Link icon - appears on hover, positioned inline next to content */}
      {showLinkIcon && (
        <button
          onClick={handleCopyLink}
          className={clsx(
            'shrink-0 self-start rounded-sm p-1',
            'opacity-0 transition-all group-hover:opacity-100',
            'hover:bg-muted/20 focus:outline-hidden focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary',
            'text-muted hover:text-foreground'
          )}
          aria-label="Copy link to clipboard"
          title={copied ? 'Copied!' : 'Copy link'}
        >
          {copied ? <CheckIcon className="size-4 text-success" /> : <LinkIcon className="size-4" />}
        </button>
      )}
    </div>
  );
}
