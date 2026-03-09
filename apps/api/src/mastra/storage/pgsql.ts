import { PostgresStore } from '@mastra/pg'

const store = new PostgresStore({
    id: 'pg-storage',
    host: process.env.PG_HOST!,
    port: Number(process.env.PG_PORT),
    database: process.env.PG_DATABASE!,
    user: process.env.PG_USER!,
    password: process.env.PG_PASSWORD!,
})


export default store