import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { newDb, IMemoryDb } from 'pg-mem';

export interface DatabaseService {
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  getClient(): Promise<{
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    release(): void;
  }>;
  transaction<T>(fn: (client: {
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  }) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

class PostgresDatabaseService implements DatabaseService {
  private pool: Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dormex',
      max: 20,
    });
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async getClient() {
    const client = await this.pool.connect();
    return {
      query: <T extends QueryResultRow = any>(text: string, params?: any[]) => client.query<T>(text, params),
      release: () => client.release(),
    };
  }

  async transaction<T>(fn: (client: {
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  }) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class MemoryDatabaseService implements DatabaseService {
  private db: IMemoryDb;
  private adapter: any;

  constructor() {
    this.db = newDb({
      autoCreateForeignKeyIndices: true,
    });
    // Register uuid generation helper
    this.db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: (this.db.public as any).getType('text'),
      implementation: () => crypto.randomUUID(),
    });

    const { Pool } = this.db.adapters.createPg();
    this.adapter = new Pool();
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.adapter.query(text, params);
  }

  async getClient() {
    const client = await this.adapter.connect();
    return {
      query: <T extends QueryResultRow = any>(text: string, params?: any[]) => client.query(text, params),
      release: () => client.release(),
    };
  }

  async transaction<T>(fn: (client: {
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  }) => Promise<T>): Promise<T> {
    const client = await this.adapter.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.adapter.end();
  }
}

let dbInstance: DatabaseService | null = null;

export function getDatabaseService(forceMemory: boolean = false): DatabaseService {
  if (dbInstance) {
    return dbInstance;
  }

  if (forceMemory || process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL) {
    dbInstance = new MemoryDatabaseService();
  } else {
    dbInstance = new PostgresDatabaseService();
  }

  return dbInstance;
}

export function resetDatabaseInstance(): void {
  dbInstance = null;
}
