# P-Post

A Next.js application with authentication and user management features.

## Features

- User authentication (login/register)
- User management dashboard
- Modern UI with Material-UI
- Database integration with Prisma
- TypeScript support

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Database (PostgreSQL/MySQL/SQLite)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd p-post
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Set up the database
```bash
npx prisma migrate dev
npx prisma db seed
```

5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript
- **UI Library**: Material-UI (MUI)
- **Database**: Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: CSS Modules, Material-UI theming

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   ├── components/     # App-specific components
│   ├── login/          # Login page
│   ├── register/       # Registration page
│   └── users/          # User management
├── components/         # Shared components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── lib/                # Library configurations
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

คำถาม
- ถ้าไม่ขอตำแหน่ง สามารถ ยื่นตำแหน่งให้เค้าได้ไหม
- 