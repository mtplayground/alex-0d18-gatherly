/* global console, process, URL */

const required = [
  'DATABASE_URL',
  'OBJECT_STORAGE_ACCESS_KEY_ID',
  'OBJECT_STORAGE_SECRET_ACCESS_KEY',
  'OBJECT_STORAGE_BUCKET',
  'OBJECT_STORAGE_PREFIX',
  'OBJECT_STORAGE_ENDPOINT',
  'OBJECT_STORAGE_REGION',
  'OBJECT_STORAGE_FORCE_PATH_STYLE',
];

const optionalGroups = [
  ['MCTAI_AUTH_URL', 'MCTAI_AUTH_APP_TOKEN', 'MCTAI_AUTH_JWKS_URL'],
  ['MCTAI_EMAIL_URL', 'MCTAI_EMAIL_APP_TOKEN'],
];

const urlVariables = [
  'DATABASE_URL',
  'OBJECT_STORAGE_ENDPOINT',
  'MCTAI_AUTH_URL',
  'MCTAI_AUTH_JWKS_URL',
  'SELF_URL',
  'MCTAI_EMAIL_URL',
  'ALLOWED_CORS_ORIGIN',
];

const errors = [];

function value(name) {
  return process.env[name]?.trim() ?? '';
}

for (const name of required) {
  if (!value(name)) {
    errors.push(`${name} is required`);
  }
}

for (const group of optionalGroups) {
  const present = group.filter((name) => value(name));
  if (present.length > 0 && present.length < group.length) {
    errors.push(`${group.join(', ')} must be set together`);
  }
}

for (const name of urlVariables) {
  const current = value(name);
  if (!current) {
    continue;
  }

  try {
    new URL(current);
  } catch {
    errors.push(`${name} must be a valid URL`);
  }
}

const prefix = value('OBJECT_STORAGE_PREFIX');
if (prefix && !prefix.endsWith('/')) {
  errors.push('OBJECT_STORAGE_PREFIX must end with /');
}

const forcePathStyle = value('OBJECT_STORAGE_FORCE_PATH_STYLE').toLowerCase();
if (forcePathStyle && forcePathStyle !== 'true' && forcePathStyle !== 'false') {
  errors.push('OBJECT_STORAGE_FORCE_PATH_STYLE must be true or false');
}

const maxConnections = value('DATABASE_MAX_CONNECTIONS');
if (maxConnections) {
  const parsed = Number.parseInt(maxConnections, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    errors.push('DATABASE_MAX_CONNECTIONS must be a positive integer');
  }
}

const port = value('PORT');
if (port) {
  const parsed = Number.parseInt(port, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    errors.push('PORT must be an integer between 1 and 65535');
  }
}

if (errors.length > 0) {
  console.error('Deployment environment check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Deployment environment check passed.');
