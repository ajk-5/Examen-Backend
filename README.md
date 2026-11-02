To start this TS project use:
```Text
npm init -y
npm install --save-dev typescript @types/node
npx tsc --init
```

To install the project dependencies:
```Text
npm install
```

To add Express and PostgreSQL support:
```powershell
npm install express pg
npm install --save-dev @types/express @types/pg
```

Express handles HTTP routes. `pg` connects to PostgreSQL. The `@types` packages provide TypeScript types.

