# web-shared-calendar

## Database

The application uses Prisma ORM with PostgreSQL. Set `DATABASE_URL` in `.env.local`,
then apply checked-in schema migrations with:

```sh
npm run db:migrate
```

For databases that already contain the tables from the previous SQL setup, baseline
the initial migration once before applying later migrations:

```sh
npx prisma migrate resolve --applied 20261026000000_init
npm run db:migrate
```

Use `npx prisma migrate dev --name <change>` to create new migrations during
development. Do not edit a migration after it has been applied to a shared database.