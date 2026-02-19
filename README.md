# Stellar Micro Donation API

A RESTful API for managing micro-donations on the Stellar blockchain network. This API enables users to create wallets, send donations, and stream real-time transaction updates.

## Features

- 🔐 Wallet creation and management on Stellar testnet/mainnet
- 💸 Micro-donation transactions with XLM
- 📊 Transaction history and tracking
- 🔄 Real-time transaction streaming
- 🌐 RESTful API design

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Stellar account (testnet or mainnet)
- SQLite or PostgreSQL (for transaction storage)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Stellar-Micro-Donation-API.git
cd Stellar-Micro-Donation-API
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see Configuration section below)

4. Initialize the database:
```bash
npm run init-db
```

## Configuration

Create a `.env` file in the `src` directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Stellar Network Configuration
STELLAR_NETWORK=testnet
# Use 'testnet' for testing or 'public' for mainnet
HORIZON_URL=https://horizon-testnet.stellar.org

# Database Configuration
DB_TYPE=sqlite
# Options: sqlite, postgres
DB_PATH=./donations.db
# For SQLite

# PostgreSQL Configuration (if using postgres)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=stellar_donations
# DB_USER=your_username
# DB_PASSWORD=your_password

# API Configuration
API_PREFIX=/api/v1
RATE_LIMIT=100
# Requests per 15 minutes

# Optional: Stellar Account (for service operations)
SERVICE_SECRET_KEY=your_stellar_secret_key_here
```

## Starting the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### 1. Wallet Management

#### Create a New Wallet
Creates a new Stellar wallet with a keypair.

```bash
curl -X POST http://localhost:3000/api/v1/wallet/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Donation Wallet"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "publicKey": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "secretKey": "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "name": "My Donation Wallet",
    "balance": "0"
  }
}
```

#### Get Wallet Balance
Retrieves the current balance of a wallet.

```bash
curl -X GET http://localhost:3000/api/v1/wallet/balance/GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Response:**
```json
{
  "success": true,
  "data": {
    "publicKey": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "balance": "100.0000000",
    "asset": "XLM"
  }
}
```

#### Fund Testnet Wallet
Funds a wallet using Stellar's Friendbot (testnet only).

```bash
curl -X POST http://localhost:3000/api/v1/wallet/fund \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Account funded successfully",
  "data": {
    "balance": "10000.0000000"
  }
}
```

### 2. Donations

#### Send a Donation
Sends a micro-donation from one wallet to another.

```bash
curl -X POST http://localhost:3000/api/v1/donation/send \
  -H "Content-Type: application/json" \
  -d '{
    "sourceSecret": "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "destinationPublic": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "amount": "5.50",
    "memo": "Coffee donation"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "abc123def456...",
    "source": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "destination": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "amount": "5.50",
    "memo": "Coffee donation",
    "timestamp": "2026-02-19T10:30:00Z",
    "ledger": 12345678
  }
}
```

#### Get Donation History
Retrieves donation history for a specific wallet.

```bash
curl -X GET "http://localhost:3000/api/v1/donation/history/GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "publicKey": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "transactions": [
      {
        "id": "abc123def456...",
        "type": "sent",
        "amount": "5.50",
        "destination": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "memo": "Coffee donation",
        "timestamp": "2026-02-19T10:30:00Z"
      },
      {
        "id": "def789ghi012...",
        "type": "received",
        "amount": "10.00",
        "source": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "memo": "Thank you!",
        "timestamp": "2026-02-18T15:20:00Z"
      }
    ],
    "total": 2
  }
}
```

### 3. Transaction Streaming

#### Stream Real-time Transactions
Opens a Server-Sent Events (SSE) connection to stream real-time transactions for a wallet.

```bash
curl -N http://localhost:3000/api/v1/stream/transactions/GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Response (SSE Stream):**
```
data: {"type":"payment","amount":"5.50","from":"GXXX...","to":"GYYY...","timestamp":"2026-02-19T10:30:00Z"}

data: {"type":"payment","amount":"2.00","from":"GZZZ...","to":"GXXX...","timestamp":"2026-02-19T10:31:15Z"}
```

**JavaScript Example:**
```javascript
const eventSource = new EventSource('http://localhost:3000/api/v1/stream/transactions/GXXX...');

eventSource.onmessage = (event) => {
  const transaction = JSON.parse(event.data);
  console.log('New transaction:', transaction);
};

eventSource.onerror = (error) => {
  console.error('Stream error:', error);
  eventSource.close();
};
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

- `INVALID_REQUEST` - Missing or invalid parameters
- `WALLET_NOT_FOUND` - Wallet address doesn't exist
- `INSUFFICIENT_BALANCE` - Not enough XLM for transaction
- `NETWORK_ERROR` - Stellar network connection issue
- `INVALID_SECRET_KEY` - Invalid or malformed secret key
- `TRANSACTION_FAILED` - Transaction submission failed

## Testing with Postman

Import the following collection to test all endpoints:

1. Create a new collection in Postman
2. Add the base URL as a variable: `{{baseUrl}} = http://localhost:3000/api/v1`
3. Import the endpoints listed above
4. Start with creating a wallet, funding it (testnet), then testing donations

## Development

### Project Structure

```
Stellar-Micro-Donation-API/
├── src/
│   ├── config/
│   │   └── stellar.js          # Stellar network configuration
│   ├── routes/
│   │   ├── models/
│   │   │   ├── transaction.js  # Transaction data model
│   │   │   └── user.js         # User/wallet data model
│   │   ├── services/
│   │   │   └── StellarService.js # Stellar blockchain service
│   │   ├── app.js              # Express app setup
│   │   ├── donation.js         # Donation routes
│   │   ├── wallet.js           # Wallet routes
│   │   └── stream.js           # Streaming routes
│   ├── scripts/
│   │   └── initDB.js           # Database initialization
│   └── .env                    # Environment variables
└── README.md
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Contributing

We welcome contributions! Please follow these guidelines:

### How to Contribute

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes and commit:
   ```bash
   git commit -m "Add: description of your changes"
   ```
4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style and conventions
- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Keep PRs focused on a single feature or fix

### Code Style

- Use ES6+ JavaScript features
- Follow ESLint configuration
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Reporting Issues

- Use the GitHub issue tracker
- Provide clear description and steps to reproduce
- Include error messages and logs
- Specify your environment (OS, Node version, etc.)

## Security

- Never commit your `.env` file or secret keys
- Use testnet for development and testing
- Validate all user inputs
- Keep dependencies updated
- Report security vulnerabilities privately to [security@example.com]

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Stellar SDK for JavaScript](https://github.com/stellar/js-stellar-sdk)
- [Horizon API Reference](https://developers.stellar.org/api/horizon)
- [Stellar Laboratory](https://laboratory.stellar.org/) - Test transactions

## License

MIT License - see LICENSE file for details

## Support

For questions or support:
- Open an issue on GitHub
- Contact: [your-email@example.com]
- Discord: [Your Discord Server]

## Roadmap

- [ ] Add support for custom assets
- [ ] Implement recurring donations
- [ ] Add webhook notifications
- [ ] Create admin dashboard
- [ ] Add multi-signature support
- [ ] Implement donation campaigns

---

Built with ❤️ using Stellar blockchain
