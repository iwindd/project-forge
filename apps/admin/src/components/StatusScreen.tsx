import Link from 'next/link';
import type React from 'react';
import styles from './StatusScreen.module.css';

type StatusScreenLink = {
  label: string;
  description: string;
  href: string;
};

type StatusScreenTone = 'info' | 'danger';

type StatusActionVariant = 'solid' | 'ghost';

/** Link styled as a status-screen action button. */
export function StatusActionLink({
  href,
  variant = 'solid',
  children,
}: {
  href: string;
  variant?: StatusActionVariant;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={styles.action} data-variant={variant}>
      {children}
    </Link>
  );
}

/**
 * Plain anchor styled as a status-screen action button. Use instead of
 * `StatusActionLink` when a full document reload is wanted, for example from
 * `global-error.tsx` where client-side navigation may hit the same broken tree.
 */
export function StatusActionAnchor({
  href,
  variant = 'solid',
  children,
}: {
  href: string;
  variant?: StatusActionVariant;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className={styles.action} data-variant={variant}>
      {children}
    </a>
  );
}

/** Button styled as a status-screen action button. Only usable from a Client Component. */
export function StatusActionButton({
  onClick,
  variant = 'solid',
  children,
}: {
  onClick: () => void;
  variant?: StatusActionVariant;
  children: React.ReactNode;
}) {
  return (
    <button type='button' className={styles.action} data-variant={variant} onClick={onClick}>
      {children}
    </button>
  );
}

type StatusScreenProps = {
  /** HTTP status code shown as the display figure, e.g. "404". */
  code: string;
  /** Short pill label above the heading. */
  eyebrow: string;
  /** Main heading of the status page. */
  title: string;
  /** Supporting copy explaining what happened and what to do next. */
  description: string;
  /** Colour treatment: `info` for 404, `danger` for 5xx. */
  tone?: StatusScreenTone;
  /**
   * `inline` sits inside the public layout between the site nav and footer.
   * `standalone` fills the viewport for documents that render without the layout.
   */
  layout?: 'inline' | 'standalone';
  /** Primary/secondary buttons. Rendered in the action row under the copy. */
  children?: React.ReactNode;
  /** Optional technical reference such as an error digest. */
  reference?: string;
  /** Section links offered as a next step. Pass an empty array to hide them. */
  links?: StatusScreenLink[];
  /**
   * Shows the SimpleDashboard logo above the copy. Use on `standalone` screens that render
   * without the site nav, so the page is still recognisable as part of the site.
   */
  brand?: boolean;
};

const DEFAULT_LINKS: StatusScreenLink[] = [];

const WATERMARK_TEXT = 'ARDA ARDA ARDA\nARDA ARDA ARDA';

function ToneIcon({ tone }: { tone: StatusScreenTone }) {
  if (tone === 'danger') {
    return (
      <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
        <path
          d='M12 9v4m0 3h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z'
          stroke='currentColor'
          strokeWidth='1.8'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    );
  }

  return (
    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <circle cx='11' cy='11' r='7' stroke='currentColor' strokeWidth='1.8' />
      <path d='m20 20-3.6-3.6' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
      <path d='M8.6 8.6l4.8 4.8m0-4.8-4.8 4.8' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
    </svg>
  );
}

/**
 * Shared full-page status screen for the public frontend (404, 500 and friends).
 *
 * The component carries its own design tokens in `StatusScreen.module.css`, so it
 * renders identically inside the `(web)` root layout and inside the standalone
 * `global-not-found` / `global-error` documents that bypass that layout.
 */
export default function StatusScreen({
  code,
  eyebrow,
  title,
  description,
  tone = 'info',
  layout = 'inline',
  children,
  reference,
  links = DEFAULT_LINKS,
  brand = false,
}: StatusScreenProps) {
  return (
    <section className={styles.root} data-tone={tone} data-layout={layout}>
      <div className={styles.watermark} aria-hidden='true'>
        {WATERMARK_TEXT}
      </div>

      <div className={styles.inner}>
        {brand ? (
          <div className={styles.brandRow}>
            <Link href='/' className={styles.brand}>
              {/* eslint-disable-next-line @next/next/no-img-element -- matches SiteNav, no optimisation needed on an error page */}
              <img src='/img/logo.png' alt='SimpleDashboard Template' />
            </Link>
          </div>
        ) : null}

        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden='true' />
          {eyebrow}
        </p>

        <div className={styles.figure}>
          <span className={styles.figureStack}>
            <span className={styles.figureGlow} aria-hidden='true' />
            <span className={styles.figureCode}>{code}</span>
            <span className={styles.figureIcon} aria-hidden='true'>
              <ToneIcon tone={tone} />
            </span>
          </span>
        </div>

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>

        {children ? <div className={styles.actions}>{children}</div> : null}

        {reference ? (
          <p className={styles.reference}>
            รหัสอ้างอิงสำหรับแจ้งผู้ดูแลระบบ: <code>{reference}</code>
          </p>
        ) : null}

        {links.length ? (
          <nav className={styles.links} aria-label='ไปยังส่วนอื่นของเว็บไซต์'>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={styles.linkCard}>
                <span className={styles.linkLabel}>{link.label}</span>
                <span className={styles.linkDescription}>{link.description}</span>
                <span className={styles.linkArrow} aria-hidden='true'>
                  <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                    <path
                      d='M5 12h14m-6-6 6 6-6 6'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </span>
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
