// Reserved slugs that cannot be used as profile URLs.
// These match existing routes and common web paths to prevent collisions.
export const RESERVED_SLUGS = [
  // Existing app routes
  'pay', 'payment', 'payment-success', 'dashboard', 'settings',
  'auth', 'directory', 'privacy', 'terms', 'cookie-settings', 'faq',
  'blog', 'rate', 'admin-setup', 'admin', 'email-preview', 'email-test',
  'api', 'sitemap', 'solution-unsolicited-dm',
  // Common web paths
  'login', 'signup', 'register', 'logout',
  'about', 'contact', 'help', 'support', 'pricing', 'features',
  // Brand and system protection
  'fastpass', 'root', 'system', 'stripe', 'postmark',
];
