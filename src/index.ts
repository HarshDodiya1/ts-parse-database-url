import * as mUri from 'mongodb-uri';
import * as url from 'url';

export class DatabaseConfig {
  public readonly driver?: string;
  public readonly user?: string;
  public readonly password?: string;
  public readonly host?: string;
  public readonly port?: number;
  public readonly database?: string;
  public readonly filename?: string; // For SQLite
  public readonly hosts?: any; // For MongoDB
}

export default function(databaseUrl: string): DatabaseConfig {
  let parsedUrl = url.parse(databaseUrl, false, true);
  let config: any = {};
  
  // Parse query parameters using URLSearchParams
  if (parsedUrl.query) {
    const searchParams = new URLSearchParams(parsedUrl.query);
    for (const [key, value] of searchParams.entries()) {
      config[key] = value;
    }
  }

  // Fix trailing :
  config.driver = (parsedUrl.protocol || 'sqlite3:').replace(/\:$/, '');

  // Cloud Foundry fix
  if (config.driver == 'mysql2') config.driver = 'mysql';

  // Handle authentication
  if (parsedUrl.auth) {
    const [user, password] = parsedUrl.auth.split(':', 2);
    config.user = user;
    if (password) {
      config.password = password;
    }
  }

  if (config.driver === 'sqlite3') {
    if (parsedUrl.hostname) {
      if (parsedUrl.pathname) {
        // Relative path.
        config.filename = parsedUrl.hostname + parsedUrl.pathname;
      } else {
        // Just a filename.
        config.filename = parsedUrl.hostname;
      }
    } else {
      // Absolute path.
      config.filename = parsedUrl.pathname;
    }
  } else {
    if (config.driver === 'mongodb') {
      // MongoDB URLs can have multiple comma-separated host:port pairs
      const mongoParsedUrl = mUri.parse(databaseUrl);
      let mongoUrl: any = {};
      parsedUrl = { query: '' };
      
      if (mongoParsedUrl.hosts) {
        mongoUrl.hosts = mongoParsedUrl.hosts.map(host => ({
          ...host,
          port: host.port ? host.port.toString() : undefined
        }));
        
        if (mongoUrl.hosts.length === 1) {
          if (mongoUrl.hosts[0].host) mongoUrl.host = mongoUrl.hosts[0].host;
          if (mongoUrl.hosts[0].port) mongoUrl.port = mongoUrl.hosts[0].port;
        }
      }
      
      if (mongoParsedUrl.database) mongoUrl.database = mongoParsedUrl.database;
      config = { ...config, ...mongoUrl };
    } else {
      // Handle database names for other drivers
      if (parsedUrl.pathname) {
        config.database = parsedUrl.pathname
          .replace(/^\//, '')
          .replace(/\/$/, '');
      }
    }

    if (parsedUrl.hostname) config.host = parsedUrl.hostname;
    if (parsedUrl.port) config.port = parsedUrl.port;
  }

  return config as DatabaseConfig;
}
