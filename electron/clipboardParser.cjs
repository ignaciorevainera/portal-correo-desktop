/**
 * Clipboard Parser & Validator for Portal Correo Desktop
 * Analyzes clipboard text triggered by Global Hotkey (Ctrl+Space)
 * to determine if it is a valid target (IP or Corporate Hostname).
 */

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

// Corporate Hostname: 2-30 chars, alphanumeric with hyphens, not purely numeric
const HOSTNAME_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,28}[A-Za-z0-9])?$/;

function parseClipboardQuery(rawText) {
  if (typeof rawText !== 'string') {
    return {
      isValid: false,
      query: '',
      type: 'none',
      autoSearch: false,
    };
  }

  const cleaned = rawText.trim();
  if (!cleaned) {
    return {
      isValid: false,
      query: '',
      type: 'none',
      autoSearch: false,
    };
  }

  // Reject URLs, SQL, or strings with spaces / newlines / excessive length
  if (cleaned.length > 32 || /\s/.test(cleaned) || /^(?:https?|ftp|file):\/\//i.test(cleaned)) {
    return {
      isValid: false,
      query: '',
      type: 'none',
      autoSearch: false,
    };
  }

  // Check IPv4
  if (IPV4_REGEX.test(cleaned)) {
    return {
      isValid: true,
      query: cleaned,
      type: 'ip',
      autoSearch: true,
    };
  }

  // Check Hostname
  if (HOSTNAME_REGEX.test(cleaned)) {
    return {
      isValid: true,
      query: cleaned.toUpperCase(),
      type: 'hostname',
      autoSearch: true,
    };
  }

  return {
    isValid: false,
    query: '',
    type: 'none',
    autoSearch: false,
  };
}

module.exports = {
  parseClipboardQuery,
};
