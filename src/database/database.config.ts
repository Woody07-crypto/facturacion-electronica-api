import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function buildDbConfig(): TypeOrmModuleOptions {
  if (process.env.DB_TYPE === 'postgres') {
    return {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'facturacion',
      autoLoadEntities: true,
      synchronize: true,
    };
  }
  const enMemoria = process.env.DB_NAME === ':memory:';
  return {
    type: 'sqljs',
    ...(enMemoria ? {} : { location: process.env.DB_NAME || 'facturacion.sqlite', autoSave: true }),
    autoLoadEntities: true,
    synchronize: true,
  };
}
