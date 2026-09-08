import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import 'reflect-metadata'
import { AppModule } from './app.module.js'

loadEnv({ path: resolve(process.cwd(), '.env') })
loadEnv({ path: resolve(process.cwd(), '../../.env') })

const app = await NestFactory.create(AppModule)
app.setGlobalPrefix('api/v1')
app.use(cookieParser())
app.enableCors({
  origin: process.env.WEB_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'X-Request-ID'
  ]
})
await app.listen(Number(process.env.API_PORT || 3007), '0.0.0.0')
