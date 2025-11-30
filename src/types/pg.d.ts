declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    query(queryText: string, values?: any[]): Promise<any>;
    connect(): Promise<any>;
    end(): Promise<void>;
  }
  export class Client {
    constructor(config?: any);
    query(queryText: string, values?: any[]): Promise<any>;
    connect(): Promise<void>;
    end(): Promise<void>;
  }
}
