# P2P Messaging with Micropayments

A decentralized peer-to-peer messaging platform built on the Stacks blockchain that integrates micropayments for spam prevention and monetization.

## 🌟 Features

- **Decentralized Messaging**: Direct peer-to-peer communication without centralized servers
- **Micropayments Integration**: Built-in STX payments for messages and tips
- **Spam Prevention**: Anti-spam fees and user-defined message pricing
- **User Profiles**: Customizable profiles with usernames, bios, and avatars
- **Contact Management**: Add contacts, block users, and manage relationships
- **Privacy Controls**: Configurable privacy levels and encryption options
- **Chat Management**: Organized conversations with payment tracking
- **Reputation System**: User reputation scoring and quality metrics

## 🚀 Getting Started

### Prerequisites

- Stacks blockchain development environment
- Clarinet CLI for local testing
- STX tokens for transactions and testing

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/p2p-messaging-platform.git
cd p2p-messaging-platform
```

2. Install Clarinet (if not already installed):
```bash
curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
sudo mv clarinet /usr/local/bin
```

3. Initialize the project:
```bash
clarinet new messaging-platform
cd messaging-platform
```

4. Add the contract to your project:
```bash
# Copy the contract file to contracts/messaging.clar
```

### Local Development

1. Start local Stacks blockchain:
```bash
clarinet integrate
```

2. Deploy contract locally:
```bash
clarinet deploy --local
```

3. Run tests:
```bash
clarinet test
```

## 📋 Usage

### User Registration

Register a new user account:

```clarity
(contract-call? .messaging register-user 
  "username" 
  "Display Name" 
  "User bio" 
  "avatar-hash" 
  "public-key" 
  u50000) ;; Message price in micro-STX
```

### Sending Messages

Send a message with optional payment:

```clarity
(contract-call? .messaging send-message
  'SP1234567890ABCDEF ;; Recipient address
  "content-hash" ;; IPFS hash or encrypted content
  "text" ;; Message type
  u10000 ;; Payment amount (micro-STX)
  false ;; Is encrypted
  none ;; Reply to message ID
  "") ;; Metadata
```

### Managing Contacts

Add a contact:

```clarity
(contract-call? .messaging add-contact
  'SP1234567890ABCDEF ;; Contact address
  "Friend Name" ;; Custom name
  "Notes about this contact") ;; Notes
```

Block a user:

```clarity
(contract-call? .messaging block-user
  'SP1234567890ABCDEF ;; User to block
  "Spam messages") ;; Reason
```

## 🏗️ Contract Architecture

### Core Components

- **User Management**: Registration, profiles, and authentication
- **Chat System**: Conversation management and message organization
- **Payment System**: Micropayments, fees, and earnings tracking
- **Privacy Controls**: Blocking, contacts, and privacy settings
- **Analytics**: User statistics and platform metrics

### Key Constants

- `PLATFORM-FEE`: 2% fee on all payments
- `MIN-PAYMENT`: 0.01 STX minimum payment
- `MAX-PAYMENT`: 100 STX maximum payment
- `SPAM-PREVENTION-FEE`: 0.001 STX anti-spam fee
- `MAX-MESSAGE-LENGTH`: 500 characters
- `MAX-USERNAME-LENGTH`: 30 characters

### Data Structures

#### User Profile
```clarity
{
  username: string-ascii,
  display-name: string-ascii,
  bio: string-ascii,
  avatar-hash: string-ascii,
  public-key: string-ascii,
  message-price: uint,
  total-received: uint,
  total-sent: uint,
  reputation-score: uint,
  is-premium: bool,
  joined-at: uint,
  last-active: uint,
  status: string-ascii
}
```

#### Message Structure
```clarity
{
  chat-id: uint,
  sender: principal,
  recipient: principal,
  content-hash: string-ascii,
  message-type: string-ascii,
  payment-amount: uint,
  timestamp: uint,
  is-read: bool,
  is-encrypted: bool,
  reply-to: optional uint,
  metadata: string-ascii
}
```

## 🔧 API Reference

### Public Functions

#### User Management
- `register-user`: Register a new user account
- `update-profile`: Update user profile information
- `update-settings`: Modify user preferences and privacy settings

#### Messaging
- `send-message`: Send a message with optional payment
- `mark-message-read`: Mark a message as read
- `create-or-get-chat`: Create or retrieve a chat between two users

#### Contact Management
- `add-contact`: Add a user to contacts
- `block-user`: Block a user from messaging
- `unblock-user`: Remove a user from blocked list

#### Financial
- `withdraw-earnings`: Withdraw accumulated earnings
- `withdraw-platform-fees`: (Admin only) Withdraw platform fees

### Read-Only Functions

- `get-user`: Retrieve user profile by address
- `get-user-by-username`: Retrieve user profile by username
- `get-chat`: Get chat information
- `get-message`: Retrieve message details
- `get-user-settings`: Get user preferences
- `get-platform-stats`: Get platform statistics

## 💰 Economics

### Fee Structure

- **Platform Fee**: 2% of all payments
- **Spam Prevention**: 0.001 STX registration fee
- **Message Pricing**: User-defined pricing for incoming messages
- **Minimum Payment**: 0.01 STX
- **Maximum Payment**: 100 STX

### Revenue Streams

1. **Platform Fees**: 2% commission on all transactions
2. **Registration Fees**: One-time spam prevention fee
3. **Premium Features**: Enhanced functionality for premium users

## 🔒 Security Features

- **Spam Prevention**: Anti-spam fees and user-defined message pricing
- **Blocking System**: Users can block unwanted contacts
- **Privacy Controls**: Configurable privacy levels
- **Encryption Support**: Optional message encryption
- **Reputation System**: User quality scoring

## 🧪 Testing

### Unit Tests

Run the test suite:

```bash
clarinet test
```

### Integration Tests

Test with local blockchain:

```bash
clarinet integrate
# Run integration test scripts
```

### Test Coverage

- User registration and profile management
- Message sending and receiving
- Payment processing
- Contact and blocking functionality
- Settings management
- Error handling

## 🚀 Deployment

### Testnet Deployment

1. Configure testnet settings in `Clarinet.toml`
2. Deploy to testnet:
```bash
clarinet deploy --testnet
```

### Mainnet Deployment

1. Configure mainnet settings
2. Deploy to mainnet:
```bash
clarinet deploy --mainnet
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow Clarity best practices
- Write comprehensive tests
- Update documentation
- Ensure security considerations
- Test on testnet before mainnet

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Project Wiki](../../wiki)
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Discord**: [Community Discord](https://discord.gg/your-server)

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core messaging functionality
- ✅ User management
- ✅ Basic payments
- ✅ Contact system

### Phase 2
- 🔄 File sharing support
- 🔄 Group messaging
- 🔄 Advanced encryption
- 🔄 Mobile app development

### Phase 3
- ⏳ DeFi integrations
- ⏳ NFT profile pictures
- ⏳ Advanced analytics
- ⏳ Cross-chain support

## 🙏 Acknowledgments

- Stacks Foundation for blockchain infrastructure
- Clarity language documentation and community
- Open source contributors
- Beta testers and early adopters

---

**Note**: This is a decentralized application running on the Stacks blockchain. Always verify contract addresses and use proper security practices when handling cryptocurrency transactions.